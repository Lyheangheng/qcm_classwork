const fs = require("fs");
const path = require("path");

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
const OPTION_COLUMNS = {
  ก: "ตัวเลือก ก",
  ข: "ตัวเลือก ข",
  ค: "ตัวเลือก ค",
  ง: "ตัวเลือก ง"
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"') {
      if (field.trim() !== "") {
        throw new Error(`พบเครื่องหมายอัญประกาศไม่ถูกต้องที่อักขระ ${index + 1}`);
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("พบช่องข้อมูลที่เปิดเครื่องหมายอัญประกาศแต่ไม่ได้ปิด");
  }

  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function validateAndMap(rows) {
  if (rows.length === 0) {
    throw new Error("ไฟล์ CSV ว่างเปล่า");
  }

  const headers = rows[0].map((header) => header.trim());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    throw new Error(`ไม่พบคอลัมน์ที่จำเป็น: ${missing.join(", ")}`);
  }

  const columnIndex = Object.fromEntries(
    REQUIRED_COLUMNS.map((column) => [column, headers.indexOf(column)])
  );
  const questions = [];
  const answerKey = [];
  const errors = [];
  const seenNumbers = new Set();

  rows.slice(1).forEach((values, rowOffset) => {
    const rowNumber = rowOffset + 2;
    if (values.length !== headers.length) {
      errors.push(`แถว ${rowNumber}: มี ${values.length} ช่อง แต่คาดว่าจะมี ${headers.length} ช่อง`);
      return;
    }

    const value = (column) => values[columnIndex[column]].trim();
    const number = value("ข้อ");
    const text = value("คำถาม");
    const choices = ANSWER_KEYS.map((key) => ({
      key,
      text: value(OPTION_COLUMNS[key])
    }));
    const correctAnswer = value("เฉลย");
    const correctText = value("คำตอบที่ถูก");
    const rowErrors = [];

    if (!number) rowErrors.push("ไม่มีหมายเลขข้อ");
    if (seenNumbers.has(number)) rowErrors.push(`หมายเลขข้อซ้ำ: ${number}`);
    if (!text) rowErrors.push("ไม่มีข้อความคำถาม");
    if (choices.some((choice) => !choice.text)) rowErrors.push("ตัวเลือกคำตอบไม่ครบ");
    if (!ANSWER_KEYS.includes(correctAnswer)) {
      rowErrors.push(`เฉลยไม่ถูกต้อง: ${correctAnswer || "(ว่าง)"}`);
    } else if (correctText !== value(OPTION_COLUMNS[correctAnswer])) {
      rowErrors.push("คำตอบที่ถูกไม่ตรงกับตัวเลือกตามเฉลย");
    }

    if (rowErrors.length > 0) {
      errors.push(`แถว ${rowNumber}: ${rowErrors.join("; ")}`);
      return;
    }

    const id = `q-${number}`;
    questions.push({ id, number, text, options: choices });
    answerKey.push({ id, correctAnswer });
    seenNumbers.add(number);
  });

  if (errors.length > 0) {
    throw new Error(`ตรวจสอบ CSV ไม่ผ่าน:\n${errors.join("\n")}`);
  }
  if (questions.length === 0) {
    throw new Error("ไม่พบคำถามที่ใช้งานได้ในไฟล์ CSV");
  }

  return { questions, answerKey };
}

function loadCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return validateAndMap(parseCsv(text));
}

function main() {
  const inputPath = process.argv[2] || path.join(__dirname, "..", "source", "แบบฝึกหัดบทที่2_เฉลย.csv");
  const outputPath = process.argv[3] || path.join(__dirname, "..", "public", "questions.json");
  const parsed = loadCsv(inputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(parsed.questions, null, 2)}\n`, "utf8");
  console.log(`Parsed ${parsed.questions.length} questions from ${inputPath}`);
  console.log("The answer key was validated but not written to the public output.");
}

if (require.main === module) {
  main();
}

module.exports = { parseCsv, validateAndMap, loadCsv };
