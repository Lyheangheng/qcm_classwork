const path = require("path");
const { loadCsv } = require("./parse-csv");

const ANSWER_KEYS = new Set(["ก", "ข", "ค", "ง"]);

function assertQuestionData(questions, answerKey) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("ไม่พบชุดคำถามที่ใช้งานได้สำหรับการตรวจคะแนน");
  }
  if (!Array.isArray(answerKey) || answerKey.length !== questions.length) {
    throw new Error("ข้อมูลเฉลยไม่ตรงกับจำนวนคำถาม");
  }

  const questionIds = new Set();
  const answerById = new Map();
  questions.forEach((question, index) => {
    if (
      !question ||
      typeof question.id !== "string" ||
      question.id.trim() === "" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4
    ) {
      throw new Error(`ข้อมูลคำถามข้อที่ ${index + 1} ไม่ถูกต้อง`);
    }
    if (
      question.options.some(
        (option, optionIndex) =>
          !option ||
          option.key !== ["ก", "ข", "ค", "ง"][optionIndex] ||
          typeof option.text !== "string" ||
          option.text.trim() === ""
      )
    ) {
      throw new Error(`ตัวเลือกของคำถามข้อที่ ${index + 1} ไม่ถูกต้อง`);
    }
    if (questionIds.has(question.id)) {
      throw new Error(`พบรหัสคำถามซ้ำ: ${question.id}`);
    }
    questionIds.add(question.id);
  });

  answerKey.forEach((entry) => {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !questionIds.has(entry.id) ||
      !ANSWER_KEYS.has(entry.correctAnswer)
    ) {
      throw new Error("ข้อมูลเฉลยไม่ถูกต้องหรือไม่ตรงกับคำถาม");
    }
    if (answerById.has(entry.id)) {
      throw new Error(`พบเฉลยซ้ำสำหรับคำถาม: ${entry.id}`);
    }
    answerById.set(entry.id, entry.correctAnswer);
  });

  if (answerById.size !== questions.length) {
    throw new Error("ข้อมูลเฉลยไม่ครบทุกคำถาม");
  }
  return answerById;
}

function validateSubmission(submission, questionIds) {
  if (!submission || typeof submission !== "object") {
    throw new Error("ไม่พบข้อมูลการส่งแบบทดสอบ");
  }
  if (typeof submission.studentId !== "string" || submission.studentId.trim() === "") {
    throw new Error("ไม่พบรหัสนักเรียน");
  }
  if (typeof submission.attemptId !== "string" || submission.attemptId.trim() === "") {
    throw new Error("ไม่พบรหัสการทำแบบทดสอบ");
  }
  if (!Array.isArray(submission.answers)) {
    throw new Error("รูปแบบคำตอบไม่ถูกต้อง");
  }

  const seen = new Set();
  submission.answers.forEach((answer) => {
    if (!answer || typeof answer.questionId !== "string") {
      throw new Error("พบคำตอบที่ไม่มีรหัสคำถาม");
    }
    if (!questionIds.has(answer.questionId)) {
      throw new Error(`ไม่รู้จักรหัสคำถาม: ${answer.questionId}`);
    }
    if (seen.has(answer.questionId)) {
      throw new Error(`พบคำตอบซ้ำสำหรับคำถาม: ${answer.questionId}`);
    }
    if (answer.answer !== null && !ANSWER_KEYS.has(answer.answer)) {
      throw new Error(`คำตอบไม่ถูกต้องสำหรับคำถาม: ${answer.questionId}`);
    }
    seen.add(answer.questionId);
  });
  return new Map(
    submission.answers.map((answer) => [answer.questionId, answer.answer])
  );
}

function scoreAttempt(submission, questions, answerKey) {
  const correctById = assertQuestionData(questions, answerKey);
  const answersById = validateSubmission(
    submission,
    new Set(questions.map((question) => question.id))
  );
  let correctAnswers = 0;

  questions.forEach((question) => {
    if (answersById.get(question.id) === correctById.get(question.id)) {
      correctAnswers += 1;
    }
  });

  const maximumScore = questions.length;
  return {
    attemptId: submission.attemptId,
    studentId: submission.studentId.trim(),
    correctAnswers,
    maximumScore,
    percentage: (correctAnswers / maximumScore) * 100
  };
}

function scoreCsvAttempt(submission, csvPath) {
  const parsed = loadCsv(
    csvPath || path.join(__dirname, "..", "source", "แบบฝึกหัดบทที่2_เฉลย.csv")
  );
  return scoreAttempt(submission, parsed.questions, parsed.answerKey);
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    throw new Error("ระบุไฟล์ JSON ของ submission เป็นอาร์กิวเมนต์");
  }
  const submission = require(path.resolve(input));
  console.log(JSON.stringify(scoreCsvAttempt(submission), null, 2));
}

module.exports = {
  scoreAttempt,
  scoreCsvAttempt,
  validateSubmission,
  assertQuestionData
};
