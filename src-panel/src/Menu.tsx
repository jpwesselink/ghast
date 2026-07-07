import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import RunItem from "./RunItem";
import ReviewItem from "./ReviewItem";
import MentionItem from "./MentionItem";
import type { PanelPayload } from "./types";

type Tab = "builds" | "reviews" | "comments";

export default function Menu({ data }: { data: PanelPayload }) {
  const [tab, setTab] = useState<Tab>("builds");
  const handleSettings = () => invoke("open_settings");
  const handleQuit = () => invoke("quit_app");

  const activeRunCount = Object.values(data.runs)
    .flat()
    .filter((r) => r.status === "queued" || r.status === "in_progress").length;
  const reviewCount = data.pending_reviews.length;
  const mentionCount = data.mentions.length;

  return (
    <div className="menu">
      <div className="menu-tabs">
        <button
          className={`menu-tab${tab === "builds" ? " active" : ""}`}
          onClick={() => setTab("builds")}
        >
          Builds
          {activeRunCount > 0 && <span className="menu-tab-badge">{activeRunCount}</span>}
        </button>
        <button
          className={`menu-tab${tab === "reviews" ? " active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews
          {reviewCount > 0 && <span className="menu-tab-badge">{reviewCount}</span>}
        </button>
        <button
          className={`menu-tab${tab === "comments" ? " active" : ""}`}
          onClick={() => setTab("comments")}
        >
          Comments
          {mentionCount > 0 && <span className="menu-tab-badge">{mentionCount}</span>}
        </button>
      </div>
      <div className="menu-separator" />
      <div className="menu-content">
        {data.auth_error ? (
          <div className="menu-message">Auth error - check Settings</div>
        ) : !data.has_pat ? (
          <div className="menu-message">Open Settings to connect GitHub</div>
        ) : tab === "builds" ? (
          data.repos.length === 0 ? (
            <div className="menu-message">No repos watched - check Settings</div>
          ) : (
            data.repos.map((repo) => (
              <div key={repo} className="repo-group">
                <div className="repo-header">{repo}</div>
                {data.runs[repo] ? (
                  data.runs[repo].map((run) => (
                    <RunItem key={run.html_url} run={run} />
                  ))
                ) : (
                  <div className="run-loading">loading...</div>
                )}
              </div>
            ))
          )
        ) : tab === "reviews" ? (
          data.pending_reviews.length === 0 ? (
            <div className="menu-message">No pending reviews</div>
          ) : (
            data.pending_reviews.map((r) => (
              <ReviewItem key={r.html_url} review={r} />
            ))
          )
        ) : data.mentions.length === 0 ? (
          <div className="menu-message">No unread mentions</div>
        ) : (
          data.mentions.map((m) => (
            <MentionItem key={m.html_url} mention={m} />
          ))
        )}
      </div>
      <div className="menu-separator" />
      <div className="menu-footer">
        <button className="footer-item" onClick={() => invoke("open_about")}>
          About ghast...
        </button>
        <button className="footer-item" onClick={handleSettings}>
          Settings...
        </button>
        <button className="footer-item" onClick={handleQuit}>
          Quit ghast
        </button>
      </div>
    </div>
  );
}
