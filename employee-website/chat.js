// Chat widget: talks to the RAG backend at /api/chat (see chat_server.py).
(() => {
  const chat = document.getElementById("chat");
  const log = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const history = [];

  const toggle = open => {
    chat.hidden = !open;
    document.getElementById("chatFab").hidden = open;
    if (open) input.focus();
  };
  document.getElementById("logout").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    location.href = "/login";
  });
  document.getElementById("chatFab").addEventListener("click", () => toggle(true));
  document.getElementById("chatClose").addEventListener("click", () => toggle(false));

  function addMessage(text, cls, sources = []) {
    const el = document.createElement("div");
    el.className = "msg " + cls;
    el.textContent = text;
    if (sources.length) {
      const s = document.createElement("small");
      s.textContent = "Sources: " + sources.join(", ");
      el.appendChild(s);
    }
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    addMessage(question, "user");
    const pending = addMessage("Thinking…", "bot pending");
    form.querySelector("button").disabled = true;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (res.status === 401) return (location.href = "/login");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
      const data = await res.json();
      pending.remove();
      addMessage(data.answer, "bot", data.sources);
      history.push({ role: "user", content: question }, { role: "assistant", content: data.answer });
    } catch (err) {
      pending.remove();
      addMessage("Sorry, the assistant is unavailable: " + err.message, "bot error");
    } finally {
      form.querySelector("button").disabled = false;
      input.focus();
    }
  });
})();
