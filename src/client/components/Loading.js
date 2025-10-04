import React from "https://esm.sh/react@18.2.0";

export function Loading({ text = "Loading..." }) {
  return React.createElement("div", { className: "loading" },
    React.createElement("div", { className: "spinner" }),
    React.createElement("div", { className: "loading-text" }, text)
  );
}

