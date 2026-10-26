const http = require("http");

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/submit") {
    response.writeHead(404);
    response.end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    const form = new URLSearchParams(body);
    const payload = JSON.parse(form.get("payload"));
    const result = {
      success: true,
      requestToken: payload.requestToken,
      result: {
        attemptId: payload.submission.attemptId,
        studentId: payload.submission.studentId,
        correctAnswers: 0,
        maximumScore: payload.submission.answers.length,
        percentage: 0
      }
    };
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      "<script>window.parent.postMessage({type:'qcm-submit-result',data:" +
        JSON.stringify(result).replace(/</g, "\\u003c") +
        "}, '*');</script>"
    );
  });
});

server.listen(8766, "127.0.0.1", () => {
  console.log("Mock submission endpoint listening on http://127.0.0.1:8766/submit");
});
