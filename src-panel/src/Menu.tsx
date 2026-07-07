import { invoke } from "@tauri-apps/api/core";
import RunItem from "./RunItem";
import ReviewItem from "./ReviewItem";
import MentionItem from "./MentionItem";
import type { PanelPayload } from "./types";

export default function Menu({ data }: { data: PanelPayload }) {
  const handleSettings = () => invoke("open_settings");
  const handleQuit = () => invoke("quit_app");

  return (
    <div className="menu">
      <div className="menu-title">Repositories</div>
      <div className="menu-separator" />
      <div className="menu-content">
        {data.auth_error ? (
          <div className="menu-message">Auth error - check Settings</div>
        ) : !data.has_pat ? (
          <div className="menu-message">Open Settings to connect GitHub</div>
        ) : data.repos.length === 0 &&
          data.pending_reviews.length === 0 &&
          data.mentions.length === 0 ? (
          <div className="menu-message">No repos watched - check Settings</div>
        ) : (
          <>
            {data.repos.map((repo) => (
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
            ))}

            {data.pending_reviews.length > 0 && (
              <div className="repo-group">
                <div className="repo-header">Pending reviews</div>
                {data.pending_reviews.map((r) => (
                  <ReviewItem key={r.html_url} review={r} />
                ))}
              </div>
            )}

            {data.mentions.length > 0 && (
              <div className="repo-group">
                <div className="repo-header">Mentions</div>
                {data.mentions.map((m) => (
                  <MentionItem key={m.html_url} mention={m} />
                ))}
              </div>
            )}
          </>
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
