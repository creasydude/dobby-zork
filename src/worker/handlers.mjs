import { callLLM } from "./llm/adapter.mjs";
import { INIT_PROMPT, JUDGE_PROMPT, TRANSLATE_PROMPT, TRANSLATE_META_PROMPT } from "./llm/promptTemplates.mjs";

const store = new Map();
const rate = new Map();

function now() { return Date.now(); }
function base62(n = 16) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const arr = new Uint8Array(n);
  (crypto?.getRandomValues ? crypto.getRandomValues(arr) : arr).forEach((v, i) => (arr[i] = v || Math.floor(Math.random() * 256)));
  let out = "";
  for (let i = 0; i < n; i++) out += chars[arr[i] % chars.length];
  return out;
}

function sanitizeInput(s, max = 2000) {
  if (!s) return "";
  const clean = String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, max);
  return clean;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

function json(status, body) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json", ...corsHeaders() } });
}

function throttle(sessionId) {
  const t = rate.get(sessionId) || { last: 0, hits: [] };
  const nowMs = now();
  // 1 req/sec
  if (nowMs - t.last < 1000) return false;
  t.last = nowMs;
  // 60/min
  t.hits = t.hits.filter((x) => nowMs - x < 60000);
  if (t.hits.length >= 60) return false;
  t.hits.push(nowMs);
  rate.set(sessionId, t);
  return true;
}

async function getKV(env) {
  return env?.SESSIONS_KV || null;
}

export async function handleNew(req, env) {
  const id = base62(16);
  const seed = base62(8);
  let lang = "en";
  try {
    if (req && typeof req.json === "function") {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.lang === "string") lang = body.lang.slice(0, 8).toLowerCase();
    }
  } catch {}
  const { system, user } = INIT_PROMPT(seed, lang);
  const { json: model } = await callLLM({ system, user }, env);

  let openingScene = String(model?.scene || model?.next_scene || model?.next_scene_text || "");
  let meta = model?.metadata || {};
  // Ensure meta fields are translated as requested (goal, difficulty, items)
  try {
    const { system: ms, user: mu } = TRANSLATE_META_PROMPT({ goal: meta?.goal || "", difficulty: meta?.difficulty || "", items: meta?.items || [] }, lang);
    const tm = await callLLM({ system: ms, user: mu }, env);
    const mjson = tm?.json || {};
    if (mjson) {
      meta.goal = String(mjson.goal || meta.goal || "");
      meta.difficulty = String(mjson.difficulty || meta.difficulty || "");
      if (Array.isArray(mjson.items)) meta.items = mjson.items.map(String);
    }
  } catch {}
  const guidelines = meta?.story_guidelines || meta?.storyGuidelines || {};
  const stage = String(meta?.stage || "intro");
  const snapshot = {
    sessionId: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    score: 0,
    history: [],
    lastScene: openingScene,
    inventory: Array.isArray(meta?.items) ? meta.items.slice(0, 6) : [],
    metadata: {
      seed,
      goal: String(meta?.goal || model?.goal || ""),
      difficulty: String(meta?.difficulty || model?.difficulty || "easy"),
      stage,
      story_guidelines: guidelines,
      language: lang || "en",
    },
  };

  store.set(id, snapshot);
  const kv = await getKV(env);
  if (kv) await kv.put(id, JSON.stringify(snapshot));
  const res = json(200, { sessionId: id, scene: { text: snapshot.lastScene }, metadata: snapshot.metadata });
  res.headers.set("Set-Cookie", `sessionId=${id}; Path=/; SameSite=Lax`);
  return res;
}

export async function handleAct(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = sanitizeInput(body.sessionId || "").slice(0, 64);
  const input = sanitizeInput(body.input || "");
  const lang = (body && typeof body.lang === "string") ? body.lang.slice(0,8).toLowerCase() : null;
  if (!sessionId || !input) return json(400, { error: "sessionId and input required" });
  if (!throttle(sessionId)) return json(429, { error: "Rate limit" });

  let snapshot = store.get(sessionId);
  if (!snapshot) {
    const kv = await getKV(env);
    if (kv) {
      const raw = await kv.get(sessionId);
      if (raw) snapshot = JSON.parse(raw);
    }
  }
  if (!snapshot) return json(404, { error: "Session not found" });

  // allow client to switch language mid-session
  if (lang) {
    snapshot.metadata = { ...(snapshot.metadata || {}), language: lang };
  }

  const { system, user } = JUDGE_PROMPT(
    snapshot.history || [],
    snapshot.lastScene || "",
    input,
    snapshot.metadata?.story_guidelines || snapshot.metadata?.storyGuidelines || {},
    snapshot.inventory || [],
    snapshot.score || 0,
    (snapshot.history?.length || 0) + 1,
    snapshot.metadata || {}
  );
  const { json: model } = await callLLM({ system, user }, env);

  const isSuccess = !!model?.is_success;
  const delta = Number.isFinite(model?.score_delta) ? Math.max(-5, Math.min(10, Math.trunc(model.score_delta))) : 0;
  snapshot.score = (snapshot.score || 0) + delta;
  snapshot.lastScene = String(model?.next_scene || model?.next_scene_text || snapshot.lastScene || "");
  snapshot.updatedAt = new Date().toISOString();
  // Apply inventory changes if returned by model
  if (Array.isArray(model?.inventory_add) && model.inventory_add.length) {
    const set = new Set([...(snapshot.inventory || [])]);
    for (const it of model.inventory_add) set.add(String(it));
    snapshot.inventory = Array.from(set).slice(0, 6);
  }
  if (Array.isArray(model?.inventory_remove) && model.inventory_remove.length) {
    const remove = new Set(model.inventory_remove.map(String));
    snapshot.inventory = (snapshot.inventory || []).filter((it) => !remove.has(String(it)));
  }
  if (model?.metadata_update && typeof model.metadata_update === "object") {
    snapshot.metadata = { ...(snapshot.metadata || {}), ...model.metadata_update };
  }
  const event = { turn: (snapshot.history?.length || 0) + 1, input, is_success: isSuccess, serverPrompt: user, modelResponse: model };
  snapshot.history = [...(snapshot.history || []), event];
  const ended = !!model?.ended || snapshot.score >= 20;

  store.set(sessionId, snapshot);
  const kv = await getKV(env);
  if (kv) await kv.put(sessionId, JSON.stringify(snapshot));

  return json(200, { newScene: snapshot.lastScene, feedback: String(model?.feedback || ""), score: snapshot.score, ended, hints: Array.isArray(model?.hints) ? model.hints : [], metadata: snapshot.metadata });
}

export async function handleSessionSave(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = sanitizeInput(body.sessionId || "").slice(0, 64);
  const snapshot = body.snapshot && typeof body.snapshot === "object" ? body.snapshot : null;
  if (!sessionId || !snapshot) return json(400, { error: "sessionId and snapshot required" });
  store.set(sessionId, snapshot);
  const kv = await getKV(env);
  if (kv) await kv.put(sessionId, JSON.stringify(snapshot));
  return json(200, { ok: true });
}

export async function handleTranslate(req, env) {
  const body = await req.json().catch(() => ({}));
  const sessionId = sanitizeInput(body.sessionId || "").slice(0, 64);
  const lang = sanitizeInput(body.lang || "").slice(0, 8).toLowerCase() || "en";
  if (!sessionId) return json(400, { error: "sessionId required" });
  let snapshot = store.get(sessionId);
  if (!snapshot) {
    const kv = await getKV(env);
    if (kv) {
      const raw = await kv.get(sessionId);
      if (raw) snapshot = JSON.parse(raw);
    }
  }
  if (!snapshot) return json(404, { error: "Session not found" });
  const { system, user } = TRANSLATE_PROMPT(snapshot.lastScene || "", lang);
  const { json: model } = await callLLM({ system, user }, env);
  const translated = String(model?.text || snapshot.lastScene || "");
  snapshot.lastScene = translated;
  snapshot.metadata = { ...(snapshot.metadata || {}), language: lang };
  snapshot.updatedAt = new Date().toISOString();
  store.set(sessionId, snapshot);
  const kv = await getKV(env);
  if (kv) await kv.put(sessionId, JSON.stringify(snapshot));
  return json(200, { ok: true, scene: { text: translated }, metadata: snapshot.metadata });
}

export async function handleSessionGet(req, env, id) {
  let snapshot = store.get(id);
  if (!snapshot) {
    const kv = await getKV(env);
    if (kv) {
      const raw = await kv.get(id);
      if (raw) snapshot = JSON.parse(raw);
    }
  }
  if (!snapshot) return json(404, { error: "Session not found" });
  return json(200, snapshot);
}

// Optional debug endpoint to see which adapter was last used
export async function handleDebugAdapter(req, env) {
  const { system, user } = JUDGE_PROMPT([], "", "ping", {}, [], 0, 0, {});
  const res = await callLLM({ system, user }, env);
  return json(200, { adapter: res?.adapter || "unknown", error: res?.error || null });
}

export async function handleDebugEnv(req, env) {
  const hasGemini = !!env?.GEMINI_API_KEY;
  const hasFireworks = !!env?.FIREWORKS_API_KEY;
  return json(200, { hasGemini, hasFireworks });
}
