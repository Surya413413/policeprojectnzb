import React from "react";

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

const getEvidenceCounts = (visit) => {
  const voiceCount = Array.isArray(visit?.voiceEvidence)
    ? visit.voiceEvidence.length
    : visit?.voiceData
      ? 1
      : 0;

  const documentCount = Array.isArray(visit?.documentEvidence)
    ? visit.documentEvidence.length
    : visit?.documentData
      ? 1
      : 0;

  return {
    voiceCount,
    documentCount,
  };
};

const PoliceCaseSummary = ({ visit }) => {
  if (!visit) {
    return null;
  }

  const { voiceCount, documentCount } = getEvidenceCounts(visit);

  const caseStatus =
    visit.caseStatus || visit.caseAction?.status || "Not Started";

  const priority = visit.casePriority || visit.caseAction?.priority || "—";

  const latestAction = visit.caseAction?.actionType || "No action recorded";

  const assignedOfficer =
    visit.caseAction?.assignedOfficer ||
    visit.caseAction?.officerName ||
    "Not assigned";

  const hasAI =
    visit.aiStatus === "ANALYZED" ||
    Boolean(
      visit.aiProblemSummary ||
      visit.aiEvidenceSummary ||
      visit.aiLegalReferences ||
      visit.aiSuggestedActions,
    );

  return (
    <section className="police-case-summary">
      {/* HEADER */}
      <div className="case-summary-header">
        <div>
          <span className="case-summary-label">CASE OVERVIEW</span>

          <h2>Police Case Summary</h2>

          <p>
            Quick overview of the visitor's current case, evidence and police
            action.
          </p>
        </div>

        <span
          className={`case-summary-status ${String(caseStatus)
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          {caseStatus}
        </span>
      </div>

      {/* CASE INFORMATION */}
      <div className="case-summary-info-grid">
        <div className="case-summary-info-card">
          <span>Priority</span>
          <strong>{priority}</strong>
        </div>

        <div className="case-summary-info-card">
          <span>Assigned Officer</span>
          <strong>{assignedOfficer}</strong>
        </div>

        <div className="case-summary-info-card">
          <span>Latest Action</span>
          <strong>{latestAction}</strong>
        </div>

        <div className="case-summary-info-card">
          <span>AI Status</span>
          <strong>{hasAI ? "Analyzed" : "Not Analyzed"}</strong>
        </div>
      </div>

      {/* EVIDENCE */}
      <div className="case-summary-section">
        <div className="case-summary-section-title">
          <span>01</span>
          <div>
            <h3>Evidence</h3>
            <p>Evidence currently attached to this case.</p>
          </div>
        </div>

        <div className="case-summary-evidence-grid">
          <div className="case-summary-evidence-card">
            <div className="case-summary-evidence-icon">🎙</div>

            <div>
              <strong>{voiceCount}</strong>
              <span>Voice Statements</span>
            </div>
          </div>

          <div className="case-summary-evidence-card">
            <div className="case-summary-evidence-icon">📄</div>

            <div>
              <strong>{documentCount}</strong>
              <span>Documents</span>
            </div>
          </div>
        </div>
      </div>

      {/* REPORTED PROBLEM */}
      <div className="case-summary-section">
        <div className="case-summary-section-title">
          <span>02</span>
          <div>
            <h3>Reported Problem</h3>
            <p>Problem identified from the submitted evidence.</p>
          </div>
        </div>

        <div className="case-summary-content">
          {visit.aiProblemSummary ? (
            <p>{visit.aiProblemSummary}</p>
          ) : (
            <div className="case-summary-empty">
              AI analysis has not been completed yet.
            </div>
          )}
        </div>
      </div>

      {/* EVIDENCE SUMMARY */}
      <div className="case-summary-section">
        <div className="case-summary-section-title">
          <span>03</span>
          <div>
            <h3>Evidence Summary</h3>
            <p>Summary generated from the submitted evidence.</p>
          </div>
        </div>

        <div className="case-summary-content">
          {visit.aiEvidenceSummary ? (
            <p>{visit.aiEvidenceSummary}</p>
          ) : (
            <div className="case-summary-empty">
              No AI evidence summary available.
            </div>
          )}
        </div>
      </div>

      {/* LEGAL REFERENCES */}
      <div className="case-summary-section">
        <div className="case-summary-section-title">
          <span>04</span>
          <div>
            <h3>Potentially Relevant Legal Provisions</h3>
            <p>References identified by AI for officer verification.</p>
          </div>
        </div>

        <div className="case-summary-content legal">
          {visit.aiLegalReferences ? (
            <p>{visit.aiLegalReferences}</p>
          ) : (
            <div className="case-summary-empty">
              No legal references available.
            </div>
          )}
        </div>
      </div>

      {/* SUGGESTED ACTIONS */}
      <div className="case-summary-section">
        <div className="case-summary-section-title">
          <span>05</span>
          <div>
            <h3>Suggested Police Actions</h3>
            <p>AI-generated suggestions for officer review.</p>
          </div>
        </div>

        <div className="case-summary-content">
          {visit.aiSuggestedActions ? (
            <p>{visit.aiSuggestedActions}</p>
          ) : (
            <div className="case-summary-empty">
              No suggested actions available.
            </div>
          )}
        </div>
      </div>

      {/* AI INFORMATION */}
      <div className="case-summary-ai-footer">
        <div>
          <span>AI CONFIDENCE</span>

          <strong>{visit.aiConfidence || "Not specified"}</strong>
        </div>

        <div>
          <span>LAST ANALYZED</span>

          <strong>{formatDateTime(visit.aiAnalyzedAt)}</strong>
        </div>
      </div>

      {/* DISCLAIMER */}
      {hasAI && (
        <div className="case-summary-disclaimer">
          <strong>Officer Verification Required</strong>

          <p>
            AI output is provided as an assistance tool. Facts, evidence and
            potentially relevant legal provisions must be independently verified
            by the investigating officer.
          </p>
        </div>
      )}
    </section>
  );
};

export default PoliceCaseSummary;
