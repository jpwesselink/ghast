import { useEffect, useState, useCallback, type ReactElement } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Panel from "./Panel";
import SettingsPanel from "./SettingsPanel";
import About from "./About";
import { TooltipProvider } from "./Tooltip";
import type { PanelPayload } from "./types";

const view = new URLSearchParams(window.location.search).get("view");
const isSettings = view === "settings";
const isAbout = view === "about";

const THEME_IDS: Record<string, "holydiver" | "hellripper" | "phosphor"> = {
  normal: "holydiver",
  blackmetal: "hellripper",
  phosphor: "phosphor",
};

// incantation -> config theme value
const INCANTATIONS: Record<string, string> = {
  holydiver: "normal",
  hellripper: "blackmetal",
  phosphor: "phosphor",
};

// set before first paint so themed CSS applies immediately
document.documentElement.dataset.theme =
  THEME_IDS[localStorage.getItem("ghast-theme") ?? "normal"] ?? "holydiver";

interface UiPrefs {
  font_scale: number;
  focus_expand_runs: number;
}

export default function App() {
  const [data, setData] = useState<PanelPayload | null>(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("ghast-theme") ?? "normal"
  );
  const [buffer, setBuffer] = useState("");
  const [focusExpandRuns, setFocusExpandRuns] = useState(5);
  const [hasStoredSize, setHasStoredSize] = useState<boolean | null>(null);

  useEffect(() => {
    const apply = (p: UiPrefs) => {
      document.documentElement.style.setProperty(
        "--font-scale",
        String(p.font_scale)
      );
      setFocusExpandRuns(p.focus_expand_runs);
    };

    invoke<UiPrefs & { has_pat: boolean; panel_width: number | null }>(
      "get_config"
    ).then((config) => {
      apply(config);
      setHasStoredSize(config.panel_width != null);
    });

    // WKWebView renders the CSS AccentColor keyword as stock blue, so pull
    // the real system accent from AppKit instead.
    invoke<string | null>("get_accent_color").then((hex) => {
      if (hex) {
        document.documentElement.style.setProperty("--accent-system", hex);
      }
    });

    const unlisten = listen<UiPrefs>("ui-prefs-changed", (event) => {
      apply(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

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
    let unlistenCompletion: (() => void) | undefined;

    (async () => {
      if (!("Notification" in window)) {
        return;
      }

      const initialPermission = Notification.permission;

      // The plugin's isPermissionGranted() hits a Rust stub that always returns
      // Granted on desktop, so requestPermission() would never be called.
      // Check the browser Notification API directly instead.
      if (initialPermission === "default") {
        await Notification.requestPermission();
      }

      if (Notification.permission === "granted") {
        unlistenCompletion = await listen<{ title: string; body: string }>(
          "workflow-completed",
          async (event) => {
            await invoke("show_notification", {
              title: event.payload.title,
              body: event.payload.body,
            });
          }
        );
      }
    })();

    return () => {
      unlistenCompletion?.();
    };
  }, []);

  useEffect(() => {
    const applyTheme = (t: string) => {
      const known = THEME_IDS[t] ? t : "normal";
      setTheme(known);
      localStorage.setItem("ghast-theme", known);
      document.documentElement.dataset.theme = THEME_IDS[known];
    };

    invoke<string>("get_theme").then(applyTheme);

    const unlisten = listen<string>("theme-changed", (event) => {
      applyTheme(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSettings) {
        invoke("hide_panel");
        return;
      }
      const next = buffer + e.key.toLowerCase();
      const words = Object.keys(INCANTATIONS);
      if (words.some((w) => w.startsWith(next))) {
        setBuffer(next);
        const hit = words.find((w) => w === next);
        if (hit) {
          invoke("set_theme", { theme: INCANTATIONS[hit] });
          setBuffer("");
        }
      } else {
        const key = e.key.toLowerCase();
        setBuffer(words.some((w) => w.startsWith(key)) ? key : "");
      }
    },
    [buffer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isSettings) return;
    // Theme default only applies until the user has resized the panel.
    if (hasStoredSize !== false) return;
    invoke("set_panel_width", { width: theme === "blackmetal" ? 360 : 280 });
  }, [theme, hasStoredSize]);

  let content: ReactElement | null = null;
  if (isAbout) {
    content = <About />;
  } else if (isSettings) {
    content = <SettingsPanel themeId={THEME_IDS[theme]} />;
  } else if (data) {
    content = (
      <Panel
        themeId={THEME_IDS[theme]}
        data={data}
        focusExpandRuns={focusExpandRuns}
      />
    );
  }

  return <TooltipProvider delayDuration={250}>{content}</TooltipProvider>;
}
