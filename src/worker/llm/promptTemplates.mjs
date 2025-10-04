// Prompt templates for INIT and JUDGE stages

export function INIT_PROMPT(seed) {
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
  Keep each sentence short. Fill "story_guidelines" to guide consistency in later steps.`;

  const user = `Use this seed: ${seed}. Return JSON per the schema above.`;
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
  IMPORTANT: Use the exact key name next_scene (not next_scene_text).`;

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

  const user = `Evaluate this context and return JSON per the schema above: ${JSON.stringify(safe)}`;
  return { system, user };
}
