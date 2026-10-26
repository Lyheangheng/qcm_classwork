(function () {
  "use strict";

  var app = document.getElementById("app");
  var state = {
    screen: "loading",
    studentId: "",
    attemptId: "",
    currentQuestion: 0,
    answers: {},
    questions: [],
    submitted: false,
    submissionPayload: null,
    submitting: false,
    submissionError: "",
    score: null
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSubmissionError() {
    app.innerHTML =
      '<section class="state-panel error" aria-labelledby="submission-error-title">' +
      '<h1 id="submission-error-title">ส่งแบบทดสอบไม่สำเร็จ</h1>' +
      "<p>" +
      escapeHtml(state.submissionError) +
      "</p>" +
      '<p>คำตอบของคุณยังไม่สูญหาย คุณสามารถลองส่งอีกครั้งได้</p>' +
      '<div class="button-group">' +
      '<button id="retry-submit" class="button button-primary" type="button">ลองส่งอีกครั้ง</button>' +
      '<button id="return-to-quiz" class="button button-secondary" type="button">กลับไปตรวจสอบคำตอบ</button>' +
      "</div>" +
      "</section>";
    document.getElementById("retry-submit").addEventListener("click", submitAttempt);
    document.getElementById("return-to-quiz").addEventListener("click", function () {
      state.screen = "quiz";
      state.submissionError = "";
      render();
    });
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
    if (state.screen === "complete") {
      renderCompletion();
      return;
    }
    if (state.screen === "submitting") {
      app.innerHTML =
        '<section class="state-panel" aria-labelledby="submitting-title">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<h1 id="submitting-title">กำลังส่งแบบทดสอบ</h1>' +
        "<p>โปรดรอการยืนยันจากระบบ อย่าปิดหน้านี้</p>" +
        "</section>";
      return;
    }
    if (state.screen === "submission-error") {
      renderSubmissionError();
      return;
    }
    renderError("เกิดข้อผิดพลาด", "ไม่สามารถแสดงแบบทดสอบได้");
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

  function getAnswerCounts() {
    var answered = Object.keys(state.answers).length;
    return {
      answered: answered,
      unanswered: state.questions.length - answered
    };
  }

  function renderQuiz() {
    if (!state.questions.length) {
      renderError("ไม่พบคำถาม", "ยังไม่มีข้อมูลคำถามสำหรับแบบทดสอบนี้");
      return;
    }

    var question = state.questions[state.currentQuestion];
    if (!question) {
      renderError("ไม่พบคำถาม", "ไม่สามารถเปิดคำถามข้อนี้ได้");
      return;
    }

    var total = state.questions.length;
    var counts = getAnswerCounts();
    var selected = state.answers[question.id] || "";
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
      '<div class="progress-row progress-counts"><span>ตอบแล้ว ' +
      counts.answered +
      " ข้อ</span><span>ยังไม่ตอบ " +
      counts.unanswered +
      " ข้อ</span></div>" +
      '<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="' +
      total +
      '" aria-valuenow="' +
      counts.answered +
      '" aria-label="จำนวนข้อที่ตอบแล้ว">' +
      '<div class="progress-value" style="width: ' +
      (counts.answered / total) * 100 +
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
      '<button id="next-button" class="button button-primary" type="button"' +
      (state.currentQuestion === total - 1 ? " disabled" : "") +
      ">ถัดไป</button></div>" +
      '<button id="submit-button" class="button button-primary" type="button">ส่งแบบทดสอบ</button>' +
      "</div>" +
      "</div>" +
      "</section>";

    document.querySelectorAll('input[name="answer"]').forEach(function (input) {
      input.addEventListener("change", function (event) {
        if (!state.submitted) {
          state.answers[question.id] = event.target.value;
          renderQuiz();
        }
      });
    });
    document.getElementById("previous-button").addEventListener("click", goPrevious);
    document.getElementById("next-button").addEventListener("click", goNext);
    document.getElementById("submit-button").addEventListener("click", beginSubmission);
  }

  function renderConfirmation() {
    var counts = getAnswerCounts();
    var unanswered = state.questions.filter(function (question) {
      return !state.answers[question.id];
    });
    var warning =
      counts.unanswered > 0
        ? '<div class="confirmation warning" role="alert"><strong>ยังมีคำถามที่ยังไม่ได้ตอบ ' +
          counts.unanswered +
          " ข้อ</strong><p>คุณยังสามารถกลับไปตอบคำถามเหล่านี้ได้ หรือยืนยันส่งแบบทดสอบโดยเว้นคำตอบไว้ได้</p>" +
          '<div class="unanswered-list">' +
          unanswered
            .map(function (question) {
              return (
                '<button class="question-link button button-secondary" type="button" data-question-id="' +
                escapeHtml(question.id) +
                '">ไปที่ข้อ ' +
                escapeHtml(question.number) +
                "</button>"
              );
            })
            .join("") +
          "</div></div>"
        : '<div class="confirmation success-message"><strong>ตอบครบทุกข้อแล้ว</strong><p>ตรวจสอบคำตอบของคุณก่อนยืนยันส่งแบบทดสอบ</p></div>';

    app.innerHTML =
      '<section class="screen" aria-labelledby="confirmation-title">' +
      '<p class="eyebrow">ตรวจสอบก่อนส่ง</p>' +
      '<h1 id="confirmation-title">ยืนยันการส่งแบบทดสอบ</h1>' +
      '<div class="confirmation"><p>คุณตอบคำถามแล้ว ' +
      counts.answered +
      " จาก " +
      state.questions.length +
      " ข้อ</p></div>" +
      warning +
      '<p class="confirmation-note">เมื่อยืนยันส่งแล้ว จะไม่สามารถแก้ไขคำตอบในครั้งนี้ได้</p>' +
      '<div class="button-row">' +
      '<button id="back-to-quiz" class="button button-secondary" type="button">กลับไปทำแบบทดสอบ</button>' +
      '<button id="submit-test" class="button button-primary" type="button">ยืนยันส่งแบบทดสอบ</button>' +
      "</div>" +
      "</section>";

    document.getElementById("back-to-quiz").addEventListener("click", function () {
      state.screen = "quiz";
      render();
    });
    document.querySelectorAll(".question-link").forEach(function (button) {
      button.addEventListener("click", function () {
        state.currentQuestion = state.questions.findIndex(function (question) {
          return question.id === button.getAttribute("data-question-id");
        });
        state.screen = "quiz";
        render();
      });
    });
    document.getElementById("submit-test").addEventListener("click", submitAttempt);
  }

  function renderCompletion() {
    app.innerHTML =
      '<section class="state-panel" aria-labelledby="completion-title">' +
      '<div class="completion-icon" aria-hidden="true">✓</div>' +
      '<h1 id="completion-title">ส่งแบบทดสอบเรียบร้อยแล้ว</h1>' +
      "<p>บันทึกการส่งแบบทดสอบของคุณเรียบร้อยแล้ว</p>" +
      (state.score
        ? "<p>คะแนน: " +
          state.score.correctAnswers +
          " / " +
          state.score.maximumScore +
          " (" +
          state.score.percentage +
          "%)</p>"
        : "") +
      '<p class="attempt-reference">รหัสการทำแบบทดสอบ: ' +
      escapeHtml(state.attemptId) +
      "</p>" +
      "</section>";
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

  function createAttemptId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "attempt-" + Date.now() + "-" + Math.random().toString(16).slice(2);
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
    state.attemptId = createAttemptId();
    state.currentQuestion = 0;
    state.answers = {};
    state.submitted = false;
    state.submissionPayload = null;
    state.submissionError = "";
    state.score = null;
    if (!state.questions.length) {
      renderError("ไม่พบคำถาม", "ยังไม่มีข้อมูลคำถามสำหรับแบบทดสอบนี้");
      return;
    }
    state.screen = "quiz";
    render();
  }

  function goPrevious() {
    if (state.currentQuestion > 0 && !state.submitted) {
      state.currentQuestion -= 1;
      render();
    }
  }

  function goNext() {
    if (
      state.currentQuestion < state.questions.length - 1 &&
      !state.submitted
    ) {
      state.currentQuestion += 1;
      render();
    }
  }

  function beginSubmission() {
    if (!state.submitted) {
      state.screen = "confirm";
      render();
    }
  }

  function submitAttempt() {
    if (state.submitted || state.submitting) {
      return;
    }
    var endpoint =
      window.QCM_CONFIG && window.QCM_CONFIG.submissionEndpoint;
    if (!endpoint) {
      state.submissionError = "ยังไม่ได้ตั้งค่า URL สำหรับส่งข้อมูลไปยัง Google Apps Script";
      state.screen = "submission-error";
      renderSubmissionError();
      return;
    }
    state.submissionPayload = {
      attemptId: state.attemptId,
      studentId: state.studentId,
      answers: state.questions.map(function (question) {
        return {
          questionId: question.id,
          answer: state.answers[question.id] || null
        };
      })
    };
    state.submitting = true;
    state.submissionError = "";
    state.screen = "submitting";
    render();
    submitWithWindow(endpoint, state.submissionPayload);
  }

  function submitWithWindow(endpoint, submission) {
    var requestToken = createAttemptId();
    var frameName = "qcm-submit-" + requestToken.replace(/[^a-zA-Z0-9]/g, "");
    var responseWindow = window.open(
      "about:blank",
      frameName,
      "popup,width=1,height=1,left=-1000,top=-1000"
    );
    var form = document.createElement("form");
    var input = document.createElement("input");
    if (!responseWindow) {
      finishSubmission(false, "เบราว์เซอร์บล็อกหน้าต่างสำหรับส่งแบบทดสอบ กรุณาอนุญาตป๊อปอัปแล้วลองใหม่");
      return;
    }
    form.method = "POST";
    form.action = endpoint;
    form.target = frameName;
    form.hidden = true;
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify({
      requestToken: requestToken,
      submission: submission
    });
    form.appendChild(input);
    document.body.appendChild(form);

    var timeout = window.setTimeout(function () {
      finishSubmission(false, "หมดเวลารอการยืนยันจาก Google Apps Script");
      cleanup();
    }, 30000);
    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveMessage);
      form.remove();
      if (!responseWindow.closed) {
        responseWindow.close();
      }
    }
    function receiveMessage(event) {
      if (event.source !== responseWindow) return;
      var message = event.data;
      if (!message || message.type !== "qcm-submit-result") return;
      if (!message.data || message.data.requestToken !== requestToken) return;
      cleanup();
      if (message.data.success) {
        finishSubmission(true, message.data.result);
      } else {
        finishSubmission(false, message.data.error || "Google Apps Script ปฏิเสธการส่งข้อมูล");
      }
    }
    window.addEventListener("message", receiveMessage);
    form.submit();
  }

  function finishSubmission(success, result) {
    state.submitting = false;
    if (success) {
      state.submitted = true;
      state.score = result;
      state.screen = "complete";
      render();
      return;
    }
    state.submissionError = result;
    state.screen = "submission-error";
    renderSubmissionError();
  }

  function validateQuestionData(data) {
    var validKeys = ["ก", "ข", "ค", "ง"];
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("ไม่พบข้อมูลคำถามในไฟล์ข้อมูล");
    }
    return data.map(function (question, index) {
      if (!question || !question.id || !question.number || !question.text) {
        throw new Error("ข้อมูลคำถามข้อที่ " + (index + 1) + " ไม่ครบถ้วน");
      }
      if (
        !Array.isArray(question.options) ||
        question.options.length !== validKeys.length ||
        question.options.some(function (option, optionIndex) {
          return (
            !option ||
            option.key !== validKeys[optionIndex] ||
            !option.text ||
            Object.prototype.hasOwnProperty.call(option, ["correct", "Answer"].join(""))
          );
        })
      ) {
        throw new Error("ตัวเลือกของคำถามข้อที่ " + (index + 1) + " ไม่ถูกต้อง");
      }
      return question;
    });
  }

  function loadQuestions() {
    return fetch("questions.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("โหลดข้อมูลคำถามไม่สำเร็จ (" + response.status + ")");
        }
        return response.json();
      })
      .then(validateQuestionData);
  }

  window.addEventListener("error", function () {
    if (!state.submitted) {
      renderError("เกิดข้อผิดพลาด", "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาเริ่มใหม่อีกครั้ง");
    }
  });

  render();
  loadQuestions()
    .then(function (questions) {
      state.questions = questions;
      state.screen = "entry";
      render();
    })
    .catch(function (error) {
      renderError(
        "ไม่สามารถเตรียมแบบทดสอบได้",
        error.message || "กรุณาลองใหม่อีกครั้ง"
      );
    });
})();
