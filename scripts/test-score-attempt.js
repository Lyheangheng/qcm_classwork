const assert = require("assert");
const { loadCsv } = require("./parse-csv");
const { scoreAttempt } = require("./score-attempt");

const parsed = loadCsv("./source/แบบฝึกหัดบทที่2_เฉลย.csv");
const answerFor = (questionId, answer) => ({ questionId, answer });
const submission = (answers, extra) => ({
  attemptId: "attempt-test",
  studentId: "student-test",
  answers,
  ...(extra || {})
});
const all = (answer) =>
  parsed.questions.map((question) => answerFor(question.id, answer));
const correct = parsed.answerKey.map((entry) =>
  answerFor(entry.id, entry.correctAnswer)
);

assert.deepStrictEqual(
  scoreAttempt(submission(correct), parsed.questions, parsed.answerKey),
  {
    attemptId: "attempt-test",
    studentId: "student-test",
    correctAnswers: 20,
    maximumScore: 20,
    percentage: 100
  }
);

assert.strictEqual(
  scoreAttempt(submission(all("ก")), parsed.questions, parsed.answerKey)
    .correctAnswers,
  4
);

const partial = correct.slice(0, 10);
const partialResult = scoreAttempt(
  submission(partial),
  parsed.questions,
  parsed.answerKey
);
assert.strictEqual(partialResult.correctAnswers, 10);
assert.strictEqual(partialResult.maximumScore, 20);
assert.strictEqual(partialResult.percentage, 50);

assert.strictEqual(
  scoreAttempt(submission([]), parsed.questions, parsed.answerKey).correctAnswers,
  0
);
assert.throws(
  () =>
    scoreAttempt(
      submission([answerFor("q-1", "จ")]),
      parsed.questions,
      parsed.answerKey
    ),
  /คำตอบไม่ถูกต้อง/
);
assert.throws(
  () =>
    scoreAttempt(
      submission([answerFor("unknown", "ก")]),
      parsed.questions,
      parsed.answerKey
    ),
  /ไม่รู้จักรหัสคำถาม/
);
assert.throws(
  () =>
    scoreAttempt(
      submission([answerFor("q-1", "ก"), answerFor("q-1", "ข")]),
      parsed.questions,
      parsed.answerKey
    ),
  /คำตอบซ้ำ/
);

const tampered = scoreAttempt(
  submission(correct, { correctAnswers: 0, maximumScore: 0, percentage: 0 }),
  parsed.questions,
  parsed.answerKey
);
assert.strictEqual(tampered.correctAnswers, 20);
assert.strictEqual(tampered.maximumScore, 20);
assert.strictEqual(tampered.percentage, 100);

assert.throws(() => scoreAttempt(submission([]), [], []), /ชุดคำถาม/);
assert.throws(
  () =>
    scoreAttempt(
      submission(correct),
      [{ id: "q-1", options: [] }],
      [{ id: "q-1", correctAnswer: "ก" }]
    ),
  /ข้อมูลคำถาม/
);

console.log("Scoring tests passed");
