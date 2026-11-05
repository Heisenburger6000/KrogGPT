(() => {
  "use strict";

  const SYSTEM_PROMPT =
    "You are krog-gpt, a friendly, witty and helpful AI chatbot. " +
    "Answer clearly and concisely. Use a warm, slightly playful tone. " +
    "Use Markdown when it makes an answer easier to read.";

  const SUGGESTIONS = [
    "Write a poem about Breaking Bad",
    "How do I get into a new hobby?",
    "Tell me something surprising",
    "Help me make a simple plan"
  ];

  const log = document.getElementById("log");
  const input = document.getElementById("message");
  const form = document.getElementById("composer");
  const send = document.getElementById("send");
  const clear = document.getElementById("clear");
  const chips = document.getElementById("chips");

  let history = [];
  let busy = false;

  function scrollToBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(role, text, extraClass = "") {
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.remove();

    const bubble = document.createElement("div");
    bubble.className = `msg ${role === "user" ? "me" : "bot"} ${extraClass}`.trim();
    bubble.textContent = text;
    log.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function setBusy(value) {
    busy = value;
    send.disabled = value;
    input.disabled = value;
    send.setAttribute("aria-label", value ? "Waiting for response" : "Send message");
  }

  function showWelcome() {
    log.innerHTML = `
      <div class="welcome" id="welcome">
        <div class="welcome-mark">K</div>
        <h2>Hi, I’m krog-gpt 👋</h2>
        <p>Ask me anything. What are we figuring out today?</p>
        <div class="chips" id="chips"></div>
      </div>`;
    const chipContainer = document.getElementById("chips");
    SUGGESTIONS.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = suggestion;
      button.addEventListener("click", () => ask(suggestion));
      chipContainer.appendChild(button);
    });
  }

  async function ask(rawText) {
    const text = String(rawText || "").trim();
    if (!text || busy) return;

    const apiUrl = window.KROG_GPT_CONFIG?.apiUrl;
    if (!apiUrl || apiUrl.includes("PASTE_YOUR_")) {
      addMessage("assistant", "The chatbot is not connected yet. Follow the README to deploy the API Worker and add its URL to config.js.");
      return;
    }

    setBusy(true);
    input.value = "";
    input.style.height = "auto";
    addMessage("user", text);
    history.push({ role: "user", content: text });

    const pending = addMessage("assistant", "Thinking…", "pending");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || `Request failed (${response.status}).`;
        throw new Error(message);
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The AI returned an empty response. Please try again.");
      }

      pending.textContent = data.reply;
      pending.classList.remove("pending");
      history.push({ role: "assistant", content: data.reply });
    } catch (error) {
      pending.textContent = `Sorry, I couldn't get a response. ${error.message || "Please try again."}`;
      pending.classList.remove("pending");
      // Keep the user's message in the visible chat, but don't send a failed turn
      // as context on the next request.
      history.pop();
    } finally {
      setBusy(false);
      input.focus();
      scrollToBottom();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  });

  clear.addEventListener("click", () => {
    if (busy) return;
    history = [];
    input.value = "";
    showWelcome();
    input.focus();
  });

  showWelcome();
})();
