(function () {
  "use strict";

  // Temporary UI data. The CSV will be connected in a later phase.
  var MOCK_QUESTIONS = [
    {
      number: 1,
      text: "ตัวอย่างคำถามสำหรับแบบทดสอบข้อที่หนึ่งคือข้อใด",
      options: [
        { key: "ก", text: "ตัวเลือกตัวอย่าง ก" },
        { key: "ข", text: "ตัวเลือกตัวอย่าง ข" },
        { key: "ค", text: "ตัวเลือกตัวอย่าง ค" },
        { key: "ง", text: "ตัวเลือกตัวอย่าง ง" }
      ]
    },
    {
      number: 2,
      text: "ตัวอย่างคำถามสำหรับแบบทดสอบข้อที่สองคือข้อใด",
      options: [
        { key: "ก", text: "คำตอบตัวอย่าง ก" },
        { key: "ข", text: "คำตอบตัวอย่าง ข" },
        { key: "ค", text: "คำตอบตัวอย่าง ค" },
        { key: "ง", text: "คำตอบตัวอย่าง ง" }
      ]
    },
    {
      number: 3,
      text: "ตัวอย่างคำถามสำหรับแบบทดสอบข้อที่สามคือข้อใด",
      options: [
        { key: "ก", text: "คำตอบตัวอย่าง ก" },
        { key: "ข", text: "คำตอบตัวอย่าง ข" },
        { key: "ค", text: "คำตอบตัวอย่าง ค" },
        { key: "ง", text: "คำตอบตัวอย่าง ง" }
      ]
    }
  ];

  var app = document.getElementById("app");
  var state = {
    screen: "entry",
    studentId: "",
    currentQuestion: 0,
    answers: {},
    questions: []
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render() {
    if (state.screen === "loading") {
      app.innerHTML =
        '<section class="state-panel" aria-labelledby="loading-title">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<h1 id="loading-title">กำลังเตรียมแบบทดสอบ</h1>' +
        "<p>โปรดรอสักครู่...</p>" +
        "</section>";
      return;
    }

    if (state.screen === "entry") {
      renderEntry();
      return;
    }

    if (state.screen === "quiz") {
      renderQuiz();
      return;
    }

    if (state.screen === "confirm") {
      renderConfirmation();
      return;
    }

    renderCompletion();
  }

  function renderEntry() {
    app.innerHTML =
      '<section class="screen" aria-labelledby="entry-title">' +
      '<p class="eyebrow">QCM QUIZ</p>' +
      '<h1 id="entry-title">แบบทดสอบปรนัย</h1>' +
      '<p class="intro">กรุณากรอกรหัสนักเรียนเพื่อเริ่มทำแบบทดสอบ</p>' +
      '<form id="entry-form" novalidate>' +
      '<label class="field-label" for="student-id">รหัสนักเรียน</label>' +
      '<input class="text-input" id="student-id" name="studentId" type="text" ' +
      'autocomplete="username" inputmode="text" required aria-describedby="student-id-error" ' +
      'value="' + escapeHtml(state.studentId) + '" />' +
      '<p class="field-error" id="student-id-error" role="alert"></p>' +
      '<div class="button-row">' +
      '<span></span><button class="button button-primary" type="submit">เริ่มทำแบบทดสอบ</button>' +
      "</div>" +
      "</form>" +
      "</section>";

    document.getElementById("entry-form").addEventListener("submit", startQuiz);
    document.getElementById("student-id").focus();
  }

  function renderQuiz() {
    if (!state.questions.length) {
      renderError("ไม่พบคำถาม", "ยังไม่มีข้อมูลคำถามสำหรับแบบทดสอบนี้");
      return;
    }

    var question = state.questions[state.currentQuestion];
    var total = state.questions.length;
    var selected = state.answers[question.number] || "";
    var options = question.options
      .map(function (option) {
        var checked = selected === option.key ? " checked" : "";
        return (
          '<label class="option">' +
          '<input type="radio" name="answer" value="' +
          escapeHtml(option.key) +
          '"' +
          checked +
          " />" +
          "<span>" +
          escapeHtml(option.key) +
          ". " +
          escapeHtml(option.text) +
          "</span>" +
          "</label>"
        );
      })
      .join("");

    app.innerHTML =
      '<section class="screen" aria-labelledby="question-title">' +
      '<header class="quiz-header">' +
      '<div class="progress-row"><span>ความคืบหน้า</span><span>ข้อ ' +
      (state.currentQuestion + 1) +
      " จาก " +
      total +
      "</span></div>" +
      '<div class="progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="' +
      total +
      '" aria-valuenow="' +
      (state.currentQuestion + 1) +
      '" aria-label="ความคืบหน้าของแบบทดสอบ">' +
      '<div class="progress-value" style="width: ' +
      ((state.currentQuestion + 1) / total) * 100 +
      '%"></div></div>' +
      "</header>" +
      '<div class="question-panel">' +
      '<p class="eyebrow">ข้อที่ ' +
      escapeHtml(question.number) +
      "</p>" +
      '<h1 id="question-title">' +
      escapeHtml(question.text) +
      "</h1>" +
      '<fieldset class="options"><legend class="field-label">เลือกคำตอบหนึ่งข้อ</legend>' +
      options +
      "</fieldset>" +
      '<div class="button-row">' +
      '<div class="button-group"><button id="previous-button" class="button button-secondary" type="button"' +
      (state.currentQuestion === 0 ? " disabled" : "") +
      ">ย้อนกลับ</button>" +
      '<button id="next-button" class="button button-primary" type="button">' +
      (state.currentQuestion === total - 1 ? "ตรวจสอบคำตอบ" : "ถัดไป") +
      "</button></div>" +
      "</div>" +
      "</div>" +
      "</section>";

    document.querySelectorAll('input[name="answer"]').forEach(function (input) {
      input.addEventListener("change", function (event) {
        state.answers[question.number] = event.target.value;
      });
    });
    document.getElementById("previous-button").addEventListener("click", goPrevious);
    document.getElementById("next-button").addEventListener("click", goNext);
  }

  function renderConfirmation() {
    var answered = Object.keys(state.answers).length;
    app.innerHTML =
      '<section class="screen" aria-labelledby="confirmation-title">' +
      '<p class="eyebrow">ตรวจสอบก่อนส่ง</p>' +
      '<h1 id="confirmation-title">ยืนยันการส่งแบบทดสอบ</h1>' +
      '<div class="confirmation">' +
      "<p>คุณตอบคำถามแล้ว " +
      answered +
      " จาก " +
      state.questions.length +
      " ข้อ</p>" +
      "<p>เมื่อกดส่งแบบทดสอบ จะไม่สามารถกลับมาแก้ไขคำตอบในครั้งนี้ได้</p>" +
      "</div>" +
      '<div class="button-row">' +
      '<button id="back-to-quiz" class="button button-secondary" type="button">กลับไปตรวจสอบคำตอบ</button>' +
      '<button id="submit-test" class="button button-primary" type="button">ยืนยันส่งแบบทดสอบ</button>' +
      "</div>" +
      "</section>";

    document.getElementById("back-to-quiz").addEventListener("click", function () {
      state.screen = "quiz";
      state.currentQuestion = state.questions.length - 1;
      render();
    });
    document.getElementById("submit-test").addEventListener("click", function () {
      state.screen = "complete";
      render();
    });
  }

  function renderCompletion() {
    app.innerHTML =
      '<section class="state-panel" aria-labelledby="completion-title">' +
      '<div class="completion-icon" aria-hidden="true">✓</div>' +
      '<h1 id="completion-title">ส่งแบบทดสอบเรียบร้อยแล้ว</h1>' +
      "<p>ขอบคุณสำหรับการทำแบบทดสอบ</p>" +
      '<button id="restart-button" class="button button-secondary" type="button">กลับไปหน้าเริ่มต้น</button>' +
      "</section>";
    document.getElementById("restart-button").addEventListener("click", function () {
      state = {
        screen: "entry",
        studentId: "",
        currentQuestion: 0,
        answers: {},
        questions: MOCK_QUESTIONS
      };
      render();
    });
  }

  function renderError(title, message) {
    app.innerHTML =
      '<section class="state-panel error" aria-labelledby="error-title">' +
      '<h1 id="error-title">' +
      escapeHtml(title) +
      "</h1><p>" +
      escapeHtml(message) +
      "</p>" +
      '<button id="error-retry" class="button button-secondary" type="button">กลับไปหน้าเริ่มต้น</button>' +
      "</section>";
    document.getElementById("error-retry").addEventListener("click", function () {
      state.screen = "entry";
      render();
    });
  }

  function startQuiz(event) {
    event.preventDefault();
    var input = document.getElementById("student-id");
    var studentId = input.value.trim();
    var error = document.getElementById("student-id-error");

    if (!studentId) {
      input.setAttribute("aria-invalid", "true");
      error.textContent = "กรุณากรอกรหัสนักเรียนก่อนเริ่มทำแบบทดสอบ";
      input.focus();
      return;
    }

    state.studentId = studentId;
    state.questions = MOCK_QUESTIONS;
    if (!state.questions.length) {
      renderError("ไม่พบคำถาม", "ยังไม่มีข้อมูลคำถามสำหรับแบบทดสอบนี้");
      return;
    }
    state.screen = "quiz";
    state.currentQuestion = 0;
    state.answers = {};
    render();
  }

  function goPrevious() {
    if (state.currentQuestion > 0) {
      state.currentQuestion -= 1;
      render();
    }
  }

  function goNext() {
    if (state.currentQuestion < state.questions.length - 1) {
      state.currentQuestion += 1;
      render();
    } else {
      state.screen = "confirm";
      render();
    }
  }

  state.screen = "loading";
  render();
  window.setTimeout(function () {
    state.questions = MOCK_QUESTIONS;
    state.screen = "entry";
    render();
  }, 250);
})();
