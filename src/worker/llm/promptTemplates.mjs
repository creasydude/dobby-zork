// Prompt templates for INIT and JUDGE stages

function langName(code) {
  const map = { en: "English", es: "Spanish", fr: "French", de: "German", tr: "Turkish", it: "Italian", pt: "Portuguese", ja: "Japanese", zh: "Chinese", ar: "Arabic", ru: "Russian", fa: "Persian" };
  return map[String(code || "").toLowerCase()] || "English";
}

export function INIT_PROMPT(seed, lang = "en") {
  const system = `SYSTEM: You are "GameMaster", a retro-text-adventure generator for a browser game. RETURN ONLY valid JSON (no markdown fences, no commentary). Use EXACT keys below.
  Schema:
  {
    "scene": "string - the opening scene text to show to player",
    "metadata": {
       "seed": "short string",
       "goal": "short text",
       "items": ["item1","item2","item3"],
       "difficulty": "easy|medium|hard",
       "story_guidelines": { "theme": "string", "setting": "string", "tone": "string", "rules": ["keep scenes short", "avoid violence"], "score_rubric": { "progress": 2, "goal_action": 4, "exploration": 1 } },
       "stage": "short identifier for current stage"
    }
  }
  INSTRUCTIONS: Produce a rich evocative opening scene (4-6 sentences), describe setting and a clear immediate challenge.
  Keep each sentence short. Fill "story_guidelines" to guide consistency in later steps.
  LANGUAGE: All strings returned to the player (scene, goal, feedback, hints) must be in ${langName(lang)}. Also ensure metadata fields \"goal\", \"difficulty\" (label), and item names in \"items\" are in ${langName(lang)}. Keep JSON keys in English.`;

  const user = `Use this seed: ${seed}. Return JSON per the schema above. Language code: ${String(lang).toLowerCase()}.`;
  return { system, user };
}

export function JUDGE_PROMPT(history, lastScene, userInput, storyGuidelines, inventory = [], score = 0, turn = 1, metadata = {}) {
  const system = `SYSTEM: You are "Judge", the game engine's evaluator. You will RECEIVE game history, last scene text,
  story_guidelines, and the player's input, plus current score/inventory/metadata. RETURN JSON ONLY (no markdown fences). Use EXACT keys below.
  {
    "is_success": true|false,
    "score_delta": integer,        // -5..+10
    "next_scene": "string",       // next scene text (2-5 sentences)
    "feedback": "string",         // short feedback to show the player
    "hints": ["optional hint strings..."],
    "ended": true|false,
    "inventory_add": ["optional item names to add"],
    "inventory_remove": ["optional item names to remove"],
    "metadata_update": { "goal": "optional new goal", "difficulty": "optional difficulty", "stage": "optional stage", "story_guidelines": { /* partial updates allowed */ } }
  }
  RULES: Base evaluation on whether the player's input tries to solve or progress the current challenge. If partially
  correct, set is_success=false but include a helpful hint. If input is malicious or unrelated, set is_success=false and
  give a short hint to redirect to the game. Do not return any markup. Keep next_scene short and actionable.
  IMPORTANT: Use the exact key name next_scene (not next_scene_text).
  LANGUAGE: All strings visible to the player (next_scene, feedback, hints) must be in ${langName(metadata?.language || "en")}. Interpret userInput in that language.`;

  const safe = {
    history: history.map((h) => ({ turn: h.turn, input: h.input, outcome: h.is_success })),
    lastScene: String(lastScene || ""),
    userInput: String(userInput || ""),
    story_guidelines: storyGuidelines || {},
    inventory,
    score,
    turn,
    metadata,
  };

  const user = `Evaluate this context and return JSON per the schema above. Language code: ${String(metadata?.language || "en").toLowerCase()}. Context: ${JSON.stringify(safe)}`;
  return { system, user };
}

export function TRANSLATE_PROMPT(text, lang = "en") {
  const system = `SYSTEM: You are a translator specialized in interactive fiction. RETURN ONLY valid JSON with the exact schema: { "text": "translated string" }. No commentary, no markdown.`;
  const user = `Translate the following text to ${langName(lang)}. Preserve meaning and tone. Keep formatting (line breaks) similar. Input: ${JSON.stringify(String(text || ""))}`;
  return { system, user };
}

export function TRANSLATE_META_PROMPT(meta, lang = "en") {
  const system = `SYSTEM: You are a translator. RETURN ONLY valid JSON with this exact schema: { "goal": "string", "difficulty": "string", "items": ["string", ...] }. Translate values to the target language; keep JSON keys in English.`;
  const safe = {
    goal: String(meta?.goal || ""),
    difficulty: String(meta?.difficulty || ""),
    items: Array.isArray(meta?.items) ? meta.items.map(String) : [],
  };
  const user = `Translate these values to ${langName(lang)}: ${JSON.stringify(safe)}`;
  return { system, user };
}
