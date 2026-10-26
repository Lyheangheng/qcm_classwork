const REQUIRED_COLUMNS = [
  "ข้อ",
  "คำถาม",
  "ตัวเลือก ก",
  "ตัวเลือก ข",
  "ตัวเลือก ค",
  "ตัวเลือก ง",
  "เฉลย",
  "คำตอบที่ถูก"
];
const ANSWER_KEYS = ["ก", "ข", "ค", "ง"];

function doGet() {
  return htmlResponse_({ success: true, message: "QCM endpoint is ready" });
}

function doPost(event) {
  try {
    const request = parseRequest_(event);
    const result = saveSubmission_(request);
    return htmlResponse_({
      success: true,
      duplicate: result.duplicate,
      result: result.score,
      requestToken: request.requestToken
    });
  } catch (error) {
    return htmlResponse_({
      success: false,
      error: safeErrorMessage_(error),
      requestToken: getRequestToken_(event)
    });
  }
}

function parseRequest_(event) {
  const payload = event && event.parameter && event.parameter.payload;
  if (!payload) throw new Error("Missing submission payload");
  const request = JSON.parse(payload);
  if (!request.requestToken || typeof request.requestToken !== "string") {
    throw new Error("Missing request token");
  }
  if (!request.submission || typeof request.submission !== "object") {
    throw new Error("Missing submission");
  }
  return {
    requestToken: request.requestToken,
    submission: request.submission
  };
}

function saveSubmission_(request) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = requireProperty_(properties, "SPREADSHEET_ID");
  const csvFileId = requireProperty_(properties, "CSV_FILE_ID");
  const sheetName = properties.getProperty("RESULTS_SHEET_NAME") || "Results";
  const parsed = loadQuizData_(csvFileId);
  const score = scoreSubmission_(request.submission, parsed);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) throw new Error("Results worksheet was not found");
    ensureHeaders_(sheet);
    const duplicate = findAttemptRow_(sheet, score.attemptId);
    if (duplicate) {
      return { duplicate: true, score: duplicate };
    }

    sheet.appendRow([
      new Date(),
      sheetSafeText_(score.studentId),
      sheetSafeText_(score.attemptId),
      score.correctAnswers,
      score.maximumScore,
      score.percentage,
      JSON.stringify(score.answers)
    ]);
    return { duplicate: false, score: score };
  } finally {
    lock.releaseLock();
  }
}

function loadQuizData_(csvFileId) {
  const text = Utilities.newBlob(
    DriveApp.getFileById(csvFileId).getBlob().getBytes()
  ).getDataAsString("UTF-8").replace(/^\uFEFF/, "");
  const rows = Utilities.parseCsv(text);
  if (!rows.length) throw new Error("CSV file is empty");
  const headers = rows[0].map(function (value) { return String(value).trim(); });
  const indexes = {};
  REQUIRED_COLUMNS.forEach(function (column) {
    indexes[column] = headers.indexOf(column);
    if (indexes[column] < 0) throw new Error("Missing CSV column: " + column);
  });

  const questions = [];
  const answerKey = {};
  const seen = {};
  rows.slice(1).forEach(function (row, rowIndex) {
    if (!row.length || row.every(function (value) { return String(value).trim() === ""; })) return;
    if (row.length !== headers.length) throw new Error("Malformed CSV row: " + (rowIndex + 2));
    const value = function (column) { return String(row[indexes[column]] || "").trim(); };
    const number = value("ข้อ");
    const text = value("คำถาม");
    const options = ANSWER_KEYS.map(function (key) {
      return { key: key, text: value("ตัวเลือก " + key) };
    });
    const correctAnswer = value("เฉลย");
    if (!number || !text || options.some(function (option) { return !option.text; })) {
      throw new Error("Invalid CSV question row: " + (rowIndex + 2));
    }
    if (ANSWER_KEYS.indexOf(correctAnswer) < 0) {
      throw new Error("Invalid answer key at CSV row: " + (rowIndex + 2));
    }
    if (seen[number] || value("คำตอบที่ถูก") !== options[ANSWER_KEYS.indexOf(correctAnswer)].text) {
      throw new Error("Inconsistent CSV answer at row: " + (rowIndex + 2));
    }
    const id = "q-" + number;
    seen[number] = true;
    questions.push({ id: id, options: options });
    answerKey[id] = correctAnswer;
  });
  if (!questions.length) throw new Error("CSV contains no questions");
  return { questions: questions, answerKey: answerKey };
}

function scoreSubmission_(submission, quiz) {
  if (!submission || typeof submission !== "object") throw new Error("Invalid submission");
  const studentId = textRequired_(submission.studentId, "Student ID");
  const attemptId = textRequired_(submission.attemptId, "Attempt ID");
  if (!Array.isArray(submission.answers)) throw new Error("Answers must be an array");

  const known = {};
  quiz.questions.forEach(function (question) { known[question.id] = true; });
  const answers = {};
  submission.answers.forEach(function (entry) {
    if (!entry || typeof entry.questionId !== "string" || !known[entry.questionId]) {
      throw new Error("Unknown question ID");
    }
    if (Object.prototype.hasOwnProperty.call(answers, entry.questionId)) {
      throw new Error("Duplicate question ID");
    }
    if (entry.answer !== null && ANSWER_KEYS.indexOf(entry.answer) < 0) {
      throw new Error("Invalid answer choice");
    }
    answers[entry.questionId] = entry.answer;
  });

  let correctAnswers = 0;
  quiz.questions.forEach(function (question) {
    if (answers[question.id] === quiz.answerKey[question.id]) correctAnswers++;
  });
  return {
    studentId: studentId,
    attemptId: attemptId,
    correctAnswers: correctAnswers,
    maximumScore: quiz.questions.length,
    percentage: (correctAnswers / quiz.questions.length) * 100,
    answers: quiz.questions.map(function (question) {
      return { questionId: question.id, answer: answers[question.id] || null };
    })
  };
}

function ensureHeaders_(sheet) {
  const headers = [
    "Timestamp",
    "Student ID",
    "Attempt ID",
    "Correct Answers",
    "Maximum Score",
    "Percentage",
    "Answers JSON"
  ];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
}

function findAttemptRow_(sheet, attemptId) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 6).getValues();
  for (let index = 0; index < values.length; index++) {
    if (String(values[index][1]) === attemptId) {
      return {
        attemptId: attemptId,
        studentId: String(values[index][0]),
        correctAnswers: Number(values[index][2]),
        maximumScore: Number(values[index][3]),
        percentage: Number(values[index][4]),
        answers: []
      };
    }
  }
  return null;
}

function requireProperty_(properties, name) {
  const value = properties.getProperty(name);
  if (!value) throw new Error("Missing Script Property: " + name);
  return value.trim();
}

function textRequired_(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("Missing " + name);
  return value.trim();
}

function sheetSafeText_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function getRequestToken_(event) {
  try {
    return event && event.parameter && JSON.parse(event.parameter.payload).requestToken;
  } catch (error) {
    return "";
  }
}

function safeErrorMessage_(error) {
  return error && error.message ? error.message : "Submission failed";
}

function htmlResponse_(result) {
  const message = JSON.stringify(result).replace(/</g, "\\u003c");
  return HtmlService.createHtmlOutput(
    "<!doctype html><script>window.parent.postMessage({type:'qcm-submit-result',data:" +
      message +
      "}, '*');</script>"
  );
}
