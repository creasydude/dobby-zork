// Gemini adapter; minimal placeholder to be swapped with real endpoint.
import { stubAdapter } from "./stubAdapter.mjs";

function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fenced = text.replace(/^```(?:json)?\n|\n```$/g, "");
  try { return JSON.parse(fenced); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

export async function geminiAdapter({ system, user }, env) {
  const apiKey = env?.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : null) || null;
  if (!apiKey) return stubAdapter({ system, user }, env);

  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Simpler, robust request: include system + user in a single user message
  const prompt = `${String(system || "")}\n\nUSER:\n${String(user || "")}`;
  const req = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (data?.error) {
      const fallback = await stubAdapter({ system, user }, env);
      return { ...fallback, adapter: "stub", error: data.error?.message || "gemini_api_error" };
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const isInit = typeof system === "string" && system.includes("GameMaster");
    let json = extractJson(text);
    if (!json) {
      if (isInit) {
        json = { scene: text, metadata: { seed: "", goal: "", items: [], difficulty: "easy" } };
      } else {
        json = { is_success: true, score_delta: 0, next_scene: text, feedback: "", hints: [], ended: false };
      }
    }
    if (json && !json.next_scene && json.next_scene_text) json.next_scene = json.next_scene_text;
    return { text, json, usage: { tokens: data?.usage?.total_token_count || 0 }, adapter: "gemini" };
  } catch (e) {
    const fallback = await stubAdapter({ system, user }, env);
    return { ...fallback, adapter: "stub", error: (e && e.message) || "gemini_fetch_error" };
  }
}
