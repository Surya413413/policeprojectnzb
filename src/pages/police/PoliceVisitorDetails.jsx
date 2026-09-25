import React, { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import PoliceCaseEvidence from "./PoliceCaseEvidence";
import PoliceCaseSummary from "./PoliceCaseSummary";
import "../../styles/PoliceCaseSummary.css";
import PoliceCaseTimeline from "./PoliceCaseTimeline";
import "../../styles/PoliceCaseTimeline.css";
import {
  subscribeToVisitors,
  subscribeToAllVisits,
  checkoutVisit,
} from "../../services/gateService";

import {
  updateVisitor,
  deleteVisitor,
  updateVisit,
  deleteVisit,
} from "../../services/visitorService";

import "../../styles/PoliceVisitorDetails.css";

/* =====================================================
   DATE / TIME HELPERS
===================================================== */

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

const formatDate = (timestamp) => {
  if (!timestamp) return "—";

  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

/* =====================================================
   DOCUMENT HELPERS
===================================================== */

const formatFileSizeFromDataUrl = (dataUrl) => {
  if (!dataUrl) return "";

  try {
    const base64 = dataUrl.split(",")[1] || "";

    const bytes = Math.ceil((base64.length * 3) / 4);

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return "";
  }
};

const getDocumentIcon = (type = "", name = "") => {
  const value = `${type} ${name}`.toLowerCase();

  if (value.includes("pdf")) {
    return "PDF";
  }

  if (
    value.includes("image") ||
    value.includes("jpg") ||
    value.includes("jpeg") ||
    value.includes("png")
  ) {
    return "IMG";
  }

  return "FILE";
};

const getVoiceEvidence = (visit) => {
  if (Array.isArray(visit?.voiceEvidence) && visit.voiceEvidence.length)
    return visit.voiceEvidence;
  return visit?.voiceData
    ? [
        {
          id: "legacy-voice",
          name: "Voice Recording",
          data: visit.voiceData,
          type: "audio/webm",
        },
      ]
    : [];
};

const getDocumentEvidence = (visit) => {
  if (Array.isArray(visit?.documentEvidence) && visit.documentEvidence.length)
    return visit.documentEvidence;
  return visit?.documentData
    ? [
        {
          id: "legacy-document",
          name: visit.documentName || "Supporting Document",
          data: visit.documentData,
          type: visit.documentType || "application/octet-stream",
        },
      ]
    : [];
};

/* =====================================================
   POLICE VISITOR DETAILS
===================================================== */

const PoliceVisitorDetails = () => {
  const navigate = useNavigate();

  const { visitorId } = useParams();

  const [searchParams] = useSearchParams();

  const shouldEdit = searchParams.get("edit") === "true";

  /* =====================================================
     STATE
  ===================================================== */

  const [visitors, setVisitors] = useState([]);

  const [visits, setVisits] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [editingVisitor, setEditingVisitor] = useState(shouldEdit);

  const [visitorForm, setVisitorForm] = useState({
    fullName: "",
    mobileNumber: "",
    address: "",
  });

  const [editingVisitId, setEditingVisitId] = useState(null);

  const [visitForm, setVisitForm] = useState({
    purpose: "",
    status: "",
  });

  /* =====================================================
     REAL-TIME VISITORS
  ===================================================== */

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Visitor subscription error:", err);

        setError("Unable to load visitor information.");

        setLoading(false);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  /* =====================================================
     REAL-TIME VISITS
  ===================================================== */

  useEffect(() => {
    const unsubscribe = subscribeToAllVisits(
      (data) => {
        setVisits(data || []);
      },
      (err) => {
        console.error("Visit subscription error:", err);

        setError("Unable to load visit history.");
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  /* =====================================================
     CURRENT VISITOR
  ===================================================== */

  const visitor = useMemo(() => {
    return visitors.find((item) => item.id === visitorId);
  }, [visitors, visitorId]);

  /* =====================================================
     VISITOR VISITS
  ===================================================== */

  const visitorVisits = useMemo(() => {
    return visits
      .filter((visit) => visit.visitorId === visitorId)
      .sort((a, b) => {
        const aTime = a.entryTime?.toMillis?.() || 0;

        const bTime = b.entryTime?.toMillis?.() || 0;

        return bTime - aTime;
      });
  }, [visits, visitorId]);

  /* =====================================================
     ACTIVE VISIT
  ===================================================== */

  const activeVisit = useMemo(() => {
    return visitorVisits.find((visit) => visit.status === "INSIDE");
  }, [visitorVisits]);

  /* =====================================================
     LATEST VISIT
  ===================================================== */

  const latestVisit = useMemo(() => {
    if (!visitorVisits || visitorVisits.length === 0) {
      return null;
    }

    return visitorVisits[0];
  }, [visitorVisits]);

  /* =====================================================
     SET VISITOR FORM
  ===================================================== */

  useEffect(() => {
    if (!visitor) return;

    setVisitorForm({
      fullName: visitor.fullName || "",

      mobileNumber: visitor.mobileNumber || "",

      address: visitor.address || "",
    });
  }, [visitor]);

  /* =====================================================
     CLEAR MESSAGES
  ===================================================== */

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  /* =====================================================
     VISITOR FORM CHANGE
  ===================================================== */

  const handleVisitorChange = (event) => {
    const { name, value } = event.target;

    setVisitorForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     SAVE VISITOR
  ===================================================== */

  const handleSaveVisitor = async () => {
    clearMessages();

    if (!visitor) return;

    if (!visitorForm.fullName.trim()) {
      setError("Visitor name is required.");
      return;
    }

    if (!visitorForm.mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }

    try {
      setSaving(true);

      await updateVisitor(visitor.id, visitorForm);

      setEditingVisitor(false);

      setSuccess("Visitor information updated successfully.");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to update visitor.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE VISITOR
  ===================================================== */

  const handleDeleteVisitor = async () => {
    clearMessages();

    if (!visitor) return;

    const confirmed = window.confirm(
      `Delete ${visitor.fullName || "this visitor"}?\n\n` +
        "This will permanently delete:\n" +
        "• Visitor information\n" +
        "• Visitor photo\n" +
        "• All visit records\n" +
        "• Voice recordings attached to visits\n" +
        "• Supporting documents attached to visits\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await deleteVisitor(visitor.id);

      navigate("/police/visitors");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to delete visitor.");

      setDeleting(false);
    }
  };

  /* =====================================================
     START VISIT EDIT
  ===================================================== */

  const handleEditVisit = (visit) => {
    clearMessages();

    setEditingVisitId(visit.id);

    setVisitForm({
      purpose: visit.purpose || "",

      status: visit.status || "",
    });
  };

  /* =====================================================
     CANCEL VISIT EDIT
  ===================================================== */

  const handleCancelVisitEdit = () => {
    setEditingVisitId(null);

    setVisitForm({
      purpose: "",
      status: "",
    });
  };

  /* =====================================================
     SAVE VISIT
  ===================================================== */

  const handleSaveVisit = async () => {
    clearMessages();

    if (!editingVisitId) {
      return;
    }

    if (!visitForm.purpose) {
      setError("Visit purpose is required.");
      return;
    }

    try {
      setSaving(true);

      await updateVisit(editingVisitId, {
        purpose: visitForm.purpose,

        status: visitForm.status,
      });

      setEditingVisitId(null);

      setSuccess("Visit information updated successfully.");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to update visit.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     CHECKOUT
  ===================================================== */

  const handleCheckout = async (visit) => {
    clearMessages();

    if (!visit?.id) return;

    const confirmed = window.confirm("Checkout this visitor?");

    if (!confirmed) return;

    try {
      setSaving(true);

      await checkoutVisit(visit.id);

      setSuccess("Visitor checked out successfully.");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to checkout visitor.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE VISIT
  ===================================================== */

  const handleDeleteVisit = async (visit) => {
    clearMessages();

    if (!visit?.id) return;

    const confirmed = window.confirm(
      "Delete this visit record?\n\n" +
        "The visit, voice recording and supporting document attached to this visit will be deleted.",
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await deleteVisit(visit.id);

      setSuccess("Visit record deleted successfully.");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to delete visit.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     OPEN DOCUMENT
  ===================================================== */

  const handleOpenDocument = (documentEvidence) => {
    if (!documentEvidence?.data) {
      setError("Supporting document is not available.");
      return;
    }

    try {
      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        setError("Please allow pop-ups to open the document.");
        return;
      }

      if ((documentEvidence.type || "").includes("image")) {
        newWindow.document.write(
          `<html><head><title>${documentEvidence.name || "Document"}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f7fb}img{max-width:95vw;max-height:95vh;object-fit:contain}</style></head><body><img src="${documentEvidence.data}" alt="Supporting document" /></body></html>`,
        );
        newWindow.document.close();
      } else {
        newWindow.location.href = documentEvidence.data;
      }
    } catch (err) {
      console.error(err);
      setError("Unable to open supporting document.");
    }
  };

  /* =====================================================
     DOWNLOAD DOCUMENT
  ===================================================== */

  const handleDownloadDocument = (documentEvidence) => {
    if (!documentEvidence?.data) {
      setError("Supporting document is not available.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = documentEvidence.data;
      link.download = documentEvidence.name || "supporting-document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Unable to download document.");
    }
  };

  /* =====================================================
     EVIDENCE UPDATED
  ===================================================== */

  const handleEvidenceUpdated = (updatedVisit) => {
    clearMessages();

    if (updatedVisit?.id) {
      setVisits((previousVisits) =>
        previousVisits.map((item) =>
          item.id === updatedVisit.id
            ? {
                ...item,
                ...updatedVisit,
              }
            : item,
        ),
      );
    }

    setSuccess("Case information updated successfully.");
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="police-visitor-details-page">
        <div className="police-details-loading">Loading visitor details...</div>
      </div>
    );
  }

  /* =====================================================
     VISITOR NOT FOUND
  ===================================================== */

  if (!visitor) {
    return (
      <div className="police-visitor-details-page">
        <div className="police-details-header">
          <button
            className="details-back-button"
            onClick={() => navigate("/police/visitors")}
          >
            ← All Visitors
          </button>
        </div>

        <div className="police-details-error-card">
          <h2>Visitor Not Found</h2>

          <p>The visitor record could not be found or may have been deleted.</p>

          <button onClick={() => navigate("/police/visitors")}>
            Back to Visitors
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="police-visitor-details-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="police-details-header">
        <div>
          <button
            className="details-back-button"
            onClick={() => navigate("/police/visitors")}
          >
            ← All Visitors
          </button>

          <h1>Visitor Details</h1>

          <p>Complete visitor and visit information.</p>
        </div>

        <div className="details-header-actions">
          <button
            className="details-edit-button"
            onClick={() => {
              clearMessages();

              setEditingVisitor((previous) => !previous);
            }}
          >
            {editingVisitor ? "Cancel Edit" : "Edit Visitor"}
          </button>

          <button
            className="details-delete-button"
            onClick={handleDeleteVisitor}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Visitor"}
          </button>
        </div>
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {success && <div className="police-details-success">{success}</div>}

      {error && (
        <div className="police-details-error">
          {error}

          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* =================================================
          VISITOR PROFILE
      ================================================= */}

      <div className="visitor-details-grid">
        {/* PHOTO */}

        <div className="visitor-profile-card">
          <div className="visitor-large-photo-wrapper">
            {visitor.photoData ? (
              <img
                src={visitor.photoData}
                alt={visitor.fullName}
                className="visitor-large-photo"
              />
            ) : (
              <div className="visitor-large-placeholder">
                {visitor.fullName?.charAt(0)?.toUpperCase() || "V"}
              </div>
            )}
          </div>

          <div className="visitor-profile-code">
            {visitor.visitorCode || "—"}
          </div>

          <div
            className={`visitor-profile-status ${
              activeVisit ? "inside" : "exited"
            }`}
          >
            {activeVisit ? "Currently Inside" : "Not Inside"}
          </div>
        </div>

        {/* INFORMATION */}

        <div className="visitor-information-card">
          <div className="details-section-title">
            <span>01</span>

            <div>
              <h2>Visitor Information</h2>

              <p>Personal details registered in the system.</p>
            </div>
          </div>

          {editingVisitor ? (
            <div className="visitor-edit-form">
              <div className="details-form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="fullName"
                  value={visitorForm.fullName}
                  onChange={handleVisitorChange}
                />
              </div>

              <div className="details-form-group">
                <label>Mobile Number</label>

                <input
                  type="tel"
                  name="mobileNumber"
                  value={visitorForm.mobileNumber}
                  onChange={handleVisitorChange}
                />
              </div>

              <div className="details-form-group details-full-width">
                <label>Address</label>

                <textarea
                  name="address"
                  value={visitorForm.address}
                  onChange={handleVisitorChange}
                  rows="4"
                />
              </div>

              <div className="details-form-actions">
                <button
                  className="details-cancel-button"
                  onClick={() => setEditingVisitor(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="details-save-button"
                  onClick={handleSaveVisitor}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="visitor-info-list">
              <div className="visitor-info-item">
                <span>Full Name</span>

                <strong>{visitor.fullName || "—"}</strong>
              </div>

              <div className="visitor-info-item">
                <span>Mobile Number</span>

                <strong>{visitor.mobileNumber || "—"}</strong>
              </div>

              <div className="visitor-info-item details-full-width">
                <span>Address</span>

                <strong>{visitor.address || "Not provided"}</strong>
              </div>

              <div className="visitor-info-item">
                <span>Visitor Code</span>

                <strong className="details-code">
                  {visitor.visitorCode || "—"}
                </strong>
              </div>

              <div className="visitor-info-item">
                <span>Registered On</span>

                <strong>{formatDate(visitor.createdAt)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          CURRENT VISIT
      ================================================= */}

      {activeVisit && (
        <div className="active-visit-card">
          <div className="active-visit-header">
            <div>
              <span className="active-badge">● INSIDE</span>

              <h2>Current Visit</h2>

              <p>This visitor is currently inside the premises.</p>
            </div>

            <button
              className="checkout-visit-button"
              onClick={() => handleCheckout(activeVisit)}
              disabled={saving}
            >
              Checkout Visitor
            </button>
          </div>

          <div className="current-visit-grid">
            <div>
              <span>Visit Code</span>

              <strong>{activeVisit.visitCode || "—"}</strong>
            </div>

            <div>
              <span>Purpose</span>

              <strong>{activeVisit.purpose || "—"}</strong>
            </div>

            <div>
              <span>Entry Time</span>

              <strong>{formatDateTime(activeVisit.entryTime)}</strong>
            </div>

            <div>
              <span>Registered By</span>

              <strong>{activeVisit.registeredBy || "—"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          POLICE CASE EVIDENCE
          
          IMPORTANT:
          Voice + document are collected HERE,
          NOT in Watchman registration.

          Case Evidence is attached to the latest
          visit so it remains available even after
          the visitor has checked out.
      ================================================= */}

      {latestVisit && (
        <section className="police-case-status-strip">
          <div>
            <span>CASE STATUS</span>
            <strong>
              {latestVisit.caseStatus ||
                latestVisit.caseAction?.status ||
                "No Case Action"}
            </strong>
          </div>
          <div>
            <span>PRIORITY</span>
            <strong>
              {latestVisit.casePriority ||
                latestVisit.caseAction?.priority ||
                "—"}
            </strong>
          </div>
          <div>
            <span>ASSIGNED OFFICER</span>
            <strong>
              {latestVisit.caseAction?.assignedOfficer ||
                latestVisit.caseAction?.officerName ||
                "Not assigned"}
            </strong>
          </div>
          <div>
            <span>EVIDENCE</span>
            <strong>
              {getVoiceEvidence(latestVisit).length +
                getDocumentEvidence(latestVisit).length}
            </strong>
          </div>
          <div>
            <span>AI</span>
            <strong>
              {String(latestVisit.aiStatus || "").toUpperCase() === "ANALYZED"
                ? "Analyzed"
                : "Pending"}
            </strong>
          </div>
        </section>
      )}

      {latestVisit && <PoliceCaseSummary visit={latestVisit} />}

      {latestVisit && <PoliceCaseTimeline visit={latestVisit} />}

      {latestVisit && (
        <PoliceCaseEvidence
          visit={latestVisit}
          onUpdated={handleEvidenceUpdated}
        />
      )}

      {/* =================================================
          VISIT HISTORY
      ================================================= */}

      <div className="visit-history-card">
        <div className="details-section-title">
          <span>04</span>

          <div>
            <h2>Visit History</h2>

            <p>Complete record of this visitor's visits.</p>
          </div>
        </div>

        {visitorVisits.length === 0 ? (
          <div className="no-visit-history">No visit records found.</div>
        ) : (
          <div className="visit-history-list">
            {visitorVisits.map((visit, index) => {
              const isEditing = editingVisitId === visit.id;

              return (
                <div className="visit-history-item" key={visit.id}>
                  <div className="visit-history-number">{index + 1}</div>

                  <div className="visit-history-main">
                    {/* VISIT HEADER */}

                    <div className="visit-history-top">
                      <div>
                        <span className="visit-history-code">
                          {visit.visitCode || "Visit"}
                        </span>

                        <span
                          className={`visit-history-status ${
                            visit.status === "INSIDE" ? "inside" : "exited"
                          }`}
                        >
                          {visit.status || "UNKNOWN"}
                        </span>
                      </div>

                      <span className="visit-history-date">
                        {formatDateTime(visit.entryTime)}
                      </span>
                    </div>

                    {/* EDIT */}

                    {isEditing ? (
                      <div className="visit-edit-form">
                        <div className="details-form-group">
                          <label>Purpose</label>

                          <select
                            value={visitForm.purpose}
                            onChange={(event) =>
                              setVisitForm((previous) => ({
                                ...previous,

                                purpose: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select Purpose</option>

                            <option value="Petition / Complaint">
                              Petition / Complaint
                            </option>

                            <option value="Meeting">Meeting</option>

                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="details-form-group">
                          <label>Status</label>

                          <select
                            value={visitForm.status}
                            onChange={(event) =>
                              setVisitForm((previous) => ({
                                ...previous,

                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="INSIDE">INSIDE</option>

                            <option value="EXITED">EXITED</option>
                          </select>
                        </div>

                        <div className="visit-edit-actions">
                          <button
                            className="details-cancel-button"
                            onClick={handleCancelVisitEdit}
                            disabled={saving}
                          >
                            Cancel
                          </button>

                          <button
                            className="details-save-button"
                            onClick={handleSaveVisit}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save Visit"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* VISIT INFORMATION */}

                        <div className="visit-history-details">
                          <div>
                            <span>Purpose</span>

                            <strong>{visit.purpose || "—"}</strong>
                          </div>

                          <div>
                            <span>Entry</span>

                            <strong>{formatDateTime(visit.entryTime)}</strong>
                          </div>

                          <div>
                            <span>Exit</span>

                            <strong>
                              {visit.exitTime
                                ? formatDateTime(visit.exitTime)
                                : "Still Inside"}
                            </strong>
                          </div>

                          <div>
                            <span>Registered By</span>

                            <strong>{visit.registeredBy || "—"}</strong>
                          </div>
                        </div>

                        {/* EXISTING EVIDENCE */}

                        {(() => {
                          const voiceEvidence = getVoiceEvidence(visit);
                          const documentEvidence = getDocumentEvidence(visit);

                          if (!voiceEvidence.length && !documentEvidence.length)
                            return null;

                          return (
                            <div className="visit-history-attachments">
                              <div className="attachment-label">
                                Case Evidence
                              </div>
                              <div className="history-attachment-list">
                                {voiceEvidence.map((item, index) => (
                                  <div
                                    className="history-voice-card"
                                    key={item.id || `voice-${index}`}
                                  >
                                    <div className="history-attachment-heading">
                                      <span>🎙</span>
                                      <strong>
                                        {item.name ||
                                          `Voice Recording ${index + 1}`}
                                      </strong>
                                    </div>
                                    {item.data ? (
                                      <audio
                                        controls
                                        src={item.data}
                                        className="visit-audio-player"
                                      />
                                    ) : (
                                      <span>Voice recording unavailable.</span>
                                    )}
                                  </div>
                                ))}

                                {documentEvidence.map((item, index) => (
                                  <div
                                    className="history-document-card"
                                    key={item.id || `document-${index}`}
                                  >
                                    <div className="history-document-info">
                                      <div className="attachment-icon document small">
                                        {getDocumentIcon(item.type, item.name)}
                                      </div>
                                      <div>
                                        <strong>
                                          {item.name ||
                                            `Supporting Document ${index + 1}`}
                                        </strong>
                                        <span>
                                          {item.type || "Document"}
                                          {formatFileSizeFromDataUrl(item.data)
                                            ? ` • ${formatFileSizeFromDataUrl(item.data)}`
                                            : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="document-actions">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDocument(item)}
                                      >
                                        Open
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadDocument(item)
                                        }
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ACTIONS */}

                        <div className="visit-history-actions">
                          {visit.status === "INSIDE" && (
                            <button
                              className="visit-checkout-small"
                              onClick={() => handleCheckout(visit)}
                              disabled={saving}
                            >
                              Checkout
                            </button>
                          )}

                          <button
                            className="visit-edit-small"
                            onClick={() => handleEditVisit(visit)}
                            disabled={saving}
                          >
                            Edit
                          </button>

                          <button
                            className="visit-delete-small"
                            onClick={() => handleDeleteVisit(visit)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceVisitorDetails;
