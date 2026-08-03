import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./base.css";
import "./theme-steve.css";
import "./theme-hellripper.css";
import "./theme-phosphor.css";
import "./theme-phosphor-settings.css";
import "./theme-pathe.css";
import "./theme-pathe-settings.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
