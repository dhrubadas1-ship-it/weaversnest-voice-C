// netlify/functions/chat.js
// Node 18+ on Netlify.
// Environment variable required:
//   CHATBASE_API_KEY    -> your Chatbase secret key (do NOT commit this)

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'Method not allowed, use POST' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;
    if (!userMessage || typeof userMessage !== 'string') {
      return { statusCode: 400, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'Missing `message` in request body' }) };
    }

    const CHATBASE_API_KEY = process.env.CHATBASE_API_KEY;
    if (!CHATBASE_API_KEY) {
      return { statusCode: 500, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'Server misconfigured: CHATBASE_API_KEY not set' }) };
    }

    // Your Chatbase agent ID (already set)
    const CHATBASE_CHATBOT_ID = 'xYe8wmdbOM5iVwIDOCkGk';

    const payload = {
      chatbotId: CHATBASE_CHATBOT_ID,
      messages: [
        { role: 'user', content: userMessage }
      ]
    };

    const CHATBASE_URL = 'https://www.chatbase.co/api/v1/chat';

    const resp = await fetch(CHATBASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATBASE_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: 502, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'Upstream Chatbase error', status: resp.status, detail: text }) };
    }

    const j = await resp.json();

    // Try common fields for reply extraction
    let reply = null;
    if (j?.choices && Array.isArray(j.choices) && j.choices[0]?.message?.content) reply = j.choices[0].message.content;
    if (!reply && j?.output) {
      if (Array.isArray(j.output) && j.output[0]?.content) reply = j.output[0].content;
      else if (typeof j.output === 'string') reply = j.output;
    }
    if (!reply) reply = j?.reply ?? j?.result ?? j?.message ?? null;
    if (!reply) reply = (typeof j === 'string') ? j : JSON.stringify(j).slice(0, 400) + (JSON.stringify(j).length > 400 ? '…' : '');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    console.error('Function error', err);
    return { statusCode: 500, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'Internal server error', detail: String(err) }) };
  }
}
