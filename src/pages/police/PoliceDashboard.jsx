import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";

import { auth, db } from "../../firebase/config";

import { getCurrentUserRole } from "../../services/authService";

import "../../styles/PoliceDashboard.css";

import {
  subscribeToPoliceDashboardStats,
  subscribeToVisitsByDate,
  subscribeToVisitors,
} from "../../services/gateService";

function PoliceDashboard() {
  const navigate = useNavigate();

  // ==========================================
  // OFFICER INFORMATION
  // ==========================================

  const [officer, setOfficer] = useState({
    name: "",
    email: "",
  });

  const [loggingOut, setLoggingOut] = useState(false);

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const [stats, setStats] = useState({
    total: 0,
    currentlyInside: 0,
    exitedToday: 0,
    petitionVisitors: 0,
    meetingVisitors: 0,
    otherVisitors: 0,
  });

  // ==========================================
  // VISITOR ACTIVITY
  // ==========================================

  const [todayVisits, setTodayVisits] = useState([]);

  const [allVisits, setAllVisits] = useState([]);

  const [visitors, setVisitors] = useState([]);

  // ==========================================
  // LOADING STATES
  // ==========================================

  const [loadingActivity, setLoadingActivity] = useState(true);

  const [loadingStats, setLoadingStats] = useState(true);

  // ==========================================
  // ERROR
  // ==========================================

  const [error, setError] = useState("");

  // ==========================================
  // CHECK AUTHENTICATED OFFICER
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        const userRole = await getCurrentUserRole();

        // Make sure this account is actually
        // a Police account.
        if (userRole?.role !== "POLICE") {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setOfficer({
          name: userRole?.name || user.displayName || "Police Officer",

          email: userRole?.email || user.email || "",
        });
      } catch (error) {
        console.error("Officer profile error:", error);

        setOfficer({
          name: user.displayName || "Police Officer",

          email: user.email || "",
        });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await signOut(auth);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Police logout error:", error);

      setLoggingOut(false);

      setError("Unable to logout. Please try again.");
    }
  };

  // ==========================================
  // LOAD TODAY'S VISITS
  // ==========================================

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

  // ==========================================
  // LOAD VISITORS
  // ==========================================

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

  // ==========================================
  // LOAD ALL VISITS FOR CASE INTELLIGENCE
  // ==========================================

  // ==========================================
  // REAL-TIME CASE INTELLIGENCE
  // DIRECT FIRESTORE LISTENER
  // ==========================================

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

  // ==========================================
  // CASE INTELLIGENCE
  // ==========================================

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

  // ==========================================
  // FIND VISITOR
  // ==========================================

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "--";
    }

    try {
      return timestamp.toDate().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--";
    }
  };

  // ==========================================
  // RECENT VISITS
  // ==========================================

  const recentVisits = todayVisits.slice(0, 8);

  // ==========================================
  // LOAD DASHBOARD STATISTICS
  // ==========================================

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

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="police-dashboard">
      {/* ======================================
          HEADER
      ======================================= */}

      <header className="police-header">
        <div className="police-header-left">
          <div className="police-logo">PS</div>

          <div className="police-brand">
            <h1>POLICESETU AI</h1>

            <p>Police Officer Portal</p>
          </div>
        </div>

        <div className="police-header-right">
          <div className="officer-info">
            <span className="officer-name">
              {officer.name || "Police Officer"}
            </span>

            <span className="officer-role">
              {officer.email || "Station Access"}
            </span>
          </div>

          <button
            type="button"
            className="police-logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      {/* ======================================
          MAIN
      ======================================= */}

      <main className="police-main">
        {/* ====================================
            HEADING
        ===================================== */}

        <section className="police-heading">
          <div>
            <span className="police-label">POLICE PORTAL</span>

            <h2>Officer Dashboard</h2>

            <p>Monitor visitor activity and station entry records.</p>
          </div>
        </section>

        {/* ERROR */}

        {error && <div className="police-dashboard-error">{error}</div>}

        {/* ====================================
            STATISTICS
        ===================================== */}

        <section className="police-stats-grid">
          {/* TODAY'S VISITORS */}

          <div className="police-stat-card">
            <span>Today's Visitors</span>

            <strong>{loadingStats ? "—" : stats.total}</strong>

            <small>Total visits today</small>
          </div>

          {/* CURRENTLY INSIDE */}

          <div className="police-stat-card">
            <span>Currently Inside</span>

            <strong>{loadingStats ? "—" : stats.currentlyInside}</strong>

            <small>Visitors inside station</small>
          </div>

          {/* EXITED */}

          <div className="police-stat-card">
            <span>Exited Today</span>

            <strong>{loadingStats ? "—" : stats.exitedToday}</strong>

            <small>Visitors who left</small>
          </div>

          {/* PETITIONS */}

          <div className="police-stat-card">
            <span>Petitions / Complaints</span>

            <strong>{loadingStats ? "—" : stats.petitionVisitors}</strong>

            <small>Today's petition visitors</small>
          </div>
        </section>

        {/* ====================================
            CASE INTELLIGENCE
        ===================================== */}

        <section className="police-case-intelligence">
          <div className="police-section-header">
            <div>
              <span className="police-section-label">CASE INTELLIGENCE</span>

              <h3>Case Workload</h3>

              <p>Live overview of evidence, priority and follow-up status.</p>
            </div>

            <button
              type="button"
              className="view-all-button"
              onClick={() => navigate("/police/visitors")}
            >
              View Cases →
            </button>
          </div>

          <div className="police-case-intelligence-grid">
            <button
              type="button"
              className="case-intelligence-card urgent"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">🔴</span>
              <span className="case-intelligence-content">
                <strong>{urgentCaseCount}</strong>
                <span>Urgent Cases</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card high"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">🟠</span>
              <span className="case-intelligence-content">
                <strong>{highPriorityCount}</strong>
                <span>High Priority</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card verification"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">🟡</span>
              <span className="case-intelligence-content">
                <strong>{verificationCount}</strong>
                <span>Under Verification</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card evidence"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">📄</span>
              <span className="case-intelligence-content">
                <strong>{evidencePendingCount}</strong>
                <span>Evidence Pending</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card ai"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">🤖</span>
              <span className="case-intelligence-content">
                <strong>{aiPendingCount}</strong>
                <span>AI Analysis Pending</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card followup"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">📅</span>
              <span className="case-intelligence-content">
                <strong>{followUpDueCount}</strong>
                <span>Follow-ups Due</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card active"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">👮</span>
              <span className="case-intelligence-content">
                <strong>{activeCaseCount}</strong>
                <span>Active Cases</span>
              </span>
            </button>

            <button
              type="button"
              className="case-intelligence-card closed"
              onClick={() => navigate("/police/visitors")}
            >
              <span className="case-intelligence-icon">✅</span>
              <span className="case-intelligence-content">
                <strong>{closedCaseCount}</strong>
                <span>Closed Cases</span>
              </span>
            </button>
          </div>
        </section>

        {/* ====================================
            QUICK ACTIONS
        ===================================== */}

        <section className="police-quick-actions">
          {/* ALL VISITORS */}

          <div className="police-quick-card">
            <div className="police-quick-icon">👥</div>

            <div className="police-quick-content">
              <h3>All Visitors</h3>

              <p>View and search all registered visitors.</p>
            </div>

            <button type="button" onClick={() => navigate("/police/visitors")}>
              View Visitors →
            </button>
          </div>

          {/* CURRENTLY INSIDE */}

          <div className="police-quick-card">
            <div className="police-quick-icon">🟢</div>

            <div className="police-quick-content">
              <h3>Currently Inside</h3>

              <p>View visitors currently inside the station.</p>
            </div>

            <button type="button" onClick={() => navigate("/police/inside")}>
              View Inside →
            </button>
          </div>

          {/* PETITIONS */}

          <div className="police-quick-card">
            <div className="police-quick-icon">📄</div>

            <div className="police-quick-content">
              <h3>Petitions / Complaints</h3>

              <p>View today's petition and complaint visitors.</p>
            </div>

            <button type="button" onClick={() => navigate("/police/petitions")}>
              View Petitions →
            </button>
          </div>

          {/* VISIT HISTORY */}

          <div className="police-quick-card">
            <div className="police-quick-icon">🕒</div>

            <div className="police-quick-content">
              <h3>Visit History</h3>

              <p>View complete visitor movement history.</p>
            </div>

            <button type="button" onClick={() => navigate("/police/history")}>
              View History →
            </button>
          </div>
        </section>

        {/* Reports section is added in the quick actions section of the police dashboard. */}

        <div className="police-quick-card">
          <div className="police-quick-icon">📊</div>

          <div className="police-quick-content">
            <h3>Reports</h3>

            <p>Generate and download visitor and case reports.</p>
          </div>

          <button type="button" onClick={() => navigate("/police/reports")}>
            View Reports →
          </button>
        </div>

        {/* ====================================
            RECENT VISITOR ACTIVITY
        ===================================== */}

        <section className="police-section">
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
              View All →
            </button>
          </div>

          {/* LOADING */}

          {loadingActivity ? (
            <div className="police-empty-state">
              <div className="police-loading-spinner"></div>

              <p>Loading visitor activity...</p>
            </div>
          ) : recentVisits.length === 0 ? (
            /* NO VISITORS */

            <div className="police-empty-state">
              <div className="police-empty-icon">👥</div>

              <h4>No visitors today</h4>

              <p>
                Visitor activity will appear here when someone enters the
                station.
              </p>
            </div>
          ) : (
            /* ACTIVITY TABLE */

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
                  {recentVisits.map((visit) => {
                    const visitor = getVisitor(visit.visitorId);

                    return (
                      <tr key={visit.id}>
                        {/* VISITOR */}

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

                        {/* VISITOR ID */}

                        <td>
                          <span className="police-visitor-id">
                            {visit.visitorCode || "--"}
                          </span>
                        </td>

                        {/* PURPOSE */}

                        <td>
                          <span className="police-purpose">
                            {visit.purpose || "--"}
                          </span>
                        </td>

                        {/* ENTRY */}

                        <td>
                          <span className="police-time">
                            {formatTime(visit.entryTime)}
                          </span>
                        </td>

                        {/* EXIT */}

                        <td>
                          <span className="police-time">
                            {formatTime(visit.exitTime)}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`police-status ${
                              visit.status === "INSIDE" ? "inside" : "exited"
                            }`}
                          >
                            <span className="police-status-dot"></span>

                            {visit.status || "UNKNOWN"}
                          </span>
                        </td>

                        {/* ACTION */}

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
