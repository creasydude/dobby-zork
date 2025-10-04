import React from "https://esm.sh/react@18.2.0";

export function LoadingBar({ text = "Loading..." }) {
  return React.createElement("div", { className: "loading-bar" },
    React.createElement("div", { className: "progress" },
      React.createElement("div", { className: "progress-bar" })
    ),
    React.createElement("div", { className: "progress-text" }, text)
  );
}

