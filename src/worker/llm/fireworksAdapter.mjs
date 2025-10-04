// Fireworks adapter using chat completions style
export async function fireworksAdapter({ system, user }, env) {
  const apiKey = env?.FIREWORKS_API_KEY || (typeof process !== "undefined" ? process.env?.FIREWORKS_API_KEY : null) || null;
  const endpoint = "https://api.fireworks.ai/inference/v1/chat/completions";
  const model = "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b";

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  if (!apiKey) {
    return {
      text: "Fireworks placeholder response.",
      json: {
        is_success: true,
        score_delta: 1,
        next_scene_text: "CRT flickers; bytes dance. You advance.",
        feedback: "Continue.",
        hints: [],
        ended: false,
      },
      usage: { tokens: 128 },
      adapter: "stub",
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  let json = {};
  try { json = JSON.parse(text); } catch { json = { is_success: true, score_delta: 0, next_scene: text, feedback: "", hints: [], ended: false }; }
  if (json && !json.next_scene && json.next_scene_text) json.next_scene = json.next_scene_text;
  return { text, json, usage: { tokens: data?.usage?.total_tokens || 0 }, adapter: "fireworks" };
}
