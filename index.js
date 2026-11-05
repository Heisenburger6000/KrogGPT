const SYSTEM_PROMPT =
  "You are krog-gpt, a friendly, witty and helpful AI chatbot. " +
  "Answer clearly and concisely. Use a warm, slightly playful tone. " +
  "Use Markdown when it makes an answer easier to read.";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_BODY_BYTES = 30_000;

function json(data, status, origin, allowedOrigin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin && origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowedOrigin = env.ALLOWED_ORIGIN;

    if (!allowedOrigin) {
      return json({ error: "The API Worker has not been configured." }, 500, origin, allowedOrigin);
    }
    if (origin !== allowedOrigin) {
      return json({ error: "This website is not allowed to use this chatbot." }, 403, origin, allowedOrigin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, origin, allowedOrigin);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "The API key has not been configured on the server." }, 500, origin, allowedOrigin);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: "That message is too large." }, 413, origin, allowedOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON request." }, 400, origin, allowedOrigin);
    }

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0 ||
        body.messages.length > MAX_MESSAGES) {
      return json({ error: "Send between 1 and 20 conversation messages." }, 400, origin, allowedOrigin);
    }

    const messages = [];
    for (const item of body.messages) {
      if (!item || !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" ||
          !item.content.trim() || item.content.length > MAX_MESSAGE_CHARS) {
        return json({ error: "A message is invalid or too long." }, 400, origin, allowedOrigin);
      }
      messages.push({ role: item.role, content: item.content.trim() });
    }

    // A conversation must end with a user message; client-supplied system prompts
    // and other roles are never accepted.
    if (messages[messages.length - 1].role !== "user") {
      return json({ error: "The latest message must be from the user." }, 400, origin, allowedOrigin);
    }

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6-luna",
          instructions: SYSTEM_PROMPT,
          input: messages,
          max_output_tokens: 1200
        })
      });

      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        // Do not send provider diagnostics or credentials to the browser.
        console.error("OpenAI request failed", upstream.status, result?.error?.code || "unknown");
        const status = upstream.status === 429 ? 429 : 502;
        const message = upstream.status === 429
          ? "The AI service is busy or its usage limit has been reached. Try again later."
          : "The AI service couldn't complete that request. Check your API setup and try again.";
        return json({ error: message }, status, origin, allowedOrigin);
      }

      let reply = typeof result.output_text === "string" ? result.output_text : "";
      if (!reply && Array.isArray(result.output)) {
        for (const item of result.output) {
          if (item.type === "message" && Array.isArray(item.content)) {
            reply += item.content
              .filter(part => part.type === "output_text" && typeof part.text === "string")
              .map(part => part.text).join("");
          }
        }
      }
      if (!reply.trim()) {
        return json({ error: "The AI returned an empty response. Please try again." }, 502, origin, allowedOrigin);
      }

      return json({ reply: reply.trim() }, 200, origin, allowedOrigin);
    } catch (error) {
      console.error("Worker request failed", error?.message || "unknown error");
      return json({ error: "Could not reach the AI service. Please try again." }, 502, origin, allowedOrigin);
    }
  }
};
