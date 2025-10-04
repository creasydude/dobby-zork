import React from "https://esm.sh/react@18.2.0";

export function SessionControls({ sessionId, score, turn, inventory, goal, difficulty, onNewGame, onImport, onExport }) {
  const fileInputId = "import-session-file";

  function triggerImport() {
    const el = document.getElementById(fileInputId);
    if (el) el.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object" || !json.sessionId) throw new Error("Invalid snapshot JSON");
      onImport && onImport(json);
    } catch (err) {
      alert("Failed to import session JSON: " + (err?.message || String(err)));
    } finally {
      e.target.value = ""; // reset so same file can be selected again
    }
  }
  return React.createElement(React.Fragment, null,
    React.createElement("div", { className: "stat" }, `Session: ${sessionId || '...'}`),
    React.createElement("div", { className: "stat" }, `Score: ${score || 0}`),
    React.createElement("div", { className: "stat" }, `Turn: ${turn || 0}`),
    React.createElement("div", { className: "stat" }, `Inventory: ${(inventory || []).join(', ') || 'empty'}`),
    React.createElement("div", { className: "stat" }, `Goal: ${goal || '—'}`),
    React.createElement("div", { className: "stat" }, `Difficulty: ${difficulty || '—'}`),
    React.createElement("div", { className: "controls-row" },
      React.createElement("button", { onClick: onNewGame }, "New Game"),
      React.createElement("button", { onClick: triggerImport }, "Import Session"),
      React.createElement("button", { onClick: onExport }, "Export Session"),
    ),
    React.createElement("input", { id: fileInputId, type: "file", accept: "application/json", style: { display: "none" }, onChange: handleFileChange })
  );
}
