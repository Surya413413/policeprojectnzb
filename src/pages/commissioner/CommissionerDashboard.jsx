import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaChartBar,
  FaFolderOpen,
  FaArrowRight,
  FaCircle,
} from "react-icons/fa";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { getCurrentUserRole } from "../../services/authService";

import "../../styles/CommissionerDashboard.css";
import AppSettings from "../../components/AppSettings";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/AppSettings.css";

const CLOSED_STATUSES = ["closed"];

const toDate = (value) => {
  if (!value) return null;

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getCaseStatus = (visit) => {
  return String(
    visit?.caseStatus ||
      visit?.caseAction?.status ||
      (visit?.aiStatus || visit?.aiProblemSummary ? "Under Verification" : ""),
  )
    .trim()
    .toLowerCase();
};

const isCaseVisit = (visit) => {
  return Boolean(
    visit?.caseStatus ||
    visit?.caseAction ||
    visit?.aiStatus ||
    visit?.aiProblemSummary ||
    visit?.voiceEvidence?.length ||
    visit?.documentEvidence?.length ||
    visit?.voiceData ||
    visit?.documentData,
  );
};

const isClosedCase = (visit) => {
  return CLOSED_STATUSES.includes(getCaseStatus(visit));
};

const getCaseActivityDate = (visit) => {
  return (
    toDate(visit?.updatedAt) ||
    toDate(visit?.caseAction?.createdAt) ||
    toDate(visit?.entryTime) ||
    new Date(0)
  );
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

const formatTime = (value) => {
  const date = toDate(value);

  if (!date) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const isToday = (value) => {
  const date = toDate(value);

  if (!date) return false;

  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const getEvidenceCount = (visit) => {
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

  return voiceCount + documentCount;
};

function CommissionerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [commissioner, setCommissioner] = useState({
    name: "",
    email: "",
  });

  const [visitors, setVisitors] = useState([]);
  const [visits, setVisits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // COMMISSIONER AUTHENTICATION
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const userData = await getCurrentUserRole();

        if (userData?.role !== "COMMISSIONER") {
          if (userData?.role === "WATCHMAN") {
            navigate("/gate", { replace: true });
          } else if (userData?.role === "POLICE") {
            navigate("/police", { replace: true });
          } else {
            navigate("/login", { replace: true });
          }

          return;
        }

        setCommissioner({
          name: userData.name || user.displayName || "Commissioner",
          email: userData.email || user.email || "",
        });
      } catch (authError) {
        console.error("Commissioner authentication error:", authError);
        setError("Unable to verify commissioner account.");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ==========================================
  // LIVE VISITORS
  // ==========================================

  useEffect(() => {
    const visitorsQuery = query(collection(db, "visitors"));

    const unsubscribe = onSnapshot(
      visitorsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setVisitors(data);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Commissioner visitor listener error:", snapshotError);
        setError("Unable to load live visitor information.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // LIVE VISITS / CASES
  // ==========================================

  useEffect(() => {
    const visitsQuery = query(collection(db, "visits"));

    const unsubscribe = onSnapshot(
      visitsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setVisits(data);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Commissioner visit listener error:", snapshotError);
        setError("Unable to load live case information.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // DASHBOARD DATA
  // ==========================================

  const caseVisits = useMemo(() => {
    return visits.filter(isCaseVisit);
  }, [visits]);

  const openCases = useMemo(() => {
    return caseVisits.filter((visit) => !isClosedCase(visit));
  }, [caseVisits]);

  const closedCases = useMemo(() => {
    return caseVisits.filter(isClosedCase);
  }, [caseVisits]);

  const pendingCases = useMemo(() => {
    return openCases.filter((visit) => {
      const status = getCaseStatus(visit);

      return (
        Boolean(visit?.caseAction?.nextActionDate || visit?.nextActionDate) ||
        [
          "new",
          "under verification",
          "evidence collection",
          "referred",
        ].includes(status)
      );
    });
  }, [openCases]);

  const highPriorityCases = useMemo(() => {
    return openCases.filter((visit) => {
      const priority = String(
        visit?.casePriority || visit?.caseAction?.priority || "",
      )
        .trim()
        .toLowerCase();

      return priority === "high" || priority === "urgent";
    });
  }, [openCases]);

  const todayVisits = useMemo(() => {
    return visits.filter((visit) => isToday(visit?.entryTime));
  }, [visits]);

  const currentlyInside = useMemo(() => {
    return visits.filter((visit) => visit?.status === "INSIDE");
  }, [visits]);

  const recentCases = useMemo(() => {
    return [...caseVisits]
      .sort(
        (a, b) =>
          getCaseActivityDate(b).getTime() - getCaseActivityDate(a).getTime(),
      )
      .slice(0, 8);
  }, [caseVisits]);

  const officerWorkload = useMemo(() => {
    const counts = {};

    openCases.forEach((visit) => {
      const officer =
        visit?.caseAction?.assignedOfficer ||
        visit?.caseAction?.officerName ||
        "Unassigned";

      counts[officer] = (counts[officer] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [openCases]);

  const aiAnalyzedCases = useMemo(() => {
    return caseVisits.filter(
      (visit) => String(visit?.aiStatus || "").toUpperCase() === "ANALYZED",
    ).length;
  }, [caseVisits]);

  const pendingAiCases = useMemo(() => {
    return caseVisits.filter(
      (visit) =>
        getEvidenceCount(visit) > 0 &&
        String(visit?.aiStatus || "").toUpperCase() !== "ANALYZED",
    ).length;
  }, [caseVisits]);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (logoutError) {
      console.error("Commissioner logout error:", logoutError);
      setError("Unable to logout. Please try again.");
      setLoggingOut(false);
    }
  };

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  const getStatusLabel = (visit) => {
    return (
      visit?.caseStatus || visit?.caseAction?.status || "Under Verification"
    );
  };

  const getPriorityLabel = (visit) => {
    return visit?.casePriority || visit?.caseAction?.priority || "Medium";
  };

  return (
    <div className="commissioner-dashboard">
      <header className="commissioner-header">
        <div className="commissioner-header-left">
          <div className="commissioner-logo">PS</div>

          <div>
            <h1>POLICESETU AI</h1>
            <p>{t("commissioner.portal")}</p>
          </div>
        </div>

        <div className="commissioner-header-right">
          <div className="commissioner-profile">
            <strong>{commissioner.name || "Commissioner"}</strong>
            <span>
              {commissioner.email || t("commissioner.administrativeAccess")}
            </span>
          </div>

          <AppSettings />

          <button
            type="button"
            className="commissioner-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? t("common.loggingOut") : t("common.logout")}
          </button>
        </div>
      </header>

      <main className="commissioner-main">
        <section className="commissioner-heading">
          <div>
            <span className="commissioner-label">
              {t("commissioner.administrativeOverview")}
            </span>
            <h2>{t("commissioner.dashboard")}</h2>
            <p>{t("commissioner.dashboardDescription")}</p>
          </div>

          <div className="commissioner-live">
            <span className="commissioner-live-dot">
              <FaCircle />
            </span>
            {t("commissioner.liveFirestoreData")}
          </div>
        </section>

        {error && <div className="commissioner-error">{error}</div>}

        <section className="commissioner-stats-grid">
          <div className="commissioner-stat-card">
            <span>{t("commissioner.totalVisitors")}</span>
            <strong>{loading ? "—" : visitors.length}</strong>
            <small>{t("commissioner.registeredVisitorRecords")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.todaysVisits")}</span>
            <strong>{loading ? "—" : todayVisits.length}</strong>
            <small>{t("commissioner.stationVisitsToday")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.currentlyInside")}</span>
            <strong>{loading ? "—" : currentlyInside.length}</strong>
            <small>{t("commissioner.activeStationEntries")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.openCases")}</span>
            <strong>{loading ? "—" : openCases.length}</strong>
            <small>{t("commissioner.casesNotClosed")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.pendingFollowUp")}</span>
            <strong>{loading ? "—" : pendingCases.length}</strong>
            <small>{t("commissioner.casesRequiringFollowUp")}</small>
          </div>

          <div className="commissioner-stat-card priority">
            <span>{t("commissioner.highUrgent")}</span>
            <strong>{loading ? "—" : highPriorityCases.length}</strong>
            <small>{t("commissioner.openPriorityCases")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.closedCases")}</span>
            <strong>{loading ? "—" : closedCases.length}</strong>
            <small>{t("commissioner.casesMarkedClosed")}</small>
          </div>

          <div className="commissioner-stat-card">
            <span>{t("commissioner.aiAnalyzed")}</span>
            <strong>{loading ? "—" : aiAnalyzedCases}</strong>
            <small>{t("commissioner.completedAiAnalysis")}</small>
          </div>
        </section>

        <section className="commissioner-quick-grid">
          <button
            type="button"
            onClick={() => navigate("/commissioner/cases")}
            className="commissioner-quick-card"
          >
            <span className="quick-icon">
              <FaUsers />
            </span>
            <div>
              <strong>{t("navigation.visitorRecords")}</strong>
              <small>{t("commissioner.reviewVisitorInformation")}</small>
            </div>
            <span className="quick-arrow">
              <FaArrowRight />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/commissioner/reports")}
            className="commissioner-quick-card"
          >
            <span className="quick-icon">
              <FaChartBar />
            </span>
            <div>
              <strong>{t("navigation.reports")}</strong>
              <small>{t("commissioner.openPoliceReports")}</small>
            </div>
            <span className="quick-arrow">
              <FaArrowRight />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/commissioner/cases")}
            className="commissioner-quick-card"
          >
            <span className="quick-icon">
              <FaFolderOpen />
            </span>
            <div>
              <strong>{t("navigation.caseReview")}</strong>
              <small>{t("commissioner.openCaseList")}</small>
            </div>
            <span className="quick-arrow">
              <FaArrowRight />
            </span>
          </button>
        </section>

        <section className="commissioner-content-grid">
          <div className="commissioner-panel commissioner-recent-panel">
            <div className="commissioner-panel-header">
              <div>
                <span>{t("commissioner.liveCaseActivity")}</span>
                <h3>{t("commissioner.recentCases")}</h3>
              </div>

              <span className="commissioner-count">{recentCases.length}</span>
            </div>

            {recentCases.length === 0 ? (
              <div className="commissioner-empty">
                {t("commissioner.noCaseRecords")}
              </div>
            ) : (
              <div className="commissioner-case-list">
                {recentCases.map((visit) => {
                  const visitor = getVisitor(visit.visitorId);
                  const status = getStatusLabel(visit);
                  const priority = getPriorityLabel(visit);

                  return (
                    <button
                      type="button"
                      key={visit.id}
                      className="commissioner-case-row"
                      onClick={() =>
                        navigate(`/commissioner/cases/${visit.id}`)
                      }
                    >
                      <div className="commissioner-case-avatar">
                        {visitor?.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </div>

                      <div className="commissioner-case-main">
                        <strong>
                          {visitor?.fullName ||
                            t("commissioner.unknownVisitor")}
                        </strong>

                        <span>
                          {visitor?.mobileNumber ||
                            visit.visitorCode ||
                            t("commissioner.noVisitorContact")}
                        </span>

                        <small>
                          {t("commissioner.updated")}{" "}
                          {formatDateTime(getCaseActivityDate(visit))}
                        </small>
                      </div>

                      <div className="commissioner-case-meta">
                        <span className="case-status">{status}</span>
                        <span
                          className={`case-priority ${priority
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {priority}
                        </span>
                        <span>
                          {t("case.evidence")}: {getEvidenceCount(visit)}
                        </span>
                      </div>

                      <span className="commissioner-case-arrow">
                        <FaArrowRight />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="commissioner-panel">
            <div className="commissioner-panel-header">
              <div>
                <span>{t("commissioner.officerWorkloadLabel")}</span>
                <h3>{t("commissioner.openCasesByOfficer")}</h3>
              </div>

              <span className="commissioner-count">{openCases.length}</span>
            </div>

            {officerWorkload.length === 0 ? (
              <div className="commissioner-empty">
                {t("commissioner.noAssignedOpenCases")}
              </div>
            ) : (
              <div className="commissioner-workload-list">
                {officerWorkload.slice(0, 8).map((item) => (
                  <div className="commissioner-workload-row" key={item.name}>
                    <div className="workload-avatar">
                      {item.name === "Unassigned"
                        ? "?"
                        : item.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="workload-info">
                      <strong>{item.name}</strong>
                      <div className="workload-bar">
                        <span
                          style={{
                            width: `${Math.max(
                              8,
                              Math.min(
                                100,
                                (item.count /
                                  Math.max(officerWorkload[0]?.count || 1, 1)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <strong className="workload-count">{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="commissioner-overview-grid">
          <div className="commissioner-panel">
            <div className="commissioner-panel-header">
              <div>
                <span>{t("commissioner.caseStatusLabel")}</span>
                <h3>{t("commissioner.caseOverview")}</h3>
              </div>
            </div>

            <div className="commissioner-status-list">
              <div>
                <span className="status-marker new" />
                <span>{t("commissioner.newUnderVerification")}</span>
                <strong>
                  {
                    openCases.filter((visit) =>
                      ["new", "under verification"].includes(
                        getCaseStatus(visit),
                      ),
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span className="status-marker evidence" />
                <span>{t("commissioner.evidenceCollection")}</span>
                <strong>
                  {
                    openCases.filter(
                      (visit) => getCaseStatus(visit) === "evidence collection",
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span className="status-marker referred" />
                <span>{t("commissioner.referred")}</span>
                <strong>
                  {
                    openCases.filter(
                      (visit) => getCaseStatus(visit) === "referred",
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span className="status-marker closed" />
                <span>{t("commissioner.closed")}</span>
                <strong>{closedCases.length}</strong>
              </div>
            </div>
          </div>

          <div className="commissioner-panel">
            <div className="commissioner-panel-header">
              <div>
                <span>{t("commissioner.aiMonitoring")}</span>
                <h3>{t("commissioner.analysisStatus")}</h3>
              </div>
            </div>

            <div className="commissioner-ai-grid">
              <div>
                <strong>{aiAnalyzedCases}</strong>
                <span>{t("commissioner.analyzed")}</span>
              </div>

              <div>
                <strong>{pendingAiCases}</strong>
                <span>{t("commissioner.evidenceAwaitingAi")}</span>
              </div>
            </div>

            <div className="commissioner-note">
              {t("commissioner.aiDisclaimer")}
            </div>
          </div>

          <div className="commissioner-panel">
            <div className="commissioner-panel-header">
              <div>
                <span>{t("commissioner.stationActivity")}</span>
                <h3>{t("commissioner.todaysMovement")}</h3>
              </div>
            </div>

            <div className="commissioner-movement">
              <div>
                <strong>{todayVisits.length}</strong>
                <span>{t("commissioner.totalVisits")}</span>
              </div>

              <div>
                <strong>{currentlyInside.length}</strong>
                <span>{t("commissioner.inside")}</span>
              </div>

              <div>
                <strong>
                  {
                    todayVisits.filter((visit) => visit.status !== "INSIDE")
                      .length
                  }
                </strong>
                <span>{t("commissioner.exited")}</span>
              </div>
            </div>

            <div className="commissioner-recent-times">
              {todayVisits.slice(0, 5).map((visit) => {
                const visitor = getVisitor(visit.visitorId);

                return (
                  <div key={visit.id}>
                    <span>
                      {visitor?.fullName || t("commissioner.visitor")}
                    </span>
                    <small>{formatTime(visit.entryTime)}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CommissionerDashboard;
