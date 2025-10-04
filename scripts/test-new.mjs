import worker from "../src/worker/index.mjs";

async function run() {
  const res = await worker.fetch(new Request("http://x/api/new", { method: "POST" }), process.env, {});
  const json = await res.json();
  console.log("/api/new ->", json);
  if (!json.sessionId || !json.scene) throw new Error("Invalid shape from /api/new");
}

run().catch((e) => { console.error(e); process.exit(1); });

