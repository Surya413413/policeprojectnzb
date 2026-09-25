import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, query } from "firebase/firestore";

import { db } from "../../firebase/config";
import { subscribeToCaseActions } from "../../services/visitorService";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/CommissionerCaseDetails.css";

const toDate = (value) => {
  if (!value) return null;
  try {
    if (typeof value?.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatus = (visit) =>
  String(
    visit?.caseStatus || visit?.caseAction?.status || "Under Verification",
  ).trim();

const getPriority = (visit) =>
  String(visit?.casePriority || visit?.caseAction?.priority || "Medium").trim();

const getVoiceEvidence = (visit) => {
  if (Array.isArray(visit?.voiceEvidence) && visit.voiceEvidence.length) {
    return visit.voiceEvidence;
  }

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
  if (Array.isArray(visit?.documentEvidence) && visit.documentEvidence.length) {
    return visit.documentEvidence;
  }

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

const getDataUrl = (item) => {
  if (!item?.data) return "";
  if (item.data.startsWith("data:")) return item.data;
  return `data:${item.type || "application/octet-stream"};base64,${item.data}`;
};

const getFileUrl = (item) => {
  if (!item?.data) return "";
  if (item.data.startsWith("data:")) return item.data;
  return getDataUrl(item);
};

function CommissionerCaseDetails() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [visit, setVisit] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visitId) {
      setError(t("case.caseIdMissing"));
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "visits", visitId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setVisit(null);
          setError(t("case.caseRecordNotFound"));
          setLoading(false);
          return;
        }

        setVisit({ id: snapshot.id, ...snapshot.data() });
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Commissioner case listener error:", snapshotError);
        setError(t("case.unableToLoadCase"));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [visitId]);

  useEffect(() => {
    if (!visit?.visitorId) {
      setVisitor(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "visitors", visit.visitorId),
      (snapshot) => {
        setVisitor(
          snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        );
      },
      (snapshotError) => {
        console.error("Commissioner visitor listener error:", snapshotError);
      },
    );

    return () => unsubscribe();
  }, [visit?.visitorId]);

  useEffect(() => {
    if (!visitId) {
      setHistory([]);
      setHistoryLoading(false);
      return undefined;
    }

    setHistoryLoading(true);

    const unsubscribe = subscribeToCaseActions(
      visitId,
      (actions) => {
        setHistory(actions || []);
        setHistoryLoading(false);
      },
      (historyError) => {
        console.error("Commissioner case timeline error:", historyError);
        setHistoryLoading(false);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [visitId]);

  const voiceEvidence = useMemo(() => getVoiceEvidence(visit), [visit]);

  const documentEvidence = useMemo(() => getDocumentEvidence(visit), [visit]);

  const action = visit?.caseAction || {};

  if (loading) {
    return (
      <div className="commissioner-case-details-page">
        <div className="commissioner-case-details-loading">
          {t("case.loadingCase")}
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="commissioner-case-details-page">
        <div className="commissioner-case-details-main">
          <div className="commissioner-case-details-error">
            {error || t("case.caseNotFound")}
          </div>
          <button
            type="button"
            className="commissioner-back-button"
            onClick={() => navigate("/commissioner/cases")}
          >
            ← {t("case.backToCases")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="commissioner-case-details-page">
      <header className="commissioner-case-details-header">
        <div>
          <span>{t("commissioner.portal")}</span>
          <h1>{t("case.details")}</h1>
          <p>{t("case.readOnlyReview")}</p>
        </div>

        <button
          type="button"
          className="commissioner-back-button"
          onClick={() => navigate("/commissioner/cases")}
        >
          ← {t("case.backToCases")}
        </button>
      </header>

      <main className="commissioner-case-details-main">
        {error && (
          <div className="commissioner-case-details-error">{error}</div>
        )}

        <section className="commissioner-case-hero">
          <div>
            <span>{t("case.record")}</span>
            <h2>{visitor?.fullName || t("commissioner.unknownVisitor")}</h2>
            <p>
              {visitor?.mobileNumber ||
                visit.visitorCode ||
                t("commissioner.noVisitorContact")}
            </p>
          </div>

          <div className="commissioner-case-hero-badges">
            <span className="commissioner-case-badge">{getStatus(visit)}</span>
            <span
              className={`commissioner-case-badge priority-${getPriority(visit)
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {getPriority(visit)}
            </span>
          </div>
        </section>

        <section className="commissioner-details-grid">
          <div>
            <span>{t("case.visitorCode")}</span>
            <strong>{visit.visitorCode || "—"}</strong>
          </div>
          <div>
            <span>{t("case.visitPurpose")}</span>
            <strong>{visit.purpose || "—"}</strong>
          </div>
          <div>
            <span>{t("case.entryTime")}</span>
            <strong>{formatDateTime(visit.entryTime)}</strong>
          </div>
          <div>
            <span>{t("case.exitTime")}</span>
            <strong>{formatDateTime(visit.exitTime)}</strong>
          </div>
          <div>
            <span>{t("case.assignedOfficer")}</span>
            <strong>
              {action.assignedOfficer ||
                action.officerName ||
                t("case.unassigned")}
            </strong>
          </div>
          <div>
            <span>{t("case.evidenceItems")}</span>
            <strong>{voiceEvidence.length + documentEvidence.length}</strong>
          </div>
          <div>
            <span>{t("case.aiStatus")}</span>
            <strong>{String(visit.aiStatus || "PENDING").toUpperCase()}</strong>
          </div>
          <div>
            <span>{t("case.lastUpdated")}</span>
            <strong>
              {formatDateTime(visit.updatedAt || visit.entryTime)}
            </strong>
          </div>
        </section>

        <section className="commissioner-detail-card">
          <div className="commissioner-detail-card-header">
            <div>
              <span>{t("case.visitorInformation")}</span>
              <h3>{t("case.registeredVisitor")}</h3>
            </div>
          </div>

          <div className="commissioner-visitor-info">
            <div>
              <span>{t("case.fullName")}</span>
              <strong>{visitor?.fullName || "—"}</strong>
            </div>
            <div>
              <span>{t("case.mobile")}</span>
              <strong>{visitor?.mobileNumber || "—"}</strong>
            </div>
            <div>
              <span>{t("case.address")}</span>
              <strong>{visitor?.address || "—"}</strong>
            </div>
          </div>
        </section>

        <section className="commissioner-detail-card">
          <div className="commissioner-detail-card-header">
            <div>
              <span>{t("case.aiCaseAnalysis")}</span>
              <h3>{t("case.administrativeReview")}</h3>
            </div>
            <span className="commissioner-readonly">{t("case.readOnly")}</span>
          </div>

          <div className="commissioner-analysis-grid">
            <article>
              <span>{t("case.problemSummary")}</span>
              <p>{visit.aiProblemSummary || t("case.noAiProblemSummary")}</p>
            </article>

            <article>
              <span>{t("case.evidenceSummary")}</span>
              <p>{visit.aiEvidenceSummary || t("case.noAiEvidenceSummary")}</p>
            </article>

            <article>
              <span>{t("case.legalProvisions")}</span>
              <p>{visit.aiLegalProvisions || t("case.noLegalProvisions")}</p>
            </article>

            <article>
              <span>{t("case.suggestedActions")}</span>
              <p>{visit.aiSuggestedActions || t("case.noSuggestedActions")}</p>
            </article>
          </div>

          <div className="commissioner-ai-footer">
            <span>
              {t("case.confidence")}:{" "}
              {visit.aiConfidence || t("case.notRecorded")}
            </span>
            <span>
              {t("case.lastAnalyzed")}: {formatDateTime(visit.aiAnalyzedAt)}
            </span>
          </div>

          <div className="commissioner-ai-disclaimer">
            AI output is for administrative review. Police officers must
            independently verify facts, evidence and applicable law.
          </div>
        </section>

        <section className="commissioner-detail-card">
          <div className="commissioner-detail-card-header">
            <div>
              <span>{t("case.evidence")}</span>
              <h3>{t("case.voiceStatements")}</h3>
            </div>
            <span>
              {voiceEvidence.length} {t("case.recordings")}
            </span>
          </div>

          {voiceEvidence.length === 0 ? (
            <div className="commissioner-empty-block">
              {t("case.noVoiceEvidence")}
            </div>
          ) : (
            <div className="commissioner-evidence-list">
              {voiceEvidence.map((item, index) => (
                <div
                  className="commissioner-evidence-item"
                  key={item.id || index}
                >
                  <div>
                    <strong>
                      {item.name || `Voice Recording ${index + 1}`}
                    </strong>
                    <small>{item.source || t("case.policeEvidence")}</small>
                  </div>
                  {item.data ? (
                    <audio controls src={getDataUrl(item)} />
                  ) : (
                    <span>{t("case.fileUnavailable")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="commissioner-detail-card">
          <div className="commissioner-detail-card-header">
            <div>
              <span>{t("case.evidence")}</span>
              <h3>{t("case.supportingDocuments")}</h3>
            </div>
            <span>
              {documentEvidence.length} {t("case.documents")}
            </span>
          </div>

          {documentEvidence.length === 0 ? (
            <div className="commissioner-empty-block">
              {t("case.noSupportingDocuments")}
            </div>
          ) : (
            <div className="commissioner-evidence-list">
              {documentEvidence.map((item, index) => (
                <div
                  className="commissioner-evidence-item"
                  key={item.id || index}
                >
                  <div>
                    <strong>
                      {item.name || `Supporting Document ${index + 1}`}
                    </strong>
                    <small>
                      {item.type || "Document"} ·{" "}
                      {item.source || t("case.policeEvidence")}
                    </small>
                  </div>

                  <div className="commissioner-evidence-actions">
                    {item.data ? (
                      <>
                        <a
                          href={getFileUrl(item)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <a
                          href={getFileUrl(item)}
                          download={item.name || `document-${index + 1}`}
                        >
                          Download
                        </a>
                      </>
                    ) : (
                      <span>{t("case.fileUnavailable")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="commissioner-detail-card">
          <div className="commissioner-detail-card-header">
            <div>
              <span>{t("case.actionTimeline")}</span>
              <h3>{t("case.policeActivityHistory")}</h3>
            </div>
            <span>{history.length} t("case.actions")</span>
          </div>

          {historyLoading ? (
            <div className="commissioner-empty-block">
              t("case.loadingTimeline")
            </div>
          ) : history.length === 0 ? (
            <div className="commissioner-empty-block">
              {t("case.noCaseActions")}
            </div>
          ) : (
            <div className="commissioner-timeline">
              {history.map((item) => (
                <article key={item.id}>
                  <div className="commissioner-timeline-dot" />
                  <div className="commissioner-timeline-content">
                    <div className="commissioner-timeline-top">
                      <strong>{item.actionType || t("case.caseAction")}</strong>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>

                    <div className="commissioner-timeline-meta">
                      <span>t("case.status") + ": "{item.status || "—"}</span>
                      <span>
                        t("case.priority") + ": "{item.priority || "—"}
                      </span>
                      <span>
                        Officer:{" "}
                        {item.assignedOfficer || item.officerName || "—"}
                      </span>
                    </div>

                    <p>{item.officerRemarks || t("case.noOfficerRemarks")}</p>

                    {item.nextActionDate && (
                      <small>
                        t("case.nextAction") + ": "{item.nextActionDate}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CommissionerCaseDetails;
