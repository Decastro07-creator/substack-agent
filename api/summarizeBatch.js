// api/summarizeBatch.js — Vercel Serverless Function
module.exports = async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const body = req.body || {};
    const lang = body.lang || "es";
    const items = Array.isArray(body.items) ? body.items : [];

    // Si no hay items, responde con eco para depurar
    if (!items.length) {
      return res.status(200).json({ note: "no items received", echo: body, items: [] });
    }

    const system = [
      "Eres editor de un periódico personal.",
      "Devuelve JSON EXACTO con el formato:",
      '{"items":[{"title":"...","source":"...","bullets":["...","...","..."],"read_if":"...","priority":"must|skim|skip","topic":"...","length_estimate_min":1}]}',
      "Reglas: 3–5 bullets (máx 60 palabras total). No inventes más allá del preview visible.",
      "Mantén el idioma de entrada. Si el texto es corto/paywalled, resume solo lo visible."
    ].join(" ");

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ lang, items }) }
      ],
      response_format: { type: "json_object" }
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const status = r.status;
    const data = await r.json();

    // Si OpenAI devolvió error, muéstralo
    if (!r.ok || data.error) {
      return res.status(500).json({ error: "openai_error", status, details: data });
    }

    const content = data?.choices?.[0]?.message?.content;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({ error: "parse_error", contentSnippet: String(content).slice(0, 200) });
    }

    const out = Array.isArray(parsed.items) ? parsed.items : [];
    return res.status(200).json({ items: out });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

