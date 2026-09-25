import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";

import { db } from "../../firebase/config";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/CommissionerCases.css";

const toDate = (value) => {
  if (!value) return null;

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

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

const getCaseStatus = (visit) =>
  String(
    visit?.caseStatus || visit?.caseAction?.status || "Under Verification",
  ).trim();

const getCasePriority = (visit) =>
  String(visit?.casePriority || visit?.caseAction?.priority || "Medium").trim();

const isCase = (visit) =>
  Boolean(
    visit?.caseStatus ||
    visit?.caseAction ||
    visit?.aiStatus ||
    visit?.aiProblemSummary ||
    visit?.voiceEvidence?.length ||
    visit?.documentEvidence?.length ||
    visit?.voiceData ||
    visit?.documentData,
  );

const isClosed = (visit) => getCaseStatus(visit).toLowerCase() === "closed";

const getEvidenceCount = (visit) => {
  const voices = Array.isArray(visit?.voiceEvidence)
    ? visit.voiceEvidence.length
    : visit?.voiceData
      ? 1
      : 0;

  const documents = Array.isArray(visit?.documentEvidence)
    ? visit.documentEvidence.length
    : visit?.documentData
      ? 1
      : 0;

  return voices + documents;
};

function CommissionerCases() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [visitors, setVisitors] = useState([]);
  const [visits, setVisits] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");

  const [selectedVisit, setSelectedVisit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     STATUS TRANSLATION
  ========================================================= */

  const translateStatus = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    const statusMap = {
      all: t("case.allStatus"),
      new: t("case.newStatus"),
      "under verification": t("commissioner.newUnderVerification"),
      "evidence collection": t("commissioner.evidenceCollection"),
      referred: t("commissioner.referred"),
      "complaint registered": t("case.complaintRegistered"),
      "fir registered": t("case.firRegistered"),
      closed: t("commissioner.closed"),
    };

    return statusMap[normalized] || value || "—";
  };

  /* =========================================================
     PRIORITY TRANSLATION
  ========================================================= */

  const translatePriority = (value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    const priorityMap = {
      all: t("case.allPriority"),
      low: t("case.low"),
      medium: t("case.medium"),
      high: t("case.high"),
      urgent: t("case.urgent"),
    };

    return priorityMap[normalized] || value || "—";
  };

  /* =========================================================
     VISITORS LISTENER
  ========================================================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "visitors")),
      (snapshot) => {
        setVisitors(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );

        setLoading(false);
      },
      (err) => {
        console.error("Commissioner visitors error:", err);

        setError(t("case.unableToLoadVisitors"));

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [t]);

  /* =========================================================
     VISITS / CASES LISTENER
  ========================================================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "visits")),
      (snapshot) => {
        setVisits(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
      },
      (err) => {
        console.error("Commissioner cases error:", err);

        setError(t("case.unableToLoadCases"));
      },
    );

    return () => unsubscribe();
  }, [t]);

  /* =========================================================
     VISITOR MAP
  ========================================================= */

  const visitorMap = useMemo(() => {
    return new Map(visitors.map((visitor) => [visitor.id, visitor]));
  }, [visitors]);

  /* =========================================================
     FILTER CASES
  ========================================================= */

  const cases = useMemo(() => {
    const value = search.trim().toLowerCase();

    return visits
      .filter(isCase)
      .filter((visit) => {
        const currentStatus = getCaseStatus(visit).toLowerCase();

        const currentPriority = getCasePriority(visit).toLowerCase();

        const visitor = visitorMap.get(visit.visitorId);

        const matchesSearch =
          !value ||
          visitor?.fullName?.toLowerCase().includes(value) ||
          visitor?.mobileNumber?.toLowerCase().includes(value) ||
          visit?.visitorCode?.toLowerCase().includes(value) ||
          visit?.caseAction?.assignedOfficer?.toLowerCase().includes(value);

        const matchesStatus =
          status === "ALL" || currentStatus === status.toLowerCase();

        const matchesPriority =
          priority === "ALL" || currentPriority === priority.toLowerCase();

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const aDate = toDate(a.updatedAt) || toDate(a.entryTime) || new Date(0);

        const bDate = toDate(b.updatedAt) || toDate(b.entryTime) || new Date(0);

        return bDate.getTime() - aDate.getTime();
      });
  }, [visits, visitorMap, search, status, priority]);

  return (
    <div className="commissioner-cases-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="commissioner-cases-header">
        <div>
          <span>{t("commissioner.portal")}</span>

          <h1>{t("navigation.caseReview")}</h1>

          <p>{t("case.readOnlyCaseOverview")}</p>
        </div>

        <button type="button" onClick={() => navigate("/commissioner")}>
          ← {t("case.dashboard")}
        </button>
      </header>

      <main className="commissioner-cases-main">
        {/* ===================================================
            ERROR
        =================================================== */}

        {error && <div className="commissioner-cases-error">{error}</div>}

        {/* ===================================================
            FILTER TOOLBAR
        =================================================== */}

        <section className="commissioner-case-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("case.searchCases")}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">{t("case.allStatus")}</option>

            <option value="New">{t("case.newStatus")}</option>

            <option value="Under Verification">
              {t("commissioner.newUnderVerification")}
            </option>

            <option value="Evidence Collection">
              {t("commissioner.evidenceCollection")}
            </option>

            <option value="Referred">{t("commissioner.referred")}</option>

            <option value="Complaint Registered">
              {t("case.complaintRegistered")}
            </option>

            <option value="FIR Registered">{t("case.firRegistered")}</option>

            <option value="Closed">{t("commissioner.closed")}</option>
          </select>

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="ALL">{t("case.allPriority")}</option>

            <option value="Low">{t("case.low")}</option>

            <option value="Medium">{t("case.medium")}</option>

            <option value="High">{t("case.high")}</option>

            <option value="Urgent">{t("case.urgent")}</option>
          </select>
        </section>

        {/* ===================================================
            CASE TABLE
        =================================================== */}

        <section className="commissioner-case-table-wrap">
          <div className="commissioner-case-table-head">
            <strong>{t("navigation.cases")}</strong>

            <span>
              {cases.length} {t("case.records")}
            </span>
          </div>

          {loading ? (
            <div className="commissioner-case-empty">
              {t("case.loadingCases")}
            </div>
          ) : cases.length === 0 ? (
            <div className="commissioner-case-empty">
              {t("case.noCasesMatch")}
            </div>
          ) : (
            <div className="commissioner-case-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("case.visitor")}</th>

                    <th>{t("case.status")}</th>

                    <th>{t("case.priority")}</th>

                    <th>{t("case.officer")}</th>

                    <th>{t("case.evidence")}</th>

                    <th>{t("case.updated")}</th>

                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {cases.map((visit) => {
                    const visitor = visitorMap.get(visit.visitorId);

                    const caseStatus = getCaseStatus(visit);

                    const casePriority = getCasePriority(visit);

                    const officer =
                      visit?.caseAction?.assignedOfficer ||
                      visit?.caseAction?.officerName ||
                      t("case.unassigned");

                    return (
                      <tr key={visit.id}>
                        <td>
                          <strong>
                            {visitor?.fullName ||
                              t("commissioner.unknownVisitor")}
                          </strong>

                          <small>
                            {visitor?.mobileNumber || visit.visitorCode || "—"}
                          </small>
                        </td>

                        <td>
                          <span className="case-pill status">
                            {translateStatus(caseStatus)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`case-pill priority-${casePriority
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {translatePriority(casePriority)}
                          </span>
                        </td>

                        <td>{officer}</td>

                        <td>{getEvidenceCount(visit)}</td>

                        <td>
                          {formatDateTime(visit.updatedAt || visit.entryTime)}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="case-review-button"
                            onClick={() =>
                              navigate(`/commissioner/cases/${visit.id}`)
                            }
                          >
                            {t("case.review")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          CASE MODAL
      ===================================================== */}

      {selectedVisit && (
        <div
          className="commissioner-case-modal-backdrop"
          onClick={() => setSelectedVisit(null)}
        >
          <section
            className="commissioner-case-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const visitor = visitorMap.get(selectedVisit.visitorId);

              const action = selectedVisit.caseAction || {};

              return (
                <>
                  <div className="commissioner-case-modal-header">
                    <div>
                      <span>{t("case.caseReview")}</span>

                      <h2>
                        {visitor?.fullName || t("commissioner.unknownVisitor")}
                      </h2>

                      <p>
                        {visitor?.mobileNumber ||
                          selectedVisit.visitorCode ||
                          t("commissioner.noVisitorContact")}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedVisit(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="commissioner-case-detail-grid">
                    <div>
                      <span>{t("case.status")}</span>

                      <strong>
                        {translateStatus(getCaseStatus(selectedVisit))}
                      </strong>
                    </div>

                    <div>
                      <span>{t("case.priority")}</span>

                      <strong>
                        {translatePriority(getCasePriority(selectedVisit))}
                      </strong>
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
                      <span>{t("case.evidence")}</span>

                      <strong>{getEvidenceCount(selectedVisit)}</strong>
                    </div>
                  </div>

                  <div className="commissioner-case-detail-block">
                    <span>{t("case.reportedProblem")}</span>

                    <p>
                      {selectedVisit.aiProblemSummary ||
                        t("case.noAiProblemSummary")}
                    </p>
                  </div>

                  <div className="commissioner-case-detail-block">
                    <span>{t("case.officerRemarks")}</span>

                    <p>{action.officerRemarks || t("case.noOfficerRemarks")}</p>
                  </div>

                  <div className="commissioner-case-detail-block">
                    <span>{t("case.suggestedActions")}</span>

                    <p>
                      {selectedVisit.aiSuggestedActions ||
                        t("case.noSuggestedActions")}
                    </p>
                  </div>

                  <div className="commissioner-case-modal-footer">
                    <small>
                      {t("case.lastUpdated")}:{" "}
                      {formatDateTime(
                        selectedVisit.updatedAt || selectedVisit.entryTime,
                      )}
                    </small>

                    {!isClosed(selectedVisit) && (
                      <span>{t("case.policeWorkflowMessage")}</span>
                    )}
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      )}
    </div>
  );
}

export default CommissionerCases;
