import React, { useEffect, useState } from "react";
import { subscribeToCaseActions } from "../../services/visitorService";
import "../../styles/PoliceCaseTimeline.css";

const formatDateTime = (timestamp) => {
  if (!timestamp) return "—";

  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
};

const getStatusClass = (status) => {
  return String(status || "Unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

const PoliceCaseTimeline = ({ visit }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visit?.id) {
      setHistory([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    setError("");

    const unsubscribe = subscribeToCaseActions(
      visit.id,
      (actions) => {
        setHistory(Array.isArray(actions) ? actions : []);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Real-time case timeline error:", err);
        setError(err?.message || "Unable to load case timeline.");
        setLoading(false);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [visit?.id]);

  if (!visit) return null;

  return (
    <section className="police-case-timeline">
      <div className="case-timeline-header">
        <div>
          <span className="case-timeline-label">CASE HISTORY</span>
          <h2>Case Timeline</h2>
          <p>Chronological record of police actions and case updates.</p>
        </div>

        <div className="case-timeline-count">
          {history.length}
          <span>Actions</span>
        </div>
      </div>

      {!loading && !error && (
        <div className="case-timeline-live" role="status">
          <span className="case-timeline-live-dot" />
          Live updates enabled
        </div>
      )}

      {loading && (
        <div className="case-timeline-state">
          <div className="case-timeline-loader" />
          <p>Connecting to live case history...</p>
        </div>
      )}

      {!loading && error && (
        <div className="case-timeline-error">
          <strong>Unable to load timeline</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="case-timeline-empty">
          <div className="case-timeline-empty-icon">🕒</div>
          <h3>No case actions yet</h3>
          <p>
            Police actions and case updates will appear here after the first
            action is recorded.
          </p>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="case-timeline-list">
          {history.map((item, index) => (
            <div
              className="case-timeline-item"
              key={item.id || `${item.createdAt || "action"}-${index}`}
            >
              <div className="case-timeline-marker-column">
                <div className="case-timeline-marker">
                  {history.length - index}
                </div>

                {index !== history.length - 1 && (
                  <div className="case-timeline-line" />
                )}
              </div>

              <div className="case-timeline-card">
                <div className="case-timeline-card-header">
                  <div>
                    <span className="case-timeline-date">
                      {formatDateTime(item.createdAt)}
                    </span>

                    <h3>{item.actionType || "Case Action"}</h3>
                  </div>

                  <span
                    className={`case-timeline-status ${getStatusClass(
                      item.status,
                    )}`}
                  >
                    {item.status || "Unknown"}
                  </span>
                </div>

                <div className="case-timeline-details">
                  <div>
                    <span>Priority</span>
                    <strong>{item.priority || "—"}</strong>
                  </div>

                  <div>
                    <span>Assigned Officer</span>
                    <strong>
                      {item.assignedOfficer ||
                        item.officerName ||
                        "Not assigned"}
                    </strong>
                  </div>

                  {item.nextActionDate && (
                    <div>
                      <span>Next Action</span>
                      <strong>{item.nextActionDate}</strong>
                    </div>
                  )}
                </div>

                {item.officerRemarks && (
                  <div className="case-timeline-remarks">
                    <span>Officer Remarks</span>
                    <p>{item.officerRemarks}</p>
                  </div>
                )}

                {item.officerName && (
                  <div className="case-timeline-officer">
                    Recorded by <strong>{item.officerName}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PoliceCaseTimeline;
