import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { PanelWorkflowRun } from "./types";
import Ghost from "./Ghost";
import { PanelTheme, PrGlyph, CommentGlyph } from "./panelTheme";
import "./blackmetal.css";

function NoiseCanvas({ opacity = 0.08 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = 300;
    c.height = 300;
    const img = ctx.createImageData(300, 300);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Pentagram({ size = 20, color = "#8b0000" }: { size?: number; color?: string }) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${50 + 45 * Math.cos(angle)},${50 + 45 * Math.sin(angle)}`);
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function DrippingText({ children }: { children: ReactNode }) {
  const drip = (bottom: number, left: string, width: number, height: number) => (
    <span
      style={{
        position: "absolute",
        bottom,
        left,
        width,
        height,
        background: "linear-gradient(to bottom, #b01010, transparent)",
        borderRadius: "0 0 1px 1px",
      }}
    />
  );
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      {drip(-8, "20%", 2, 12)}
      {drip(-14, "60%", 2, 18)}
      {drip(-6, "80%", 1.5, 9)}
    </span>
  );
}

function Glyph({
  color,
  pulse = false,
  children,
}: {
  color: string;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`bm-status-icon${pulse ? " bm-icon-pulse" : ""}`}
      style={{ "--glow": color, color } as React.CSSProperties}
    >
      {children}
    </svg>
  );
}

const STAR_PTS = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(12 + 8 * Math.cos(a)).toFixed(2)},${(12 + 8 * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

const PentagramGlyph = (
  <>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <polygon points={STAR_PTS} fill="none" stroke="currentColor" strokeWidth="1.4" />
  </>
);

const SkullGlyph = (
  <>
    <path
      d="M12 3C7.5 3 4.5 6 4.5 10.5c0 2.4 1 3.6 2 4.4V18h2v-1.5h2V18h3v-1.5h2V18h2v-3.1c1-.8 2-2 2-4.4C19.5 6 16.5 3 12 3z"
      fill="currentColor"
    />
    <circle cx="9" cy="11" r="1.6" fill="#0a0303" />
    <circle cx="15" cy="11" r="1.6" fill="#0a0303" />
    <path d="M11.2 13.5h1.6v2h-1.6z" fill="#0a0303" />
  </>
);

const EyeGlyph = (
  <>
    <path
      d="M2.5 12C5 7.5 8.5 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5s-7-2-9.5-6.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <circle cx="13" cy="11" r="0.9" fill="#0a0303" />
  </>
);

const HourglassGlyph = (
  <>
    <path
      d="M6 4h12M6 20h12M7 4l5 8-5 8M17 4l-5 8 5 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M9 18l3-2 3 2v2H9z" fill="currentColor" />
  </>
);

const TombstoneGlyph = (
  <>
    <path d="M6 21V11a6 6 0 0 1 12 0v10z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 9v6M9.5 11.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </>
);

const BrokenClockGlyph = (
  <>
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 12V7M12 12l3.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 5l14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </>
);

const WarningGlyph = (
  <>
    <path d="M12 3.5L22 20.5H2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 9.5v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.8" r="1" fill="currentColor" />
  </>
);

const CrossbonesGlyph = (
  <>
    <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="5" cy="5" r="1.6" fill="currentColor" />
    <circle cx="19" cy="5" r="1.6" fill="currentColor" />
    <circle cx="5" cy="19" r="1.6" fill="currentColor" />
    <circle cx="19" cy="19" r="1.6" fill="currentColor" />
  </>
);

function BmStatusIcon(run: PanelWorkflowRun) {
  if (run.status === "in_progress")
    return <Glyph color="#5577ee" pulse>{EyeGlyph}</Glyph>;
  if (run.status === "queued")
    return <Glyph color="#b8a020">{HourglassGlyph}</Glyph>;
  if (run.status === "waiting")
    return <Glyph color="#cc8822" pulse>{HourglassGlyph}</Glyph>;
  if (run.status === "completed") {
    if (run.conclusion === "success")
      return <Glyph color="#55aa22">{PentagramGlyph}</Glyph>;
    if (run.conclusion === "failure")
      return <Glyph color="#cc2020">{SkullGlyph}</Glyph>;
    if (run.conclusion === "cancelled" || run.conclusion === "skipped")
      return <Glyph color="#9a8a78">{TombstoneGlyph}</Glyph>;
    if (run.conclusion === "timed_out")
      return <Glyph color="#cc6622">{BrokenClockGlyph}</Glyph>;
    if (run.conclusion === "action_required")
      return <Glyph color="#cc8822">{WarningGlyph}</Glyph>;
  }
  return <Glyph color="#9a8a78">{CrossbonesGlyph}</Glyph>;
}

function BmShell({ children }: { children: ReactNode }) {
  return (
    <div className="bm-container">
      <NoiseCanvas opacity={0.06} />

      <div className="bm-scratches">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bm-scratch"
            style={{
              width: 1 + Math.random() * 2,
              height: 40 + Math.random() * 150,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `rotate(${-20 + Math.random() * 40}deg)`,
              opacity: 0.04 + Math.random() * 0.06,
            }}
          />
        ))}
      </div>

      <div className="bm-inner">
        <div className="bm-rain">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="bm-blood-drop"
              style={{
                left: `${Math.random() * 100}%`,
                width: 1 + Math.random() * 2,
                height: 10 + Math.random() * 22,
                opacity: 0.1 + Math.random() * 0.2,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${1.6 + Math.random() * 2.6}s`,
              }}
            />
          ))}
        </div>
        <div className="bm-title">
          <DrippingText>Ghast</DrippingText>
        </div>
        <div className="bm-subtitle">The GitHub Actions Ghost</div>

        {children}

        <div className="bm-footer-sigil">
          <Pentagram size={18} color="#5a2828" />
        </div>
      </div>
    </div>
  );
}

export const blackmetalTheme: PanelTheme = {
  variant: "blackmetal",
  c: {
    tabs: "bm-tabs",
    tab: "bm-tab",
    tabBadge: "bm-tab-badge",
    content: "bm-content",
    clip: "bm-pager-clip",
    strip: "bm-pager-strip",
    page: "bm-pager-page",
    message: "bm-message",
    group: "bm-repo-group",
    header: "bm-repo-header",
    headerLink: "bm-repo-header bm-repo-link",
    sectFail: "bm-repo-header bm-sect",
    sectWait: "bm-repo-header bm-sect-wait",
    sectRun: "bm-repo-header bm-sect-run",
    sectQuiet: "bm-repo-header bm-sect-quiet",
    row: "bm-run-item",
    quietRow: "bm-run-item bm-quiet-row",
    chevron: "bm-run-chevron",
    name: "bm-run-name",
    time: "bm-run-time",
    chip: "bm-chip",
    duration: "bm-run-duration",
    histPrefix: "bm-hist",
    calm: "bm-calm",
    calmLine: "bm-calm-line",
    footer: "bm-footer",
    footerItem: "bm-footer-item",
    tlTime: "bm-tl-time",
    tlNow: "bm-tl-now",
    tlNowLabel: "bm-tl-now-label",
    tlNowLine: "bm-tl-now-line",
    tlDay: "bm-repo-header bm-sect",
    iconTrigger: "bm-icon-trigger",
    loading: "bm-message",
  },
  copy: {
    authError: "The binding has failed... check Settings",
    noPat: "No soul has been bound... open Settings",
    noRepos: "No repositories have been haunted",
    loadingRuns: "summoning...",
    noReviews: "No souls awaiting judgment",
    noPrs: "No offerings of thine own",
    noMentions: "The whispers have fallen silent",
    calm: "All souls at rest",
    failing: "The damned",
    waiting: "Awaiting the seal",
    running: "Rituals in progress",
    quiet: "At rest",
    nowLabel: "the witching hour",
  },
  CalmGhost: () => (
    <Ghost size={56} bodyOpacity={0.85} eyeMilkColor="#e6e0d2" eyeMilkScale={1.1} glow="#aa1010" />
  ),
  StatusIcon: BmStatusIcon,
  ReviewIcon: (draft) => <PrGlyph draft={draft} color={draft ? "#9a8a78" : "#55aa22"} />,
  MentionIcon: () => <CommentGlyph color="#4696dc" />,
  Shell: BmShell,
  SepTop: () => null,
  SepBottom: () => <div className="bm-divider" />,
};
