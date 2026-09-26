import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { auth } from "../firebase/config";

import {
  subscribeToVisitsByDate,
  subscribeToVisitors,
  checkoutVisit,
} from "../services/gateService";

import "../styles/GateDashboard.css";
import "../styles/AppSettings.css";
import AppSettings from "../components/AppSettings";

function GateDashboard() {
  const navigate = useNavigate();

  const [todayVisits, setTodayVisits] = useState([]);
  const [yesterdayVisits, setYesterdayVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingYesterday, setLoadingYesterday] = useState(true);

  const [error, setError] = useState("");
  const [checkoutId, setCheckoutId] = useState(null);

  const [todayFilter, setTodayFilter] = useState("ALL");
  const [yesterdayFilter, setYesterdayFilter] = useState("ALL");

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const getYesterday = () => {
    const date = new Date();

    date.setDate(date.getDate() - 1);

    return date;
  };

  // =========================================================
  // TODAY'S VISITS
  // =========================================================

  useEffect(() => {
    const unsubscribe = subscribeToVisitsByDate(
      new Date(),
      (data) => {
        setTodayVisits(data);
        setLoadingToday(false);
      },
      (error) => {
        console.error("Today's visitors error:", error);

        setError("Unable to load today's visitors.");

        setLoadingToday(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // YESTERDAY'S VISITS
  // =========================================================

  useEffect(() => {
    const yesterday = getYesterday();

    const unsubscribe = subscribeToVisitsByDate(
      yesterday,
      (data) => {
        setYesterdayVisits(data);
        setLoadingYesterday(false);
      },
      (error) => {
        console.error("Yesterday's visitors error:", error);

        setError("Unable to load yesterday's visitors.");

        setLoadingYesterday(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // VISITORS
  // =========================================================

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data);
      },
      (error) => {
        console.error("Visitor information error:", error);

        setError("Unable to load visitor information.");
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // FIND VISITOR
  // =========================================================

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  // =========================================================
  // FORMAT TIME
  // =========================================================

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

  // =========================================================
  // TODAY STATISTICS
  // =========================================================

  const statistics = useMemo(() => {
    const currentlyInside = todayVisits.filter(
      (visit) => visit.status === "INSIDE",
    ).length;

    const exitedToday = todayVisits.filter(
      (visit) => visit.status === "EXITED",
    ).length;

    const petitionVisitors = todayVisits.filter(
      (visit) => visit.purpose === "Petition / Complaint",
    ).length;

    const meetingVisitors = todayVisits.filter(
      (visit) => visit.purpose === "Meeting",
    ).length;

    const otherVisitors = todayVisits.filter(
      (visit) => visit.purpose === "Other",
    ).length;

    return {
      total: todayVisits.length,
      currentlyInside,
      exitedToday,
      petitionVisitors,
      meetingVisitors,
      otherVisitors,
    };
  }, [todayVisits]);

  // =========================================================
  // TODAY FILTER
  // =========================================================

  const filteredTodayVisits = useMemo(() => {
    let filtered = [...todayVisits];

    switch (todayFilter) {
      case "INSIDE":
        filtered = filtered.filter((visit) => visit.status === "INSIDE");
        break;

      case "EXITED":
        filtered = filtered.filter((visit) => visit.status === "EXITED");
        break;

      case "PETITION":
        filtered = filtered.filter(
          (visit) => visit.purpose === "Petition / Complaint",
        );
        break;

      case "MEETING":
        filtered = filtered.filter((visit) => visit.purpose === "Meeting");
        break;

      case "OTHER":
        filtered = filtered.filter((visit) => visit.purpose === "Other");
        break;

      default:
        break;
    }

    return filtered;
  }, [todayVisits, todayFilter]);

  // =========================================================
  // YESTERDAY FILTER
  // =========================================================

  const filteredYesterdayVisits = useMemo(() => {
    let filtered = [...yesterdayVisits];

    switch (yesterdayFilter) {
      case "INSIDE":
        filtered = filtered.filter((visit) => visit.status === "INSIDE");
        break;

      case "EXITED":
        filtered = filtered.filter((visit) => visit.status === "EXITED");
        break;

      case "PETITION":
        filtered = filtered.filter(
          (visit) => visit.purpose === "Petition / Complaint",
        );
        break;

      case "MEETING":
        filtered = filtered.filter((visit) => visit.purpose === "Meeting");
        break;

      case "OTHER":
        filtered = filtered.filter((visit) => visit.purpose === "Other");
        break;

      default:
        break;
    }

    return filtered;
  }, [yesterdayVisits, yesterdayFilter]);

  // =========================================================
  // CHECKOUT
  // =========================================================

  const handleCheckout = async (visit) => {
    if (!visit?.id) {
      return;
    }

    const visitor = getVisitor(visit.visitorId);

    const visitorName = visitor?.fullName || "this visitor";

    const confirmed = window.confirm(`Check out ${visitorName}?`);

    if (!confirmed) {
      return;
    }

    try {
      setCheckoutId(visit.id);
      setError("");

      await checkoutVisit(visit.id);
    } catch (error) {
      console.error("Checkout failed:", error);

      setError("Unable to check out visitor. Please try again.");
    } finally {
      setCheckoutId(null);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // =========================================================
  // FILTER BUTTONS
  // =========================================================

  const renderFilters = (currentFilter, setFilter) => {
    return (
      <div className="visitor-filters">
        <button
          type="button"
          className={
            currentFilter === "ALL" ? "filter-button active" : "filter-button"
          }
          onClick={() => setFilter("ALL")}
        >
          All
        </button>

        <button
          type="button"
          className={
            currentFilter === "INSIDE"
              ? "filter-button active"
              : "filter-button"
          }
          onClick={() => setFilter("INSIDE")}
        >
          Inside
        </button>

        <button
          type="button"
          className={
            currentFilter === "EXITED"
              ? "filter-button active"
              : "filter-button"
          }
          onClick={() => setFilter("EXITED")}
        >
          Exited
        </button>

        <button
          type="button"
          className={
            currentFilter === "PETITION"
              ? "filter-button active"
              : "filter-button"
          }
          onClick={() => setFilter("PETITION")}
        >
          Petition / Complaint
        </button>

        <button
          type="button"
          className={
            currentFilter === "MEETING"
              ? "filter-button active"
              : "filter-button"
          }
          onClick={() => setFilter("MEETING")}
        >
          Meeting
        </button>

        <button
          type="button"
          className={
            currentFilter === "OTHER" ? "filter-button active" : "filter-button"
          }
          onClick={() => setFilter("OTHER")}
        >
          Other
        </button>
      </div>
    );
  };

  // =========================================================
  // VISITOR TABLE
  // =========================================================

  const renderVisitorTable = (data, emptyTitle, emptyDescription) => {
    if (data.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">👥</div>

          <h4>{emptyTitle}</h4>

          <p>{emptyDescription}</p>

          <button
            type="button"
            onClick={() => navigate("/gate/register")}
            className="empty-register-button"
          >
            Register Visitor
          </button>
        </div>
      );
    }

    return (
      <div className="visitor-table-wrapper">
        <table className="visitor-table">
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
            {data.map((visit) => {
              const visitor = getVisitor(visit.visitorId);

              return (
                <tr key={visit.id}>
                  {/* Visitor */}

                  <td>
                    <div className="visitor-cell">
                      {visitor?.photoData ? (
                        <img
                          src={visitor.photoData}
                          alt={visitor.fullName || "Visitor"}
                          className="visitor-photo"
                        />
                      ) : (
                        <div className="visitor-avatar">
                          {visitor?.fullName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}

                      <div className="visitor-details">
                        <button
                          type="button"
                          className="visitor-name-link"
                          onClick={() =>
                            navigate(`/gate/visitor/${visit.visitorId}`)
                          }
                        >
                          {visitor?.fullName || "--"}
                        </button>

                        <span>
                          {visitor?.mobileNumber || "No mobile number"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Visitor ID */}

                  <td>
                    <span className="visitor-id">
                      {visit.visitorCode || "--"}
                    </span>
                  </td>

                  {/* Purpose */}

                  <td>
                    <span className="purpose-text">
                      {visit.purpose || "--"}
                    </span>
                  </td>

                  {/* Entry */}

                  <td>
                    <span className="entry-time">
                      {formatTime(visit.entryTime)}
                    </span>
                  </td>

                  {/* Exit */}

                  <td>
                    <span className="exit-time">
                      {formatTime(visit.exitTime)}
                    </span>
                  </td>

                  {/* Status */}

                  <td>
                    <span
                      className={`status-badge ${
                        visit.status === "INSIDE" ? "inside" : "exited"
                      }`}
                    >
                      <span className="status-dot"></span>

                      {visit.status || "UNKNOWN"}
                    </span>
                  </td>

                  {/* Action */}

                  <td>
                    <div className="visitor-actions">
                      <button
                        type="button"
                        className="view-button"
                        onClick={() =>
                          navigate(`/gate/visitor/${visit.visitorId}`)
                        }
                      >
                        View
                      </button>

                      {visit.status === "INSIDE" ? (
                        <button
                          type="button"
                          className="checkout-button"
                          onClick={() => handleCheckout(visit)}
                          disabled={checkoutId === visit.id}
                        >
                          {checkoutId === visit.id
                            ? "Checking..."
                            : "Check Out"}
                        </button>
                      ) : (
                        <span className="completed-action">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="gate-dashboard">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="gate-header">
        <div className="gate-header-left">
          <div className="gate-logo">PS</div>

          <div className="gate-brand">
            <h1>POLICESETU AI</h1>

            <p>Gate Management System</p>
          </div>
        </div>

        <div className="gate-header-right">
  <AppSettings />

  <div className="watchman-info">
  <span className="watchman-name">Watchman</span>

            <span className="watchman-role">Gate Access</span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="gate-main">
        {/* ===================================================
            PAGE HEADING
        =================================================== */}

        <section className="dashboard-heading">
          <div>
            <span className="dashboard-label">GATE PORTAL</span>

            <h2>Visitor Dashboard</h2>

            <p>Monitor visitors entering and leaving the police station.</p>
          </div>

          <div className="dashboard-heading-actions">
            <button
              type="button"
              className="search-visitor-button"
              onClick={() => navigate("/gate/search")}
            >
              Search Visitor
            </button>

            <button
              type="button"
              className="register-button"
              onClick={() => navigate("/gate/register")}
            >
              <span className="register-icon">+</span>
              Register New Visitor
            </button>

            <button
              type="button"
              className="movement-register-button"
              onClick={() => navigate("/gate/movement")}
            >
              Complete Visitor Register →
            </button>
          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && <div className="dashboard-error">{error}</div>}

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="stats-grid">
          {/* Today's Visitors */}

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-title">Today's Visitors</span>

              <div className="stat-icon blue">👥</div>
            </div>

            <div className="stat-number">
              {loadingToday ? "—" : statistics.total}
            </div>

            <span className="stat-description">Total visits today</span>
          </div>

          {/* Currently Inside */}

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-title">Currently Inside</span>

              <div className="stat-icon green">✓</div>
            </div>

            <div className="stat-number">
              {loadingToday ? "—" : statistics.currentlyInside}
            </div>

            <span className="stat-description">Visitors currently inside</span>
          </div>

          {/* Exited Today */}

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-title">Exited Today</span>

              <div className="stat-icon orange">↗</div>
            </div>

            <div className="stat-number">
              {loadingToday ? "—" : statistics.exitedToday}
            </div>

            <span className="stat-description">Visitors who left today</span>
          </div>

          {/* Yesterday */}

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-title">Yesterday's Visitors</span>

              <div className="stat-icon purple">◷</div>
            </div>

            <div className="stat-number">
              {loadingYesterday ? "—" : yesterdayVisits.length}
            </div>

            <span className="stat-description">Total visits yesterday</span>
          </div>
        </section>

        {/* ===================================================
            TODAY
        =================================================== */}

        <section className="recent-section">
          <div className="recent-header">
            <div>
              <span className="section-date-label">TODAY</span>

              <h3>Today's Visitors</h3>

              <p>Visitors who entered the police station today.</p>
            </div>

            <span className="record-count">
              {filteredTodayVisits.length} records
            </span>
          </div>

          {renderFilters(todayFilter, setTodayFilter)}

          {loadingToday ? (
            <div className="empty-state">
              <div className="loading-spinner"></div>

              <p>Loading today's visitors...</p>
            </div>
          ) : (
            renderVisitorTable(
              filteredTodayVisits,
              "No visitors today",
              "Registered visitors will appear here.",
            )
          )}
        </section>

        {/* ===================================================
            YESTERDAY
        =================================================== */}

        <section className="recent-section">
          <div className="recent-header">
            <div>
              <span className="section-date-label">YESTERDAY</span>

              <h3>Yesterday's Visitors</h3>

              <p>Complete visitor activity from yesterday.</p>
            </div>

            <span className="record-count">
              {filteredYesterdayVisits.length} records
            </span>
          </div>

          {renderFilters(yesterdayFilter, setYesterdayFilter)}

          {loadingYesterday ? (
            <div className="empty-state">
              <div className="loading-spinner"></div>

              <p>Loading yesterday's visitors...</p>
            </div>
          ) : (
            renderVisitorTable(
              filteredYesterdayVisits,
              "No visitors yesterday",
              "No visitor records were found for yesterday.",
            )
          )}
        </section>
      </main>
    </div>
  );
}

export default GateDashboard;
