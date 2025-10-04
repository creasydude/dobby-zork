import React from "https://esm.sh/react@18.2.0";

export function SessionControls({ sessionId, score, turn, inventory, goal, difficulty, onExport }) {
  return React.createElement(React.Fragment, null,
    React.createElement("div", { className: "stat" }, `Session: ${sessionId || '...'}`),
    React.createElement("div", { className: "stat" }, `Score: ${score || 0}`),
    React.createElement("div", { className: "stat" }, `Turn: ${turn || 0}`),
    React.createElement("div", { className: "stat" }, `Inventory: ${(inventory || []).join(', ') || 'empty'}`),
    React.createElement("div", { className: "stat" }, `Goal: ${goal || '—'}`),
    React.createElement("div", { className: "stat" }, `Difficulty: ${difficulty || '—'}`),
    React.createElement("button", { onClick: onExport }, "Export Session")
  );
}
