import React, { useEffect, useState } from "react";
import {
  saveCaseAction,
  updateCaseAction,
  subscribeToCaseActions,
} from "../../services/visitorService";
import { auth, db } from "../../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import "../../styles/PoliceCaseAction.css";

const ACTION_OPTIONS = [
  "Information / Clarification Required",
  "Statement Recorded",
  "Additional Evidence Required",
  "Verification Initiated",
  "Referred to Concerned Department",
  "Complaint Registered",
  "FIR Registered",
  "No Further Action",
  "Case Closed",
];

const STATUS_OPTIONS = [
  "New",
  "Under Verification",
  "Evidence Collection",
  "Referred",
  "Complaint Registered",
  "FIR Registered",
  "Closed",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const EMPTY_FORM = {
  actionType: "",
  officerRemarks: "",
  assignedOfficer: "",
  priority: "Medium",
  nextActionDate: "",
  status: "Under Verification",
};

const getAuthOfficerFallback = () => {
  const user = auth.currentUser;

  return user?.displayName || user?.email || "Police Officer";
};

export default function PoliceCaseAction({ visit, onUpdated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [history, setHistory] = useState([]);
  const [officerName, setOfficerName] = useState(getAuthOfficerFallback());
  const [loadingOfficer, setLoadingOfficer] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLive, setHistoryLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadOfficerProfile();
  }, []);

  useEffect(() => {
    if (!visit?.id) return;

    setForm({
      actionType: visit.caseAction?.actionType || "",
      officerRemarks: visit.caseAction?.officerRemarks || "",
      assignedOfficer: visit.caseAction?.assignedOfficer || "",
      priority: visit.caseAction?.priority || "Medium",
      nextActionDate: visit.caseAction?.nextActionDate || "",
      status: visit.caseAction?.status || "Under Verification",
    });
  }, [visit]);

  const loadOfficerProfile = async () => {
    try {
      setLoadingOfficer(true);

      const user = auth.currentUser;

      if (!user?.uid) {
        setOfficerName("Police Officer");
        return;
      }

      let name = user.displayName || "";

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();

          name =
            data.officerName ||
            data.name ||
            data.fullName ||
            data.displayName ||
            name;
        }
      } catch (profileError) {
        console.warn(
          "Unable to read officer profile. Using Firebase Auth details.",
          profileError,
        );
      }

      setOfficerName(name || user.email || "Police Officer");
    } catch (err) {
      console.error("Officer profile error:", err);
      setOfficerName(getAuthOfficerFallback());
    } finally {
      setLoadingOfficer(false);
    }
  };

  useEffect(() => {
    if (!visit?.id) {
      setHistory([]);
      setHistoryLive(false);
      setLoadingHistory(false);
      return undefined;
    }

    setLoadingHistory(true);
    setError("");
    setHistoryLive(false);

    const unsubscribe = subscribeToCaseActions(
      visit.id,
      (items) => {
        setHistory(items || []);
        setLoadingHistory(false);
        setHistoryLive(true);
      },
      (err) => {
        console.error("Real-time case action history error:", err);
        setError(err?.message || "Unable to load action history.");
        setLoadingHistory(false);
        setHistoryLive(false);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [visit?.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  const resetForm = () => {
    setEditingId(null);

    setForm({
      actionType: visit?.caseAction?.actionType || "",
      officerRemarks: visit?.caseAction?.officerRemarks || "",
      assignedOfficer: visit?.caseAction?.assignedOfficer || "",
      priority: visit?.caseAction?.priority || "Medium",
      nextActionDate: visit?.caseAction?.nextActionDate || "",
      status: visit?.caseAction?.status || "Under Verification",
    });

    setMessage("");
    setError("");
  };

  const startEdit = (item) => {
    setEditingId(item.id);

    setForm({
      actionType: item.actionType || "",
      officerRemarks: item.officerRemarks || "",
      assignedOfficer: item.assignedOfficer || "",
      priority: item.priority || "Medium",
      nextActionDate: item.nextActionDate || "",
      status: item.status || "Under Verification",
    });

    setMessage("");
    setError("");

    document.querySelector(".case-action-card")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!visit?.id) {
      setError("Visit ID is missing.");
      return;
    }

    if (!form.actionType) {
      setError("Please select a police action.");
      return;
    }

    if (!form.officerRemarks.trim()) {
      setError("Please enter officer remarks.");
      return;
    }

    if (!officerName || officerName === "Police Officer") {
      setError(
        "Officer name is not available. Please make sure the logged-in police user's profile has a name.",
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        ...form,
        officerId: auth.currentUser?.uid || "",
        officerName,
      };

      if (editingId) {
        await updateCaseAction(visit.id, editingId, payload);

        const updatedVisit = {
          ...visit,
          caseAction: {
            ...(visit.caseAction || {}),
            ...payload,
            id: editingId,
          },
          caseStatus: payload.status,
          casePriority: payload.priority,
        };

        if (typeof onUpdated === "function") {
          onUpdated(updatedVisit);
        }

        setMessage("Case action updated successfully.");
        setEditingId(null);
      } else {
        const result = await saveCaseAction(visit.id, payload);

        if (!result?.success) {
          throw new Error("Unable to save case action.");
        }

        const updatedVisit = {
          ...visit,
          caseAction: result.action,
          caseStatus: result.action?.status || payload.status,
          casePriority: result.action?.priority || payload.priority,
        };

        if (typeof onUpdated === "function") {
          onUpdated(updatedVisit);
        }

        const savedAction = result?.action || {
          ...payload,
          id: result?.actionId || Date.now().toString(),
        };

        setHistory((previous) => [savedAction, ...previous]);
        setMessage("Case action saved successfully.");
      }
    } catch (err) {
      console.error("Case action save/update error:", err);
      setError(err?.message || "Failed to save case action.");
    } finally {
      setSaving(false);
    }
  };

  if (!visit?.id) {
    return (
      <section className="case-action-card">
        <div className="case-action-empty">
          No active visitor case selected.
        </div>
      </section>
    );
  }

  return (
    <section className="case-action-card">
      <div className="case-action-header">
        <div>
          <span className="case-action-eyebrow">OFFICER WORKFLOW</span>
          <h2>Police Case Action</h2>
          <p>
            Review the evidence and AI analysis, then record or update the
            action taken by the officer.
          </p>
        </div>

        <div className="case-action-case-id">
          Case ID
          <strong>{visit.id}</strong>
        </div>
      </div>

      <div className="case-action-officer">
        <div className="case-action-officer-icon">👮</div>
        <div>
          <span>LOGGED-IN POLICE OFFICER</span>
          <strong>
            {loadingOfficer ? "Loading officer name..." : officerName}
          </strong>
          <small>
            {auth.currentUser?.email || "Authenticated police account"}
          </small>
        </div>
      </div>

      <form onSubmit={handleSave} className="case-action-form">
        {editingId && (
          <div className="case-action-edit-banner">
            <div>
              <strong>Edit Case Action</strong>
              <span>You are editing a previously recorded police action.</span>
            </div>

            <button type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          </div>
        )}

        <div className="case-action-grid">
          <div className="case-action-field">
            <label htmlFor="actionType">Police Action *</label>
            <select
              id="actionType"
              name="actionType"
              value={form.actionType}
              onChange={handleChange}
            >
              <option value="">Select action</option>
              {ACTION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="case-action-field">
            <label htmlFor="status">Case Status *</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="case-action-field">
            <label htmlFor="assignedOfficer">Assigned Officer</label>
            <input
              id="assignedOfficer"
              name="assignedOfficer"
              type="text"
              value={form.assignedOfficer}
              onChange={handleChange}
              placeholder="Enter officer name / ID"
            />
          </div>

          <div className="case-action-field">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="case-action-field">
            <label htmlFor="nextActionDate">Next Action Date</label>
            <input
              id="nextActionDate"
              name="nextActionDate"
              type="date"
              value={form.nextActionDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="case-action-field full-width">
          <label htmlFor="officerRemarks">Officer Remarks *</label>
          <textarea
            id="officerRemarks"
            name="officerRemarks"
            rows="5"
            value={form.officerRemarks}
            onChange={handleChange}
            placeholder="Record the action taken, verification details, follow-up requirements, or other relevant remarks..."
          />
        </div>

        {message && <div className="case-action-success">{message}</div>}
        {error && <div className="case-action-error">{error}</div>}

        <div className="case-action-footer">
          <p>
            AI output is advisory. The officer must independently verify the
            facts, evidence, and applicable law before recording official
            action.
          </p>

          <button type="submit" disabled={saving || loadingOfficer}>
            {saving
              ? editingId
                ? "Updating..."
                : "Saving..."
              : editingId
                ? "Update Case Action"
                : "Save Case Action"}
          </button>
        </div>
      </form>

      <div className="case-action-history">
        <div className="history-heading">
          <div>
            <span className="case-action-eyebrow">AUDIT TRAIL</span>
            <h3>Action History</h3>
          </div>
          <div className="history-heading-right">
            {historyLive && (
              <span className="history-live-indicator">
                <span className="history-live-dot" />
                Live
              </span>
            )}
            <span>{history.length} record(s)</span>
          </div>
        </div>

        {loadingHistory ? (
          <div className="history-empty">Loading action history...</div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            No police action has been recorded yet.
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => (
              <article className="history-item" key={item.id || index}>
                <div className="history-item-top">
                  <strong>{item.actionType}</strong>

                  <div className="history-item-actions">
                    <span className="history-status">{item.status}</span>

                    {item.id && (
                      <button
                        type="button"
                        className="history-edit-button"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="history-meta">
                  <span>
                    Officer: {item.officerName || "Name not available"}
                  </span>
                  <span>
                    Assigned: {item.assignedOfficer || "Not assigned"}
                  </span>
                  <span>Priority: {item.priority || "Medium"}</span>

                  {item.nextActionDate && (
                    <span>Next: {item.nextActionDate}</span>
                  )}
                </div>

                <p>{item.officerRemarks || "No remarks recorded."}</p>

                {item.createdAt && (
                  <small>
                    {typeof item.createdAt === "string"
                      ? new Date(item.createdAt).toLocaleString("en-IN")
                      : "Recorded"}
                  </small>
                )}

                {item.updatedAt && (
                  <small className="history-updated">
                    Updated:{" "}
                    {typeof item.updatedAt === "string"
                      ? new Date(item.updatedAt).toLocaleString("en-IN")
                      : "Recently"}
                  </small>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
