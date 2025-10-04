import worker from "../src/worker/index.mjs";

async function api(path, init) {
  const res = await worker.fetch(new Request(`http://x${path}`, init), process.env, {});
  return res.json();
}

async function run() {
  const created = await api("/api/new", { method: "POST" });
  const acted = await api("/api/act", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: created.sessionId, input: "look" }) });
  console.log("/api/act ->", acted);
  if (typeof acted.score !== "number" || typeof acted.ended !== "boolean") throw new Error("Invalid shape from /api/act");
}

run().catch((e) => { console.error(e); process.exit(1); });

