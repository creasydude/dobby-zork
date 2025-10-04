// Adapter selector returning a unified interface: callLLM({ system, user })
import { geminiAdapter } from "./geminiAdapter.mjs";
import { fireworksAdapter } from "./fireworksAdapter.mjs";
import { stubAdapter } from "./stubAdapter.mjs";

export function selectEnv(env) {
  // Cloudflare Workers pass env; Node has process.env
  const e = env || (typeof process !== "undefined" ? process.env : {});
  return {
    GEMINI_API_KEY: e?.GEMINI_API_KEY || null,
    FIREWORKS_API_KEY: e?.FIREWORKS_API_KEY || null,
  };
}

export function callLLM(payload, env) {
  const vars = selectEnv(env);
  let impl = stubAdapter;
  if (vars.GEMINI_API_KEY) impl = geminiAdapter;
  else if (vars.FIREWORKS_API_KEY) impl = fireworksAdapter;
  return impl(payload, env);
}

