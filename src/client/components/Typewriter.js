import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";

export function Typewriter({ text, speed = 25, lineDelay = 300, className = "" }) {
  const [display, setDisplay] = useState("");
  const lines = useMemo(() => (text || "").split(/\r?\n/), [text]);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const containerRef = useRef(null);

  // Reset typing when text changes
  useEffect(() => {
    setDisplay("");
    setLineIndex(0);
    setCharIndex(0);
  }, [text]);

  // Type characters line by line
  useEffect(() => {
    let cancelled = false;
    function step() {
      if (cancelled) return;
      if (lineIndex >= lines.length) return;
      const currentLine = lines[lineIndex] || "";
      if (charIndex <= currentLine.length) {
        const before = lines.slice(0, lineIndex).join("\n");
        const current = currentLine.slice(0, charIndex);
        const content = before + (lineIndex > 0 ? "\n" : "") + current;
        setDisplay(content);
        setTimeout(() => { if (!cancelled) setCharIndex((c) => c + 1); }, speed);
      } else {
        setTimeout(() => {
          if (cancelled) return;
          setLineIndex((i) => i + 1);
          setCharIndex(0);
        }, lineDelay);
      }
    }
    const id = setTimeout(step, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [lineIndex, charIndex, lines, speed, lineDelay]);

  // Auto-scroll as content grows
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [display]);

  return React.createElement(
    "div",
    { className, ref: containerRef },
    [
      React.createElement("span", { key: "text" }, display),
      React.createElement("span", { key: "caret", className: "cursor" }),
    ]
  );
}
