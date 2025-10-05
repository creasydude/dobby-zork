import React, { useEffect, useState } from "https://esm.sh/react@18.2.0";
import { PixelWindow } from "./components/PixelWindow.js";
import { Typewriter } from "./components/Typewriter.js";
import { InputBar } from "./components/InputBar.js";
import { SessionControls } from "./components/SessionControls.js";
import { Loading } from "./components/Loading.js";
import { HowToPlay } from "./components/HowToPlay.js";
import { LoadingBar } from "./components/LoadingBar.js";

const API_BASE = window.API_BASE || "";
const LS_KEY = "dobby-zork-session";

function saveLocal(snapshot) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot)); } catch {}
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}

async function apiNew() {
  const res = await fetch(`${API_BASE}/api/new`, { method: "POST", headers: { "content-type": "application/json" } });
  return res.json();
}
async function apiAct(sessionId, input) {
  const res = await fetch(`${API_BASE}/api/act`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, input }) });
  return res.json();
}
async function apiGet(id) {
  const res = await fetch(`${API_BASE}/api/session/${id}`);
  return res.json();
}
async function apiSave(sessionId, snapshot) {
  await fetch(`${API_BASE}/api/session/save`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, snapshot }) });
}

function OfflineStub() {
  return {
    async new() {
      return { sessionId: "offline", scene: { title: "Offline Mode", text: "Worker unreachable. Using stub.", prompts: ["look", "continue"] }, metadata: { seed: "offline" } };
    },
    async act(input, state) {
      return { newScene: `You type '${input}'. The offline stub continues the demo.`, feedback: "Progress noted.", score: (state?.score || 0) + 1, ended: false };
    },
  };
}

export default function App() {
  const [session, setSession] = useState(loadLocal());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [lang, setLang] = useState((loadLocal()?.metadata?.language) || (localStorage.getItem('dobby-zork-lang') || 'en'));

  useEffect(() => {
    (async () => {
      try {
        let snap = loadLocal();
        if (!snap || !snap.sessionId) {
          setLoading(true);
          const s = await apiNewWithLang(lang);
          snap = { sessionId: s.sessionId, score: 0, history: [], lastScene: s.scene?.text || "", inventory: [], metadata: s.metadata || {} };
        } else {
          const s = await apiGet(snap.sessionId);
          if (s?.sessionId) snap = s;
        }
        setSession(snap); saveLocal(snap);
      } catch (e) {
        const stub = await OfflineStub().new();
        const snap = { sessionId: stub.sessionId, score: 0, history: [], lastScene: stub.scene?.text || "", inventory: [], metadata: stub.metadata || {} };
        setOffline(true); setSession(snap); saveLocal(snap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function apiNewWithLang(language) {
    const res = await fetch(`${API_BASE}/api/new`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: language }) });
    return res.json();
  }

  async function submit() {
    if (!text.trim() || !session?.sessionId) return;
    setLoading(true);
    try {
      let res;
      if (offline || session.sessionId === "offline") {
        res = await OfflineStub().act(text.trim(), session);
      } else {
        res = await apiActWithLang(session.sessionId, text.trim(), lang);
      }
      const event = { turn: (session.history?.length || 0) + 1, input: text.trim() };
      const next = { ...session, lastScene: res.newScene, score: res.score, history: [...(session.history || []), event] };
      setSession(next); saveLocal(next);
      if (!offline) apiSave(next.sessionId, next).catch(() => {});
      setText("");
    } finally { setLoading(false); }
  }

  async function translateCurrent(language) {
    if (!session?.sessionId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, lang: language }) });
      const data = await res.json();
      if (data?.scene?.text) {
        const next = {
          ...session,
          lastScene: data.scene.text,
          metadata: { ...(session.metadata||{}), language: language, goal: data?.metadata?.goal || session?.metadata?.goal, difficulty: data?.metadata?.difficulty || session?.metadata?.difficulty, stage: data?.metadata?.stage || session?.metadata?.stage },
          inventory: Array.isArray(data?.inventory) ? data.inventory : (session?.inventory || [])
        };
        setSession(next); saveLocal(next);
      }
    } finally { setLoading(false); }
  }

  async function apiActWithLang(sessionId, input, language) {
    const res = await fetch(`${API_BASE}/api/act`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, input, lang: language }) });
    return res.json();
  }

  function exportSession() {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `session-${session?.sessionId || 'unknown'}.json`;
    a.click();
  }

  return (
    React.createElement("div", { className: "app" },
      React.createElement("header", { className: "header" },
        React.createElement("div", { className: "logo" }, "DOBBY ZORK ", React.createElement("span", { className: "cursor" })),
        React.createElement("div", { className: "header-actions" },
          React.createElement("span", { className: "lang-picker" },
            React.createElement("button", { className: `flag ${lang==='en'?'active':''}`, onClick: async () => { setLang('en'); localStorage.setItem('dobby-zork-lang','en'); translateCurrent('en'); } }, "🇬🇧"),
            React.createElement("button", { className: `flag ${lang==='es'?'active':''}`, onClick: async () => { setLang('es'); localStorage.setItem('dobby-zork-lang','es'); translateCurrent('es'); } }, "🇪🇸"),
            React.createElement("button", { className: `flag ${lang==='fr'?'active':''}`, onClick: async () => { setLang('fr'); localStorage.setItem('dobby-zork-lang','fr'); translateCurrent('fr'); } }, "🇫🇷"),
            React.createElement("button", { className: `flag ${lang==='de'?'active':''}`, onClick: async () => { setLang('de'); localStorage.setItem('dobby-zork-lang','de'); translateCurrent('de'); } }, "🇩🇪"),
            React.createElement("button", { className: `flag ${lang==='tr'?'active':''}`, onClick: async () => { setLang('tr'); localStorage.setItem('dobby-zork-lang','tr'); translateCurrent('tr'); } }, "🇹🇷"),
            React.createElement("button", { className: `flag ${lang==='ru'?'active':''}`, onClick: async () => { setLang('ru'); localStorage.setItem('dobby-zork-lang','ru'); translateCurrent('ru'); } }, "🇷🇺"),
            React.createElement("button", { className: `flag ${lang==='fa'?'active':''}`, onClick: async () => { setLang('fa'); localStorage.setItem('dobby-zork-lang','fa'); translateCurrent('fa'); } }, "🇮🇷")
          ),
          React.createElement("button", { className: "link", onClick: () => setShowGuide(true) }, "How to Play")
        )
      ),
      React.createElement(PixelWindow, {
        title: "Story",
        right: React.createElement(SessionControls, {
          sessionId: session?.sessionId,
          score: session?.score,
          turn: session?.history?.length || 0,
          inventory: session?.inventory || [],
          goal: session?.metadata?.goal,
          difficulty: session?.metadata?.difficulty,
          onNewGame: async () => {
            try {
              setLoading(true);
              const s = await apiNewWithLang(lang);
              const snap = { sessionId: s.sessionId, score: 0, history: [], lastScene: s.scene?.text || "", inventory: [], metadata: s.metadata || {} };
              setSession(snap); saveLocal(snap);
            } catch (e) {
              alert("Failed to start new game");
            } finally {
              setLoading(false);
            }
          },
          onImport: async (snapshot) => {
            try {
              setSession(snapshot); saveLocal(snapshot);
              // also persist to server if possible
              if (!offline && snapshot?.sessionId) await apiSave(snapshot.sessionId, snapshot).catch(() => {});
            } catch (e) {
              alert("Failed to import session");
            }
          },
          onExport: exportSession,
        })
      },
        React.createElement(Typewriter, { className: "scene-desc typewriter", text: session?.lastScene || "", speed: 20, lineDelay: 250 }),
        loading && React.createElement(Loading, { text: "Thinking..." }),
        (!session || !session.sessionId) && loading && React.createElement(LoadingBar, { text: "Booting story..." }),
        React.createElement("div", { className: "history" }, (session?.history || []).map((h) => React.createElement("div", { key: h.turn }, `#${h.turn} > ${h.input}`))),
        React.createElement(InputBar, { value: text, onChange: setText, onSubmit: submit, disabled: loading })
      ),
      React.createElement("footer", null,
        React.createElement("small", null, offline ? "Offline demo mode" : "LLM-driven interactive fiction")
      ),
      React.createElement(HowToPlay, { open: showGuide, onClose: () => setShowGuide(false) })
    )
  );
}
