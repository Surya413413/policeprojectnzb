import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";

import {
  FaBook,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaCircle,
  FaClock,
  FaDoorOpen,
  FaExclamationTriangle,
  FaFileAlt,
  FaFileUpload,
  FaFolderOpen,
  FaPlus,
  FaShieldAlt,
  FaUserFriends,
  FaUserPlus,
  FaUserShield,
  FaUsers,
  FaHourglassHalf,
  FaRobot,
} from "react-icons/fa";

import { db } from "../../firebase/config";
import "../../styles/PoliceDashboard.css";

import {
  subscribeToPoliceDashboardStats,
  subscribeToVisitsByDate,
  subscribeToVisitors,
} from "../../services/gateService";

/* =========================================================
   SMALL PRESENTATIONAL HELPERS (UI ONLY)
   ========================================================= */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * AnimatedCounter
 * UI-only. Displays the real value it receives; the animation simply
 * count-ups toward it. Respects prefers-reduced-motion.
 */
function AnimatedCounter({ value, loading = false, duration = 700 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const previousRef = useRef(0);

  useEffect(() => {
    if (loading) return;

    if (prefersReducedMotion()) {
      setDisplay(target);
      previousRef.current = target;
      return;
    }

    const from = previousRef.current;
    const to = target;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    let rafId;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, loading]);

  if (loading) {
    return <strong className="pd-counter-loading">—</strong>;
  }

  return <strong>{display}</strong>;
}

/* =========================================================
   COMPONENT
   ========================================================= */

function PoliceDashboard() {
  const navigate = useNavigate();
  /* ==========================================
     DASHBOARD STATISTICS
     ========================================== */

  const [stats, setStats] = useState({
    total: 0,
    currentlyInside: 0,
    exitedToday: 0,
    petitionVisitors: 0,
    meetingVisitors: 0,
    otherVisitors: 0,
  });

  /* ==========================================
     VISITOR ACTIVITY
     ========================================== */

  const [todayVisits, setTodayVisits] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  /* ==========================================
     LOADING STATES
     ========================================== */

  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  /* ==========================================
     ERROR
     ========================================== */

  const [error, setError] = useState("");

  /* ==========================================
     LOAD TODAY'S VISITS
     ========================================== */

  useEffect(() => {
    const unsubscribe = subscribeToVisitsByDate(
      new Date(),
      (data) => {
        setTodayVisits(data);
        setLoadingActivity(false);
      },
      (error) => {
        console.error("Police activity error:", error);
        setError("Unable to load recent visitor activity.");
        setLoadingActivity(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* ==========================================
     LOAD VISITORS
     ========================================== */

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data);
      },
      (error) => {
        console.error("Police visitor information error:", error);
        setError("Unable to load visitor information.");
      },
    );

    return () => unsubscribe();
  }, []);

  /* ==========================================
     REAL-TIME CASE INTELLIGENCE (UNCHANGED)
     ========================================== */

  useEffect(() => {
    const visitsRef = collection(db, "visits");

    const unsubscribe = onSnapshot(
      visitsRef,
      (snapshot) => {
        const visits = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        console.log("POLICE DASHBOARD - LIVE VISITS:", visits);

        setAllVisits(visits);
      },
      (error) => {
        console.error("Police dashboard case listener error:", error);
        setError("Unable to load live case intelligence.");
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* ==========================================
     CASE INTELLIGENCE (UNCHANGED LOGIC)
     ========================================== */

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

  const caseVisits = allVisits.filter((visit) => {
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
  });

  const activeCaseCount = caseVisits.filter((visit) => {
    const status = String(visit.caseStatus || visit.caseAction?.status || "")
      .trim()
      .toLowerCase();
    return status !== "closed";
  }).length;

  const urgentCaseCount = caseVisits.filter(
    (visit) => String(visit.casePriority || "").toLowerCase() === "urgent",
  ).length;

  const highPriorityCount = caseVisits.filter(
    (visit) => String(visit.casePriority || "").toLowerCase() === "high",
  ).length;

  const verificationCount = caseVisits.filter(
    (visit) =>
      String(visit.caseStatus || "").toLowerCase() === "under verification",
  ).length;

  const evidencePendingCount = caseVisits.filter(
    (visit) => getEvidenceCount(visit) === 0,
  ).length;

  const aiPendingCount = caseVisits.filter(
    (visit) =>
      getEvidenceCount(visit) > 0 &&
      String(visit.aiStatus || "").toUpperCase() !== "ANALYZED",
  ).length;

  const followUpDueCount = caseVisits.filter((visit) => {
    if (!visit?.caseAction?.nextActionDate && !visit?.nextActionDate) {
      return false;
    }
    const value = visit.caseAction?.nextActionDate || visit.nextActionDate;
    const dueDate = new Date(`${value}T23:59:59`);
    return !Number.isNaN(dueDate.getTime()) && dueDate <= new Date();
  }).length;

  const closedCaseCount = caseVisits.filter((visit) => {
    const status = String(visit.caseStatus || visit.caseAction?.status || "")
      .trim()
      .toLowerCase();
    return status === "closed";
  }).length;

  /* ==========================================
     FIND VISITOR
     ========================================== */

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  /* ==========================================
     FORMAT TIME
     ========================================== */

  const formatTime = (timestamp) => {
    if (!timestamp) return "--";
    try {
      return timestamp.toDate().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--";
    }
  };

  /* ==========================================
   RECENT VISITOR ACTIVITY
   ========================================== */

  const recentVisits = todayVisits.slice(0, 8);

  /* ==========================================
     LOAD DASHBOARD STATISTICS
     ========================================== */

  useEffect(() => {
    const unsubscribe = subscribeToPoliceDashboardStats(
      (data) => {
        setStats(data);
        setLoadingStats(false);
      },
      (error) => {
        console.error("Police dashboard stats error:", error);
        setError("Unable to load dashboard statistics.");
        setLoadingStats(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* ==========================================
     RENDER
     ========================================== */

  return (
    <div className="police-dashboard">
      <main className="police-main">
        <section className="police-hero pd-reveal pd-reveal-1">
          <div className="hero-content">
            <span className="hero-kicker">
              {/* <FaShieldAlt /> */}
              POLICE STATION COMMAND CENTER
            </span>
            <h1>Officer Dashboard</h1>
            <p>
              Monitor visitor activity, station entry records, case workload and
              operational status in real time.
            </p>
            <div className="hero-meta">
              <span>
                <FaCircle className="status-pulse-green" /> Station Operations
                Active
              </span>
              <span>
                <FaCalendarAlt /> Live records
              </span>
            </div>
          </div>
          <div className="hero-emblem">
            {/* <FaShieldAlt /> */}
            <img src="/logo.png" alt="Logo" />
          </div>
        </section>

        {error && <div className="police-dashboard-error">{error}</div>}

        <section className="police-heading-row pd-reveal pd-reveal-2">
          <div>
            <span className="police-label">TODAY AT THE STATION</span>
            <h2>Operational Overview</h2>
            <p>Live visitor and station activity.</p>
          </div>
          <button
            type="button"
            className="register-visitor-dashboard-button"
            onClick={() => navigate("/police/register")}
          >
            <FaPlus /> Register Visitor
          </button>
        </section>

        <section className="police-stats-grid pd-reveal pd-reveal-3">
          <div className="police-stat-card stat-blue">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div>
              <span>Today's Visitors</span>
              <AnimatedCounter value={stats.total} loading={loadingStats} />
              <small>Total visits today</small>
            </div>
          </div>
          <div className="police-stat-card stat-green">
            <div className="stat-icon">
              <FaDoorOpen />
            </div>
            <div>
              <span>Currently Inside</span>
              <AnimatedCounter
                value={stats.currentlyInside}
                loading={loadingStats}
              />
              <small>Visitors inside station</small>
            </div>
          </div>
          <div className="police-stat-card stat-red">
            <div className="stat-icon">
              <FaDoorOpen />
            </div>
            <div>
              <span>Exited Today</span>
              <AnimatedCounter
                value={stats.exitedToday}
                loading={loadingStats}
              />
              <small>Visitors who left</small>
            </div>
          </div>
          <div className="police-stat-card stat-purple">
            <div className="stat-icon">
              <FaFileAlt />
            </div>
            <div>
              <span>Petitions / Complaints</span>
              <AnimatedCounter
                value={stats.petitionVisitors}
                loading={loadingStats}
              />
              <small>Today's petition visitors</small>
            </div>
          </div>
        </section>

        <section className="police-case-intelligence pd-reveal pd-reveal-4">
          <div className="police-section-header">
            <div>
              <span className="police-section-label">CASE INTELLIGENCE</span>
              <h3>Case Workload</h3>
              <p>Live overview of evidence, priority and follow-up status.</p>
            </div>
            <button
              type="button"
              className="view-all-button"
              onClick={() => navigate("/police/visitors?caseFilter=all-cases")}
            >
              View Cases <FaChevronRight />
            </button>
          </div>
          <div className="police-case-intelligence-grid">
            <button
              type="button"
              className="case-intelligence-card urgent"
              onClick={() => navigate("/police/visitors?caseFilter=urgent")}
            >
              <span className="case-intelligence-icon">
                <FaExclamationTriangle />
              </span>
              <span className="case-intelligence-content">
                <strong>{urgentCaseCount}</strong>
                <span>Urgent Cases</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card high"
              onClick={() => navigate("/police/visitors?caseFilter=high")}
            >
              <span className="case-intelligence-icon">
                <FaExclamationTriangle />
              </span>
              <span className="case-intelligence-content">
                <strong>{highPriorityCount}</strong>
                <span>High Priority</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card verification"
              onClick={() =>
                navigate("/police/visitors?caseFilter=verification")
              }
            >
              <span className="case-intelligence-icon">
                <FaHourglassHalf />
              </span>
              <span className="case-intelligence-content">
                <strong>{verificationCount}</strong>
                <span>Under Verification</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card evidence"
              onClick={() =>
                navigate("/police/visitors?caseFilter=evidence-pending")
              }
            >
              <span className="case-intelligence-icon">
                <FaFileUpload />
              </span>
              <span className="case-intelligence-content">
                <strong>{evidencePendingCount}</strong>
                <span>Evidence Pending</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card ai"
              onClick={() => navigate("/police/visitors?caseFilter=ai-pending")}
            >
              <span className="case-intelligence-icon">
                <FaRobot />
              </span>
              <span className="case-intelligence-content">
                <strong>{aiPendingCount}</strong>
                <span>AI Analysis Pending</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card followup"
              onClick={() => navigate("/police/visitors?caseFilter=follow-up")}
            >
              <span className="case-intelligence-icon">
                <FaCalendarAlt />
              </span>
              <span className="case-intelligence-content">
                <strong>{followUpDueCount}</strong>
                <span>Follow-ups Due</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card active"
              onClick={() => navigate("/police/visitors?caseFilter=active")}
            >
              <span className="case-intelligence-icon">
                <FaUserShield />
              </span>
              <span className="case-intelligence-content">
                <strong>{activeCaseCount}</strong>
                <span>Active Cases</span>
              </span>
            </button>
            <button
              type="button"
              className="case-intelligence-card closed"
              onClick={() => navigate("/police/visitors?caseFilter=closed")}
            >
              <span className="case-intelligence-icon">
                <FaCheckCircle />
              </span>
              <span className="case-intelligence-content">
                <strong>{closedCaseCount}</strong>
                <span>Closed Cases</span>
              </span>
            </button>
          </div>
        </section>

        <section className="police-quick-section pd-reveal pd-reveal-5">
          <div className="police-section-header">
            <div>
              <span className="police-section-label">STATION OPERATIONS</span>
              <h3>Quick Actions</h3>
              <p>Access the most frequently used police station functions.</p>
            </div>
          </div>
          <div className="police-quick-actions">
            <button
              className="police-quick-card"
              type="button"
              onClick={() => navigate("/police/visitors")}
            >
              <div className="police-quick-icon blue">
                <FaUsers />
              </div>
              <div>
                <h3>All Visitors</h3>
                <p>View and search all registered visitors.</p>
              </div>
              <FaChevronRight className="quick-arrow" />
            </button>
            <button
              className="police-quick-card"
              type="button"
              onClick={() => navigate("/police/inside")}
            >
              <div className="police-quick-icon green">
                <FaDoorOpen />
              </div>
              <div>
                <h3>Currently Inside</h3>
                <p>View visitors currently inside the station.</p>
              </div>
              <FaChevronRight className="quick-arrow" />
            </button>
            <button
              className="police-quick-card"
              type="button"
              onClick={() => navigate("/police/petitions")}
            >
              <div className="police-quick-icon purple">
                <FaFileAlt />
              </div>
              <div>
                <h3>Petitions / Complaints</h3>
                <p>View today's petition and complaint visitors.</p>
              </div>
              <FaChevronRight className="quick-arrow" />
            </button>
            <button
              className="police-quick-card"
              type="button"
              onClick={() => navigate("/police/history")}
            >
              <div className="police-quick-icon amber">
                <FaClock />
              </div>
              <div>
                <h3>Visit History</h3>
                <p>View complete visitor movement history.</p>
              </div>
              <FaChevronRight className="quick-arrow" />
            </button>
            <button
              className="police-quick-card"
              type="button"
              onClick={() => navigate("/police/reports")}
            >
              <div className="police-quick-icon navy">
                <FaBook />
              </div>
              <div>
                <h3>Reports</h3>
                <p>Generate and download visitor and case reports.</p>
              </div>
              <FaChevronRight className="quick-arrow" />
            </button>
          </div>
        </section>

        <section className="police-section police-activity-section pd-reveal pd-reveal-6">
          <div className="police-section-header">
            <div>
              <span className="police-section-label">LIVE ACTIVITY</span>
              <h3>Recent Visitor Activity</h3>
              <p>Latest visitor movements at the gate.</p>
            </div>
            <button
              type="button"
              className="view-all-button"
              onClick={() => navigate("/police/history")}
            >
              View All <FaChevronRight />
            </button>
          </div>
          {loadingActivity ? (
            <div className="police-empty-state">
              <div className="police-loading-spinner"></div>
              <p>Loading visitor activity...</p>
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="police-empty-state">
              <div className="police-empty-icon">
                <FaUserFriends />
              </div>
              <h4>No visitors today</h4>
              <p>
                Visitor activity will appear here when someone enters the
                station.
              </p>
            </div>
          ) : (
            <div className="police-activity-table-wrapper">
              <table className="police-activity-table">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Visitor ID</th>
                    <th>Purpose</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit, index) => {
                    const visitor = getVisitor(visit.visitorId);
                    return (
                      <tr
                        key={visit.id}
                        className="pd-row-anim"
                        style={{ animationDelay: `${index * 25}ms` }}
                      >
                        <td>
                          <div className="police-visitor-cell">
                            {visitor?.photoData ? (
                              <img
                                src={visitor.photoData}
                                alt={visitor.fullName || "Visitor"}
                                className="police-visitor-photo"
                              />
                            ) : (
                              <div className="police-visitor-avatar">
                                {visitor?.fullName?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </div>
                            )}
                            <div className="police-visitor-info">
                              <strong>{visitor?.fullName || "--"}</strong>
                              <span>
                                {visitor?.mobileNumber || "No mobile"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="police-visitor-id">
                            {visit.visitorCode || "--"}
                          </span>
                        </td>
                        <td>
                          <span className="police-purpose">
                            {visit.purpose || "--"}
                          </span>
                        </td>
                        <td>
                          <span className="police-time">
                            {formatTime(visit.entryTime)}
                          </span>
                        </td>
                        <td>
                          <span className="police-time">
                            {formatTime(visit.exitTime)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`police-status ${
                              visit.status === "INSIDE"
                                ? "inside pulse-soft"
                                : "exited"
                            }`}
                          >
                            <span className="police-status-dot"></span>
                            {visit.status || "UNKNOWN"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="police-view-button"
                            onClick={() =>
                              navigate(`/police/visitors/${visit.visitorId}`)
                            }
                          >
                            View
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
    </div>
  );
}

export default PoliceDashboard;
