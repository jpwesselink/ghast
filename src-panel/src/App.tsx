import { useEffect, useState, useCallback, type ReactElement } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Menu from "./Menu";
import BlackMetal from "./BlackMetal";
import BlackMetalSettings from "./BlackMetalSettings";
import Settings from "./Settings";
import About from "./About";
import { TooltipProvider } from "./Tooltip";
import type { PanelPayload } from "./types";

const view = new URLSearchParams(window.location.search).get("view");
const isSettings = view === "settings";
const isAbout = view === "about";

const ACTIVATE = "hellripper";
const DEACTIVATE = "holydiver";

export default function App() {
  const [data, setData] = useState<PanelPayload | null>(null);
  const [blackMetal, setBlackMetal] = useState(
    () => localStorage.getItem("ghast-theme") === "blackmetal"
  );
  const [buffer, setBuffer] = useState("");

  useEffect(() => {
    invoke<PanelPayload>("get_workflow_runs").then(setData);

    const unlisten = listen<PanelPayload>("workflow-runs-updated", (event) => {
      setData(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const applyTheme = (t: string) => {
      const isBm = t === "blackmetal";
      setBlackMetal(isBm);
      localStorage.setItem("ghast-theme", isBm ? "blackmetal" : "normal");
    };

    invoke<string>("get_theme").then(applyTheme);

    const unlisten = listen<string>("theme-changed", (event) => {
      applyTheme(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const target = blackMetal ? DEACTIVATE : ACTIVATE;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSettings) {
        invoke("hide_panel");
        return;
      }
      const next = buffer + e.key.toLowerCase();
      if (target.startsWith(next)) {
        setBuffer(next);
        if (next === target) {
          const newMode = !blackMetal;
          invoke("set_theme", { theme: newMode ? "blackmetal" : "normal" });
          setBuffer("");
        }
      } else {
        const key = e.key.toLowerCase();
        setBuffer(target.startsWith(key) ? key : "");
      }
    },
    [buffer, blackMetal, target]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isSettings) return;
    invoke("set_panel_width", { width: blackMetal ? 360 : 280 });
  }, [blackMetal]);

  let content: ReactElement | null = null;
  if (isAbout) {
    content = <About />;
  } else if (isSettings) {
    content = blackMetal ? <BlackMetalSettings /> : <Settings />;
  } else if (data) {
    content = blackMetal ? <BlackMetal data={data} /> : <Menu data={data} />;
  }

  return <TooltipProvider delayDuration={250}>{content}</TooltipProvider>;
}
