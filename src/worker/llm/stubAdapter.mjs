// Deterministic stub adapter returning fixed shapes
export async function stubAdapter({ system, user }, env) {
  const sys = String(system || "");

  // Small deterministic variety helpers
  const hash = (s) => Array.from(s || "seed").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0) >>> 0;
  const pick = (arr, h) => arr[h % arr.length];

  // INIT stage: provide starting scene with explicit stage marker and varied theme
  if (sys.includes("GameMaster")) {
    const seedMatch = sys.match(/seed\W*:\W*([A-Za-z0-9_-]{3,})/i);
    const seed = seedMatch ? seedMatch[1] : `stub-${Math.random().toString(36).slice(2,8)}`;
    const h = hash(seed);
    const theme = pick(["cyberpunk", "mysterious ruins", "haunted station", "desert outpost", "oceanic lab"], h);
    const setting = pick(["neon-lit alley", "ancient corridor", "abandoned platform", "windy dune hangar", "glass tunnel"], h >> 3);
    const tone = pick(["wry", "ominous", "hopeful", "urgent"], h >> 6);
    const itemPool = ["flashlight", "keycard", "map", "multi-tool", "radio", "codebook", "grappler"];
    const items = [pick(itemPool, h >> 1), pick(itemPool, h >> 2), pick(itemPool, h >> 4)].filter((v, i, a) => a.indexOf(v) === i).slice(0,3);
    const goal = pick([
      "Restore power to the control hub",
      "Unlock the sealed lab",
      "Find the missing researcher",
      "Calibrate the beacon",
      "Escape the collapsing wing",
    ], h >> 8);
    const stage = pick(["alley", "corridor", "platform", "hangar", "tunnel"], h >> 10);
    const scene = `Stage: ${stage}\nIn a ${setting}, the ${theme} hums around you. In the ${tone} light, a console blinks for input. A locked hatch bars the path. Tools lie scattered. The air thrums with possibility.`;
    const json = {
      scene,
      metadata: {
        seed,
        goal,
        items,
        difficulty: "easy",
        story_guidelines: { theme, setting, tone, rules: ["keep scenes short", "advance the goal"], score_rubric: { progress: 2, goal_action: 4, exploration: 1 } },
        stage,
      },
    };
    return { text: JSON.stringify(json), json, usage: { tokens: 64 }, adapter: "stub" };
  }

  // JUDGE stage: parse context JSON embedded in user string
  let ctx = { history: [], lastScene: "", userInput: "", storyGuidelines: {} };
  try {
    const u = String(user || "");
    const start = u.indexOf("{");
    if (start !== -1) {
      const jsonStr = u.slice(start);
      ctx = JSON.parse(jsonStr);
    }
  } catch {}

  const input = (ctx.userInput || "").toLowerCase();
  const scene = String(ctx.lastScene || "").toLowerCase();

  // Determine stage from last scene
  let stage = "hallway";
  if (scene.includes("stage: lab") || scene.includes("retro lab")) stage = "lab";
  else if (scene.includes("stage: console") || scene.includes("console") || scene.includes("main console")) stage = "console";
  else if (scene.includes("stage: hallway")) stage = "hallway";

  // Simple parser helpers
  const has = (...words) => words.every((w) => input.includes(w));
  const any = (...words) => words.some((w) => input.includes(w));

  let next = "";
  let feedback = "";
  let hints = [];
  let is_success = false;
  let score_delta = 0;
  let ended = false;
  let inventory_add = [];
  let inventory_remove = [];

  if (stage === "hallway" || stage === "alley" || stage === "corridor" || stage === "platform" || stage === "hangar" || stage === "tunnel") {
    if (has("use", "terminal") || has("type", "enter") || any("enter", "use terminal", "terminal")) {
      is_success = true;
      score_delta = 3;
      next = "Stage: lab\nThe door slides open. Inside, monitors hum softly and a central console awaits. Shelves line the walls with tools.";
      feedback = "Door unlocked via terminal. Proceed inside.";
      hints = ["Inspect the central console", "Check the shelves for useful tools"];
    } else if (has("use", "keycard") || any("swipe card", "keycard")) {
      is_success = true;
      score_delta = 2;
      next = "Stage: lab\nYou swipe the keycard; a chime plays and the hatch opens. The lab glows with screens and a central console.";
      feedback = "Keycard accepted. LAB is open.";
      hints = ["Approach the console", "Maybe take a toolkit from the shelf"];
    } else {
      is_success = false;
      score_delta = 0;
      // Echo the player's intent to avoid repetition and keep immersion
      next = `Stage: ${stage}\nYou try '${input}'. It doesn't progress the situation. The console still awaits a decisive input, and the hatch remains sealed.`;
      feedback = "Focus on the console or a key mechanism.";
      hints = ["Type at the console (e.g., 'enter')", "Try swiping a keycard or similar access method"];
    }
  } else if (stage === "lab") {
    if (any("inspect console", "approach console", "use console", "type")) {
      is_success = true;
      score_delta = 4;
      next = "Stage: console\nYou activate the main console. A prompt appears: 'INIT SYSTEM? (Y/N)'. The lab hums with anticipation.";
      feedback = "Console is live. Prepare to initialize.";
      hints = ["Type 'Y' to initialize", "Look around for a passcode if needed"];
    } else if (any("take", "toolkit", "tools", "screwdriver")) {
      is_success = true;
      score_delta = 1;
      inventory_add = ["toolkit"];
      next = "Stage: lab\nYou grab a small toolkit from the shelf. The console awaits your input.";
      feedback = "Toolkit added to inventory.";
      hints = ["Approach the console", "Consider initializing the system"];
    } else {
      is_success = false;
      score_delta = 0;
      next = "Stage: lab\nCRTs hum around you. The central console awaits. Shelves carry assorted tools.";
      feedback = "Focus on the console or collect useful items.";
      hints = ["Type at the console", "Take a toolkit from the shelf"];
    }
  } else if (stage === "console") {
    if (any("y", "yes", "init", "initialize", "unlock")) {
      is_success = true;
      score_delta = 8;
      ended = true;
      next = "Stage: complete\nSystems initialize. The mainframe whirs to life, revealing a path forward and a triumphant chime. You win.";
      feedback = "Initialization successful. You've completed the objective!";
      hints = [];
    } else {
      is_success = false;
      score_delta = 0;
      next = "Stage: console\nThe prompt blinks: 'INIT SYSTEM? (Y/N)'.";
      feedback = "Try confirming initialization (Y).";
      hints = ["Type 'Y' to initialize"];
    }
  }

  const json = { is_success, score_delta, next_scene: next, feedback, hints, ended, inventory_add, inventory_remove };
  return { text: JSON.stringify(json), json, usage: { tokens: 64 } };
}
