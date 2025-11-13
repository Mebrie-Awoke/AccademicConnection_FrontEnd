// Client-side forum logic using localStorage
// Data shape saved under key 'forum_questions'
// Question: { id, title, body, author, createdAt, answers: [{id, body, author, createdAt}] }

(function () {
  const STORAGE_KEY = "forum_questions";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getCurrentUserName() {
    try {
      const u = JSON.parse(localStorage.getItem("currentUser"));
      return (u && (u.name || u.username)) || "Anonymous";
    } catch (e) {
      return "Anonymous";
    }
  }

  function loadQuestions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveQuestions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function escapeHtml(s) {
    if (!s) return "";
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderQuestion(q) {
    const container = document.createElement("div");
    container.className = "card mb-3";
    container.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${escapeHtml(q.title)}</h5>
        <p class="card-text">${escapeHtml(q.body)}</p>
        <p class="text-muted small mb-2">Asked by ${escapeHtml(q.author)} · ${q.answers.length} answer(s)</p>
        <div class="answers mb-3">
          ${q.answers
            .map(a => `<div class="border rounded p-2 mb-2"><div class="small text-muted">${escapeHtml(a.author)} · ${new Date(a.createdAt).toLocaleString()}</div><div>${escapeHtml(a.body)}</div></div>`)
            .join("")}
        </div>
        <form class="answerForm" data-question-id="${q.id}">
          <div class="mb-2">
            <textarea required class="form-control" name="answerBody" rows="2" placeholder="Write an answer..."></textarea>
          </div>
          <div class="text-end">
            <button type="submit" class="btn btn-sm btn-outline-primary">Post Answer</button>
          </div>
        </form>
      </div>
    `;
    return container;
  }

  function renderAll() {
    const container = document.getElementById("questionsContainer");
    if (!container) return;
    const list = loadQuestions();
    container.innerHTML = "";
    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-muted p-3";
      empty.textContent = "No questions yet — be the first to ask!";
      container.appendChild(empty);
      return;
    }

    // newest first
    list.slice().reverse().forEach(q => {
      container.appendChild(renderQuestion(q));
    });

    // attach answer handlers
    container.querySelectorAll("form.answerForm").forEach(f => {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const qid = f.getAttribute("data-question-id");
        const body = f.answerBody.value.trim();
        if (!body) return;
        addAnswer(qid, body);
        f.reset();
      });
    });
  }

  function addQuestion(title, body) {
    const list = loadQuestions();
    const q = {
      id: uid(),
      title: title,
      body: body,
      author: getCurrentUserName(),
      createdAt: new Date().toISOString(),
      answers: []
    };
    list.push(q);
    saveQuestions(list);
    renderAll();
  }

  function addAnswer(questionId, body) {
    const list = loadQuestions();
    const q = list.find(x => x.id === questionId);
    if (!q) return;
    q.answers.push({ id: uid(), body, author: getCurrentUserName(), createdAt: new Date().toISOString() });
    saveQuestions(list);
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("questionForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("questionTitle").value.trim();
        const body = document.getElementById("questionBody").value.trim();
        if (!title || !body) return;
        addQuestion(title, body);
        form.reset();
      });
    }

    renderAll();
  });

})();
