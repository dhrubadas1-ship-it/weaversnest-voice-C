// netlify/functions/chat.js
// Accepts either { message: "hi" } OR { messages: [...] } from the client.
// Includes GET health, CORS, and clean JSON errors.

exports.handler = async (event) => {
  // GET health check
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: true, hint: "POST with { message } or { messages }" }),
    };
  }

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { message, messages } = body;

    // Build messages array for OpenAI
    let chatMessages;
    if (Array.isArray(messages) && messages.length) {
      chatMessages = messages;
    } else if (typeof message === "string" && message.trim()) {
      chatMessages = [
        { role: "system", content: "You are WeaversNest Tourism Assistant. Reply in simple English. Be friendly and brief. Use male voice tone when spoken." },
        { role: "user", content: message.trim() },
      ];
    } else {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Provide 'message' (string) or 'messages' (array)" }),
      };
    }

    // Call OpenAI (no SDK to avoid ESM/CJS issues)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // safe, fast; change if you like
        messages: chatMessages,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: data?.error || data }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reply: data.choices?.[0]?.message?.content || "" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
