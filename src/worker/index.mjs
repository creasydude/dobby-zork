// Cloudflare Worker entry (module syntax)
import { handleNew, handleAct, handleSessionGet, handleSessionSave, handleDebugAdapter, handleDebugEnv } from "./handlers.mjs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...corsHeaders() } });
    }

    // Serve static assets for non-API GET/HEAD requests if configured via wrangler.toml `assets`.
    if (!pathname.startsWith("/api") && (req.method === "GET" || req.method === "HEAD") && env?.ASSETS?.fetch) {
      const assetRes = await env.ASSETS.fetch(req);
      // If found, return; otherwise fall through to 404.
      if (assetRes && assetRes.status !== 404) return assetRes;
    }

    if (pathname === "/api/new" && req.method === "POST") return handleNew(req, env);
    if (pathname === "/api/act" && req.method === "POST") return handleAct(req, env);
    if (pathname === "/api/session/save" && req.method === "POST") return handleSessionSave(req, env);
    if (pathname.startsWith("/api/session/") && req.method === "GET") {
      const id = pathname.split("/").pop();
      return handleSessionGet(req, env, id);
    }
    if (pathname === "/api/health") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...corsHeaders() } });
    if (pathname === "/api/debug/adapter") return handleDebugAdapter(req, env);
    if (pathname === "/api/debug/env") return handleDebugEnv(req, env);

    return new Response("Not Found", { status: 404, headers: { ...corsHeaders() } });
  },
};
