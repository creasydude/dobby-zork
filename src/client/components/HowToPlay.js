import React from "https://esm.sh/react@18.2.0";

export function HowToPlay({ open, onClose }) {
  if (!open) return null;
  return (
    React.createElement("div", { className: "modal-backdrop", onClick: onClose },
      React.createElement("div", { className: "modal", onClick: (e) => e.stopPropagation() },
        React.createElement("div", { className: "modal-header" },
          React.createElement("h3", null, "How to Play"),
          React.createElement("button", { className: "close", onClick: onClose }, "✕")
        ),
        React.createElement("div", { className: "modal-body" },
          React.createElement("p", null, "Type short commands to explore the story and solve challenges."),
          React.createElement("p", null, "Press Enter to submit. Keep commands concise (2-5 words)."),
          React.createElement("h4", null, "Basics"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("code", null, "look"), " - examine your surroundings"),
            React.createElement("li", null, React.createElement("code", null, "inventory"), " - check what you carry"),
            React.createElement("li", null, React.createElement("code", null, "go north"), ", ", React.createElement("code", null, "go east"), " - move between areas"),
            React.createElement("li", null, React.createElement("code", null, "take key"), ", ", React.createElement("code", null, "use key on door"))
          ),
          React.createElement("h4", null, "Interaction"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("code", null, "talk to guard"), " - speak with characters"),
            React.createElement("li", null, React.createElement("code", null, "ask guard about gate")),
            React.createElement("li", null, React.createElement("code", null, "open chest"), ", ", React.createElement("code", null, "read note"))
          ),
          React.createElement("h4", null, "Tips"),
          React.createElement("ul", null,
            React.createElement("li", null, "Use verbs first: look, go, take, use, talk, open, read."),
            React.createElement("li", null, "Stuck? Try ", React.createElement("code", null, "look"), " to refresh details or mention notable objects."),
            React.createElement("li", null, "Combine objects: ", React.createElement("code", null, "use rope on hook"), "."),
            React.createElement("li", null, "Your score and turns appear at the top-right panel."),
            React.createElement("li", null, "You can export/import your session from the controls.")
          ),
          React.createElement("h4", null, "Example Flow"),
          React.createElement("pre", { className: "example" }, [
            "> look\n",
            "You are in a dim hall. A locked door is east.\n\n",
            "> take key\n",
            "You pick up a rusty key.\n\n",
            "> use key on door\n",
            "The door unlocks with a click.\n\n",
            "> go east\n",
            "You enter the guard room...\n"
          ].join(""))
        )
      )
    )
  );
}

