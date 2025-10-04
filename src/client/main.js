import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import App from "./App.js";

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));
