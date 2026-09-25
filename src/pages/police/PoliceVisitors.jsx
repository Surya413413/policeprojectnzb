import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  subscribeToAllVisits,
  subscribeToVisitors,
} from "../../services/gateService";

import { deleteVisitor } from "../../services/visitorService";

import "../../styles/PoliceVisitors.css";

function PoliceVisitors() {
  const navigate = useNavigate();

  const [visitors, setVisitors] = useState([]);
  const [visits, setVisits] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [caseFilter, setCaseFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deletingId, setDeletingId] = useState("");

  // ==========================================
  // LOAD VISITORS
  // ==========================================

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data);
        setLoading(false);
      },
      (error) => {
        console.error("Police visitors error:", error);

        setError("Unable to load visitors.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // LOAD VISITS
  // ==========================================

  useEffect(() => {
    const unsubscribe = subscribeToAllVisits(
      (data) => {
        setVisits(data);
      },
      (error) => {
        console.error("Police visits error:", error);

        setError("Unable to load visitor visits.");
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // VISITOR INFORMATION
  // ==========================================

  const getVisitorVisits = (visitorId) => {
    return visits.filter((visit) => visit.visitorId === visitorId);
  };

  const getLatestVisit = (visitorId) => {
    const visitorVisits = getVisitorVisits(visitorId);

    if (!visitorVisits.length) {
      return null;
    }

    return visitorVisits[0];
  };

  const getCurrentStatus = (visitorId) => {
    const visitorVisits = getVisitorVisits(visitorId);

    const activeVisit = visitorVisits.find(
      (visit) => visit.status === "INSIDE",
    );

    return activeVisit ? "INSIDE" : "EXITED";
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredVisitors = useMemo(() => {
    const value = search.trim().toLowerCase();

    return visitors.filter((visitor) => {
      const visitorVisits = getVisitorVisits(visitor.id);
      const activeVisit = visitorVisits.find(
        (visit) => visit.status === "INSIDE",
      );
      const latestVisit = visitorVisits[0];
      const status = activeVisit ? "INSIDE" : "EXITED";

      const hasAI = visitorVisits.some(
        (visit) => visit.aiStatus === "ANALYZED" || visit.aiProblemSummary,
      );

      const hasPendingAction = visitorVisits.some(
        (visit) =>
          visit.caseAction &&
          visit.caseAction.status &&
          !["Closed"].includes(visit.caseAction.status),
      );

      const matchesSearch =
        !value ||
        visitor.fullName?.toLowerCase().includes(value) ||
        visitor.mobileNumber?.toLowerCase().includes(value) ||
        visitor.visitorCode?.toLowerCase().includes(value);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      const matchesCase =
        caseFilter === "ALL" ||
        (caseFilter === "AI_ANALYZED" && hasAI) ||
        (caseFilter === "PENDING_ACTION" && hasPendingAction);

      return matchesSearch && matchesStatus && matchesCase;
    });
  }, [visitors, visits, search, statusFilter, caseFilter]);

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "--";
    }

    try {
      return timestamp.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "--";
    }
  };

  // ==========================================
  // VISITOR COUNT
  // ==========================================

  const getVisitCount = (visitorId) => {
    return getVisitorVisits(visitorId).length;
  };

  // ==========================================
  // EDIT VISITOR
  // ==========================================

  const handleEditVisitor = (visitorId) => {
    setError("");
    setSuccess("");

    navigate(`/police/visitors/${visitorId}?edit=true`);
  };

  // ==========================================
  // VIEW VISITOR
  // ==========================================

  const handleViewVisitor = (visitorId) => {
    setError("");
    setSuccess("");

    navigate(`/police/visitors/${visitorId}`);
  };

  // ==========================================
  // DELETE VISITOR
  // ==========================================

  const handleDeleteVisitor = async (visitor) => {
    const visitorName = visitor.fullName || "this visitor";

    const confirmed = window.confirm(
      `Delete ${visitorName}?\n\n` +
        "This will permanently delete the visitor and all associated visit records.\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(visitor.id);

      setError("");
      setSuccess("");

      await deleteVisitor(visitor.id);

      setSuccess(`${visitorName} was deleted successfully.`);
    } catch (error) {
      console.error("Delete visitor error:", error);

      setError(error?.message || "Unable to delete visitor. Please try again.");
    } finally {
      setDeletingId("");
    }
  };

  // ==========================================
  // CLEAR SEARCH
  // ==========================================

  const handleClearSearch = () => {
    setSearch("");
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="police-visitors-page">
      {/* HEADER */}

      <div className="police-visitors-header">
        <div>
          <button className="back-button" onClick={() => navigate("/police")}>
            ← Dashboard
          </button>

          <h1>All Visitors</h1>

          <p>View, search and manage registered visitors</p>
        </div>

        <div className="visitor-header-actions">
          <button
            type="button"
            className="police-register-button"
            onClick={() => navigate("/police/register")}
          >
            + Register Visitor
          </button>

          <div className="visitor-total">
            <span>Total Visitors</span>

            <strong>{visitors.length}</strong>
          </div>
        </div>
      </div>

      {/* SEARCH */}

      <div className="visitor-search-box">
        <input
          type="text"
          placeholder="Search by name, mobile number or visitor code..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {search && (
          <button type="button" onClick={handleClearSearch}>
            Clear
          </button>
        )}
      </div>

      {/* FILTERS */}

      <div className="visitor-filter-bar">
        <div className="visitor-filter-group">
          <span>Status</span>
          <button
            type="button"
            className={statusFilter === "ALL" ? "active" : ""}
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={statusFilter === "INSIDE" ? "active" : ""}
            onClick={() => setStatusFilter("INSIDE")}
          >
            Inside
          </button>
          <button
            type="button"
            className={statusFilter === "EXITED" ? "active" : ""}
            onClick={() => setStatusFilter("EXITED")}
          >
            Exited
          </button>
        </div>

        <div className="visitor-filter-group">
          <span>Case</span>
          <button
            type="button"
            className={caseFilter === "ALL" ? "active" : ""}
            onClick={() => setCaseFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={caseFilter === "PENDING_ACTION" ? "active" : ""}
            onClick={() => setCaseFilter("PENDING_ACTION")}
          >
            Pending Action
          </button>
          <button
            type="button"
            className={caseFilter === "AI_ANALYZED" ? "active" : ""}
            onClick={() => setCaseFilter("AI_ANALYZED")}
          >
            AI Analyzed
          </button>
        </div>
      </div>

      {/* SUCCESS */}

      {success && <div className="police-success">{success}</div>}

      {/* ERROR */}

      {error && <div className="police-error">{error}</div>}

      {/* LOADING */}

      {loading ? (
        <div className="police-loading">Loading visitors...</div>
      ) : (
        <div className="visitors-table-wrapper">
          <table className="police-visitors-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visitor Code</th>
                <th>Mobile</th>
                <th>Total Visits</th>
                <th>Last Visit</th>
                <th>Status</th>
                <th>Case</th>
                <th>Evidence</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-visitors">
                    {search
                      ? "No visitors match your search."
                      : "No visitors found."}
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => {
                  const latestVisit = getLatestVisit(visitor.id);

                  const status = getCurrentStatus(visitor.id);
                  const latestCaseVisit = latestVisit;
                  const caseStatus =
                    latestCaseVisit?.caseAction?.status ||
                    (latestCaseVisit?.aiStatus === "ANALYZED"
                      ? "AI Analyzed"
                      : "No Action");

                  const voiceCount = Array.isArray(
                    latestCaseVisit?.voiceEvidence,
                  )
                    ? latestCaseVisit.voiceEvidence.length
                    : latestCaseVisit?.voiceData
                      ? 1
                      : 0;

                  const documentCount = Array.isArray(
                    latestCaseVisit?.documentEvidence,
                  )
                    ? latestCaseVisit.documentEvidence.length
                    : latestCaseVisit?.documentData
                      ? 1
                      : 0;

                  const isDeleting = deletingId === visitor.id;

                  return (
                    <tr key={visitor.id}>
                      {/* VISITOR */}

                      <td>
                        <div className="police-visitor-info">
                          {visitor.photoData ? (
                            <img
                              src={visitor.photoData}
                              alt={visitor.fullName || "Visitor"}
                              className="police-visitor-photo"
                            />
                          ) : (
                            <div className="police-visitor-placeholder">
                              {visitor.fullName?.charAt(0).toUpperCase() || "V"}
                            </div>
                          )}

                          <div>
                            <strong>{visitor.fullName}</strong>

                            <span>Registered</span>
                          </div>
                        </div>
                      </td>

                      {/* CODE */}

                      <td>
                        <span className="visitor-code">
                          {visitor.visitorCode || "--"}
                        </span>
                      </td>

                      {/* MOBILE */}

                      <td>{visitor.mobileNumber || "--"}</td>

                      {/* VISITS */}

                      <td>{getVisitCount(visitor.id)}</td>

                      {/* LAST VISIT */}

                      <td>{formatDate(latestVisit?.entryTime)}</td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`visitor-status ${
                            status === "INSIDE" ? "inside" : "exited"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* CASE */}

                      <td>
                        <span
                          className={`visitor-case-status ${
                            caseStatus === "Closed"
                              ? "closed"
                              : caseStatus === "No Action"
                                ? "none"
                                : "active"
                          }`}
                        >
                          {caseStatus}
                        </span>
                      </td>

                      {/* EVIDENCE */}

                      <td>
                        <div className="visitor-evidence-summary">
                          <span>🎙 {voiceCount}</span>
                          <span>📄 {documentCount}</span>
                          {latestCaseVisit?.aiStatus === "ANALYZED" && (
                            <span className="ai-mini-badge">AI</span>
                          )}
                        </div>
                      </td>

                      {/* ACTION */}

                      <td>
                        <div className="visitor-action-buttons">
                          {/* VIEW */}

                          <button
                            type="button"
                            className="view-visitor-button"
                            onClick={() => handleViewVisitor(visitor.id)}
                          >
                            View
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            className="edit-visitor-button"
                            onClick={() => handleEditVisitor(visitor.id)}
                            disabled={isDeleting}
                          >
                            Edit
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            className="delete-visitor-button"
                            onClick={() => handleDeleteVisitor(visitor)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RESULT COUNT */}

      {!loading && (
        <div className="visitor-result-count">
          Showing <strong>{filteredVisitors.length}</strong> of{" "}
          <strong>{visitors.length}</strong> visitors
        </div>
      )}
    </div>
  );
}

export default PoliceVisitors;
