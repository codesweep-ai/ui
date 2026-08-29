import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Single source of truth — consume the package's own stylesheets via the
// vite alias (@codesweep-ai/ui → ../src), not local copies.
import "@codesweep-ai/ui/styles/core.css";
import "@codesweep-ai/ui/styles/components.css";
import "@codesweep-ai/ui/styles/markdown-content.css";
import "@codesweep-ai/ui/styles/syntax.css";
import "./preview.css";

function renderPreview() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

renderPreview();
