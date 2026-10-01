import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaAddressBook,
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaEye,
  FaExclamationTriangle,
  FaHistory,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaTimesCircle,
  FaUserFriends,
  FaUserPlus,
} from "react-icons/fa";

import {
  subscribeToVisitsByDate,
  subscribeToVisitors,
  checkoutVisit,
} from "../services/gateService";

import "../styles/GateDashboard.css";

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

  // Separate pagination for Today and Yesterday sections
  const [todayPage, setTodayPage] = useState(1);
  const [yesterdayPage, setYesterdayPage] = useState(1);
  const TODAY_PAGE_SIZE = 10;
  const YESTERDAY_PAGE_SIZE = 10;

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
  // PAGINATION - TODAY
  // =========================================================

  const todayTotalPages = Math.max(
    1,
    Math.ceil(filteredTodayVisits.length / TODAY_PAGE_SIZE),
  );

  const paginatedTodayVisits = useMemo(() => {
    const start = (todayPage - 1) * TODAY_PAGE_SIZE;
    return filteredTodayVisits.slice(start, start + TODAY_PAGE_SIZE);
  }, [filteredTodayVisits, todayPage]);

  // =========================================================
  // PAGINATION - YESTERDAY
  // =========================================================

  const yesterdayTotalPages = Math.max(
    1,
    Math.ceil(filteredYesterdayVisits.length / YESTERDAY_PAGE_SIZE),
  );

  const paginatedYesterdayVisits = useMemo(() => {
    const start = (yesterdayPage - 1) * YESTERDAY_PAGE_SIZE;
    return filteredYesterdayVisits.slice(start, start + YESTERDAY_PAGE_SIZE);
  }, [filteredYesterdayVisits, yesterdayPage]);

  // Reset each section's page when its filter/data changes.
  useEffect(() => {
    setTodayPage(1);
  }, [todayFilter]);

  useEffect(() => {
    setYesterdayPage(1);
  }, [yesterdayFilter]);

  // Keep the current page valid when real-time Firestore data changes.
  useEffect(() => {
    setTodayPage((page) => Math.min(page, todayTotalPages));
  }, [todayTotalPages]);

  useEffect(() => {
    setYesterdayPage((page) => Math.min(page, yesterdayTotalPages));
  }, [yesterdayTotalPages]);

  // =========================================================
  // PAGINATION UI
  // =========================================================

  const renderPagination = (currentPage, setPage, totalPages, totalRecords) => {
    if (totalRecords <= 10) {
      return null;
    }

    const pages = [];

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("LEFT_DOTS");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }

      if (currentPage < totalPages - 2) {
        pages.push("RIGHT_DOTS");
      }

      pages.push(totalPages);
    }

    const startRecord = (currentPage - 1) * 10 + 1;
    const endRecord = Math.min(currentPage * 10, totalRecords);

    return (
      <div className="gate-pagination">
        <div className="gate-pagination-info">
          Showing <strong>{startRecord}</strong> - <strong>{endRecord}</strong>{" "}
          of <strong>{totalRecords}</strong> records
        </div>

        <div className="gate-pagination-controls">
          <button
            type="button"
            className="gate-page-button"
            disabled={currentPage === 1}
            onClick={() => setPage(1)}
            title="First page"
          >
            «
          </button>

          <button
            type="button"
            className="gate-page-button"
            disabled={currentPage === 1}
            onClick={() => setPage((page) => Math.max(1, page - 1))}
            title="Previous page"
          >
            ‹
          </button>

          <div className="gate-page-numbers">
            {pages.map((page) =>
              page === "LEFT_DOTS" || page === "RIGHT_DOTS" ? (
                <span key={page} className="gate-page-dots">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`gate-page-button ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setPage(page)}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            className="gate-page-button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((page) => Math.min(totalPages, page + 1))}
            title="Next page"
          >
            ›
          </button>

          <button
            type="button"
            className="gate-page-button"
            disabled={currentPage === totalPages}
            onClick={() => setPage(totalPages)}
            title="Last page"
          >
            »
          </button>
        </div>
      </div>
    );
  };

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
          <FaAddressBook />
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
          <FaCheckCircle />
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
          <FaSignOutAlt />
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
          <FaBookOpen />
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
          <FaUserPlus />
          Meeting
        </button>

        <button
          type="button"
          className={
            currentFilter === "OTHER" ? "filter-button active" : "filter-button"
          }
          onClick={() => setFilter("OTHER")}
        >
          <FaTimesCircle />
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
          <div className="empty-icon">
            <FaUserFriends />
          </div>

          <h4>{emptyTitle}</h4>

          <p>{emptyDescription}</p>

          <button
            type="button"
            onClick={() => navigate("/gate/register")}
            className="empty-register-button"
          >
            <FaUserPlus />
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
                        <FaEye />
                        View
                      </button>

                      {visit.status === "INSIDE" ? (
                        <button
                          type="button"
                          className="checkout-button"
                          onClick={() => handleCheckout(visit)}
                          disabled={checkoutId === visit.id}
                        >
                          {checkoutId === visit.id ? (
                            <>
                              <FaClock /> Checking...
                            </>
                          ) : (
                            <>
                              <FaSignOutAlt /> Check Out
                            </>
                          )}
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
              <FaPlus className="register-icon" />
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

        {error && (
          <div className="dashboard-error">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="stats-grid">
          {/* Today's Visitors */}

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-title">Today's Visitors</span>

              <div className="stat-icon blue">
                <FaUserFriends />
              </div>
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

              <div className="stat-icon green">
                <FaCheckCircle />
              </div>
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

              <div className="stat-icon orange">
                <FaSignOutAlt />
              </div>
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

              <div className="stat-icon purple">
                <FaHistory />
              </div>
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
            <>
              {renderVisitorTable(
                paginatedTodayVisits,
                "No visitors today",
                "Registered visitors will appear here.",
              )}

              {renderPagination(
                todayPage,
                setTodayPage,
                todayTotalPages,
                filteredTodayVisits.length,
              )}
            </>
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
            <>
              {renderVisitorTable(
                paginatedYesterdayVisits,
                "No visitors yesterday",
                "No visitor records were found for yesterday.",
              )}

              {renderPagination(
                yesterdayPage,
                setYesterdayPage,
                yesterdayTotalPages,
                filteredYesterdayVisits.length,
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default GateDashboard;
