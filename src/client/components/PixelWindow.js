import React from "https://esm.sh/react@18.2.0";

export function PixelWindow({ title, children, right }) {
  return (
    React.createElement("main", { className: "grid" },
      React.createElement("section", { className: "panel" },
        React.createElement("h2", { className: "scene-title" }, title),
        children
      ),
      React.createElement("aside", { className: "panel sidebar" }, right)
    )
  );
}

