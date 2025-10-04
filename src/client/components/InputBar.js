import React from "https://esm.sh/react@18.2.0";

export function InputBar({ value, onChange, onSubmit, disabled }) {
  return React.createElement("div", { className: "input-row" },
    React.createElement("input", {
      type: "text",
      value,
      placeholder: "Type your command...",
      onChange: (e) => onChange(e.target.value),
      onKeyDown: (e) => { if (e.key === "Enter") onSubmit(); },
    }),
    React.createElement("button", { onClick: onSubmit, disabled }, disabled ? "..." : "Send")
  );
}

