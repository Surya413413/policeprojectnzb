import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaClock,
  FaDoorOpen,
  FaExclamationTriangle,
  FaFilter,
  FaHistory,
  FaIdBadge,
  FaMapMarkerAlt,
  FaSearch,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";

import {
  subscribeToAllVisits,
  subscribeToVisitors,
} from "../../services/gateService";

import "../../styles/VisitorMovement.css";

function VisitorMovement() {
  const navigate = useNavigate();

  /* =========================================================
     STATE
  ========================================================= */

  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [purpose, setPurpose] = useState("ALL");

  // Date filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* =========================================================
     REAL-TIME VISITS
  ========================================================= */

  useEffect(() => {
    const unsubscribe = subscribeToAllVisits(
      (data) => {
        setVisits(data || []);
        setLoading(false);
      },
      (err) => {
        console.error("Visitor movement error:", err);

        setError("Unable to load visitor movement.");
        setLoading(false);
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     REAL-TIME VISITORS
  ========================================================= */

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data || []);
      },
      (err) => {
        console.error("Visitor information error:", err);

        setError("Unable to load visitor information.");
      },
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  /* =========================================================
     FIND VISITOR
  ========================================================= */

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  /* =========================================================
     CONVERT FIREBASE DATE
  ========================================================= */

  const getDateObject = (value) => {
    if (!value) {
      return null;
    }

    try {
      // Firebase Timestamp
      if (typeof value.toDate === "function") {
        return value.toDate();
      }

      // Firebase timestamp object
      if (typeof value.seconds === "number") {
        return new Date(value.seconds * 1000);
      }

      // JavaScript Date
      if (value instanceof Date) {
        return value;
      }

      // String / number
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  };

  /* =========================================================
     DATE KEY
  ========================================================= */

  const getDateKey = (value) => {
    const date = getDateObject(value);

    if (!date) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (value) => {
    const date = getDateObject(value);

    if (!date) {
      return "--";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = (value) => {
    const date = getDateObject(value);

    if (!date) {
      return "--";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* =========================================================
     FILTER VISITS
  ========================================================= */

  const filteredVisits = useMemo(() => {
    let filtered = [...visits];

    /* STATUS */

    if (status !== "ALL") {
      filtered = filtered.filter((visit) => visit.status === status);
    }

    /* PURPOSE */

    if (purpose !== "ALL") {
      filtered = filtered.filter((visit) => visit.purpose === purpose);
    }

    /* FROM DATE */

    if (fromDate) {
      filtered = filtered.filter((visit) => {
        const visitDate = getDateKey(visit.entryTime);

        return visitDate && visitDate >= fromDate;
      });
    }

    /* TO DATE */

    if (toDate) {
      filtered = filtered.filter((visit) => {
        const visitDate = getDateKey(visit.entryTime);

        return visitDate && visitDate <= toDate;
      });
    }

    /* SEARCH */

    const searchValue = search.trim().toLowerCase();

    if (searchValue) {
      filtered = filtered.filter((visit) => {
        const visitor = getVisitor(visit.visitorId);

        const name = visitor?.fullName?.toLowerCase() || "";

        const mobile = visitor?.mobileNumber?.toLowerCase() || "";

        const visitorCode = visit.visitorCode?.toLowerCase() || "";

        const visitCode = visit.visitCode?.toLowerCase() || "";

        return (
          name.includes(searchValue) ||
          mobile.includes(searchValue) ||
          visitorCode.includes(searchValue) ||
          visitCode.includes(searchValue)
        );
      });
    }

    return filtered;
  }, [visits, visitors, search, status, purpose, fromDate, toDate]);

  /* =========================================================
     RESET PAGINATION WHEN FILTER CHANGES
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, purpose, fromDate, toDate, pageSize]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));

  // Prevent invalid page if real-time data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedVisits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    const endIndex = startIndex + pageSize;

    return filteredVisits.slice(startIndex, endIndex);
  }, [filteredVisits, currentPage, pageSize]);

  const startRecord =
    filteredVisits.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endRecord = Math.min(currentPage * pageSize, filteredVisits.length);

  /* =========================================================
     PAGE NUMBERS
  ========================================================= */

  const pageNumbers = useMemo(() => {
    const pages = [];

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }

      return pages;
    }

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

    return pages;
  }, [currentPage, totalPages]);

  /* =========================================================
     TOTALS
  ========================================================= */

  const totalRecords = visits.length;

  const insideCount = visits.filter(
    (visit) => visit.status === "INSIDE",
  ).length;

  const exitedCount = visits.filter(
    (visit) => visit.status === "EXITED",
  ).length;

  /* =========================================================
     FILTER STATUS
  ========================================================= */

  const hasFilters =
    search.trim() !== "" ||
    status !== "ALL" ||
    purpose !== "ALL" ||
    fromDate !== "" ||
    toDate !== "";

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPurpose("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="visitor-movement-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="movement-page-header">
        <div>
          <span className="movement-label">
            <FaHistory />
            GATE PORTAL
          </span>

          <h1>Complete Visitor Register</h1>

          <p>
            Complete record of visitors entering and leaving the police station.
          </p>
        </div>

        <button
          type="button"
          className="movement-back-button"
          onClick={() => navigate("/gate")}
        >
          ← Dashboard
        </button>
      </header>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="movement-error">
          <FaExclamationTriangle />

          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="movement-summary">
        <div className="movement-summary-card">
          <div className="movement-summary-icon">
            <FaClipboardList />
          </div>

          <div>
            <span>Total Records</span>

            <strong>{loading ? "—" : totalRecords}</strong>
          </div>
        </div>

        <div className="movement-summary-card movement-summary-inside">
          <div className="movement-summary-icon">
            <FaDoorOpen />
          </div>

          <div>
            <span>Currently Inside</span>

            <strong>{loading ? "—" : insideCount}</strong>
          </div>
        </div>

        <div className="movement-summary-card movement-summary-exited">
          <div className="movement-summary-icon">
            <FaSignOutAlt />
          </div>

          <div>
            <span>Total Exited</span>

            <strong>{loading ? "—" : exitedCount}</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CARD
      ===================================================== */}

      <section className="movement-card">
        {/* HEADER */}

        <div className="movement-filter-header">
          <div className="movement-section-title">
            <div className="movement-section-icon">
              <FaHistory />
            </div>

            <div>
              <h2>Visitor Movement</h2>

              <p>Search and filter complete visitor records.</p>
            </div>
          </div>

          <span className="movement-record-count">
            <FaClipboardList />
            {filteredVisits.length} Records
          </span>
        </div>

        {/* ===================================================
            FILTERS
        =================================================== */}

        <div className="movement-filters">
          {/* SEARCH */}

          <div className="movement-search-box">
            <FaSearch />

            <input
              type="text"
              value={search}
              placeholder="Search name, mobile, visitor ID or visit ID..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {/* STATUS */}

          <div className="movement-select-box">
            <FaCheckCircle />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">All Status</option>

              <option value="INSIDE">Inside</option>

              <option value="EXITED">Exited</option>
            </select>
          </div>

          {/* PURPOSE */}

          <div className="movement-select-box">
            <FaMapMarkerAlt />

            <select
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            >
              <option value="ALL">All Purposes</option>

              <option value="Petition / Complaint">Petition / Complaint</option>

              <option value="Meeting">Meeting</option>

              <option value="Other">Other</option>
            </select>
          </div>

          {/* FROM DATE */}

          <div className="movement-date-box">
            <FaCalendarAlt />

            <div className="movement-date-content">
              <label htmlFor="movement-from-date">From Date</label>

              <input
                id="movement-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
          </div>

          {/* TO DATE */}

          <div className="movement-date-box">
            <FaCalendarAlt />

            <div className="movement-date-content">
              <label htmlFor="movement-to-date">To Date</label>

              <input
                id="movement-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          {/* CLEAR */}

          {hasFilters && (
            <button
              type="button"
              className="movement-clear-button"
              onClick={clearFilters}
            >
              <FaTimes />
              Clear
            </button>
          )}
        </div>

        {/* ===================================================
            FILTER INFORMATION
        =================================================== */}

        {hasFilters && (
          <div className="movement-filter-info">
            <FaFilter />

            <span>
              Showing <strong>{filteredVisits.length}</strong> matching record
              {filteredVisits.length !== 1 ? "s" : ""}
            </span>

            {(fromDate || toDate) && (
              <span className="movement-date-range">
                <FaCalendarAlt />

                {fromDate || "All"}

                <span>→</span>

                {toDate || "All"}
              </span>
            )}
          </div>
        )}

        {/* ===================================================
            TABLE
        =================================================== */}

        {loading ? (
          <div className="movement-empty">
            <div className="movement-spinner">
              <FaClock />
            </div>

            <p>Loading visitor records...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="movement-empty">
            <div className="movement-empty-icon">
              <FaClipboardList />
            </div>

            <h3>No records found</h3>

            <p>No visitor records match your current filters.</p>

            {hasFilters && (
              <button
                type="button"
                className="movement-empty-clear"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="movement-table-wrapper">
              <table className="movement-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Visitor</th>
                    <th>Visitor ID</th>
                    <th>Visit ID</th>
                    <th>Purpose</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedVisits.map((visit) => {
                    const visitor = getVisitor(visit.visitorId);

                    return (
                      <tr key={visit.id}>
                        {/* DATE */}

                        <td>
                          <span className="movement-date">
                            <FaCalendarAlt />

                            {formatDate(visit.entryTime)}
                          </span>
                        </td>

                        {/* VISITOR */}

                        <td>
                          <div className="movement-visitor">
                            {visitor?.photoData ? (
                              <img
                                src={visitor.photoData}
                                alt={visitor.fullName}
                              />
                            ) : (
                              <div className="movement-avatar">
                                {visitor?.fullName
                                  ?.charAt(0)
                                  ?.toUpperCase() || <FaUser />}
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                className="movement-name"
                                onClick={() =>
                                  navigate(`/gate/visitor/${visit.visitorId}`)
                                }
                              >
                                {visitor?.fullName || "--"}
                              </button>

                              <span>{visitor?.mobileNumber || "--"}</span>
                            </div>
                          </div>
                        </td>

                        {/* VISITOR ID */}

                        <td>
                          <span className="movement-code">
                            <FaIdBadge />

                            {visit.visitorCode || "--"}
                          </span>
                        </td>

                        {/* VISIT ID */}

                        <td>
                          <span className="movement-code">
                            <FaClipboardList />

                            {visit.visitCode || "--"}
                          </span>
                        </td>

                        {/* PURPOSE */}

                        <td>
                          <span className="movement-purpose">
                            <FaMapMarkerAlt />

                            {visit.purpose || "--"}
                          </span>
                        </td>

                        {/* ENTRY */}

                        <td>
                          <span className="movement-time">
                            <FaClock />

                            {formatTime(visit.entryTime)}
                          </span>
                        </td>

                        {/* EXIT */}

                        <td>
                          <span className="movement-time">
                            <FaSignOutAlt />

                            {formatTime(visit.exitTime)}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`movement-status ${
                              visit.status === "INSIDE"
                                ? "movement-inside"
                                : "movement-exited"
                            }`}
                          >
                            <span className="movement-status-dot"></span>

                            {visit.status || "UNKNOWN"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="movement-pagination">
              {/* RECORD INFORMATION */}

              <div className="movement-pagination-info">
                Showing <strong>{startRecord}</strong>
                {" – "}
                <strong>{endRecord}</strong>
                {" of "}
                <strong>{filteredVisits.length}</strong>
                {" records"}
              </div>

              {/* CONTROLS */}

              <div className="movement-pagination-controls">
                {/* PAGE SIZE */}

                <div className="movement-page-size">
                  <span>Rows</span>

                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));

                      setCurrentPage(1);
                    }}
                  >
                    <option value={25}>25</option>

                    <option value={50}>50</option>

                    <option value={100}>100</option>
                  </select>
                </div>

                {/* FIRST */}

                <button
                  type="button"
                  className="movement-page-button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="First page"
                >
                  «
                </button>

                {/* PREVIOUS */}

                <button
                  type="button"
                  className="movement-page-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  title="Previous page"
                >
                  <FaChevronLeft />
                </button>

                {/* PAGE NUMBERS */}

                <div className="movement-page-numbers">
                  {pageNumbers.map((page) => {
                    if (page === "LEFT_DOTS" || page === "RIGHT_DOTS") {
                      return (
                        <span key={page} className="movement-page-dots">
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        type="button"
                        className={`movement-page-button ${
                          currentPage === page ? "movement-page-active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* NEXT */}

                <button
                  type="button"
                  className="movement-page-button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  title="Next page"
                >
                  <FaChevronRight />
                </button>

                {/* LAST */}

                <button
                  type="button"
                  className="movement-page-button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default VisitorMovement;
