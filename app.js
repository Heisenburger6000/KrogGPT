from pathlib import Path
p = Path("/mnt/data/krog-gpt-app.js")
code = r'''(() => {
  "use strict";

  // krog-gpt: real AI replies through a shared, anonymous free gateway.
  // No personal API key is required. Shared service limits/availability apply.
  const API_URL = "https://api.llmfaucet.dev/v1/chat/completions";
  const MODEL = "auto";
  const SYSTEM_PROMPT =
    "You are krog-gpt, a friendly, witty, slightly chaotic chatbot. " +
    "Be genuinely helpful and answer the user's actual question. " +
    "Keep a playful sense of humor, but do not make up facts. " +
    "Use concise answers unless the user asks for detail.";

  const SUGGESTIONS = [
    "Write a poem about Breaking Bad",
    "Tell me something surprising",
    "How is Alan so awesome?",
    "Give me life advice"
  ];

  const log = document.getElementById("log");
  const input = document.getElementById("message") || document.getElementById("in");
  const form = document.getElementById("composer");
  const send = document.getElementById("send");
  const clear = document.getElementById("clear");
  let history = [];
  let busy = false;

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(role, text, pending = false) {
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.remove();

    const bubble = document.createElement("div");
    bubble.className = `msg ${role === "user" ? "me" : "bot"}${pending ? " pending" : ""}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    scrollDown();
    return bubble;
  }

  function setBusy(value) {
    busy = value;
    if (send) send.disabled = value;
    if (input) input.disabled = value;
  }

  function showWelcome() {
    log.innerHTML = "";
    const welcome = document.createElement("div");
    welcome.className = "welcome hello";
    welcome.id = "welcome";

    const heading = document.createElement("b");
    heading.textContent = "Hi, I’m krog-gpt 👋";
    const intro = document.createElement("p");
    intro.textContent = "Ask me anything.";

    const chips = document.createElement("div");
    chips.className = "chips";
    SUGGESTIONS.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = suggestion;
      button.addEventListener("click", () => ask(suggestion));
      chips.appendChild(button);
    });

    welcome.append(heading, intro, chips);
    log.appendChild(welcome);
  }

  async function ask(rawText) {
    const text = String(rawText || "").trim();
    if (!text || busy) return;

    setBusy(true);
    input.value = "";
    if (input.style) input.style.height = "auto";

    addMessage("user", text);
    history.push({ role: "user", content: text });
    const pending = addMessage("assistant", "krog-gpt is thinking…", true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer free"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-16)
          ],
          stream: false
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || data?.message;
        if (response.status === 429) {
          throw new Error("The free shared AI limit has been reached. Wait a bit and try again.");
        }
        throw new Error(detail || `The AI service returned error ${response.status}.`);
      }

      const answer = data?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The AI returned an empty reply. Please try again.");
      }

      pending.textContent = answer.trim();
      pending.classList.remove("pending");
      history.push({ role: "assistant", content: answer.trim() });
    } catch (error) {
      pending.textContent =
        "I couldn't reach the free AI service. " +
        (error.message || "Please try again in a moment.");
      pending.classList.remove("pending");
      history.pop();
    } finally {
      setBusy(false);
      input.focus();
      scrollDown();
    }
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      ask(input.value);
    });
  } else {
    // Compatibility with the original HTML version that used a Send button.
    send?.addEventListener("click", () => ask(input.value));
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (form) form.requestSubmit();
      else ask(input.value);
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });

  clear?.addEventListener("click", () => {
    if (busy) return;
    history = [];
    showWelcome();
    input.focus();
  });

  showWelcome();
})();
'''
p.write_text(code, encoding="utf-8")
print(p)
