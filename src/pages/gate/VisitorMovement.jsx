import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
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
  FaUser,
  FaUsers,
} from "react-icons/fa";

import {
  subscribeToAllVisits,
  subscribeToVisitors,
} from "../../services/gateService";

import "../../styles/VisitorMovement.css";

function VisitorMovement() {
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [purpose, setPurpose] = useState("ALL");

  // =========================================================
  // LOAD ALL VISITS
  // =========================================================

  useEffect(() => {
    const unsubscribe = subscribeToAllVisits(
      (data) => {
        setVisits(data);
        setLoading(false);
      },
      (error) => {
        console.error("Visitor movement error:", error);

        setError("Unable to load visitor movement.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // LOAD VISITORS
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
  // FORMAT DATE
  // =========================================================

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
  // FILTER
  // =========================================================

  const filteredVisits = useMemo(() => {
    let filtered = [...visits];

    // Status
    if (status !== "ALL") {
      filtered = filtered.filter((visit) => visit.status === status);
    }

    // Purpose
    if (purpose !== "ALL") {
      filtered = filtered.filter((visit) => visit.purpose === purpose);
    }

    // Search
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
  }, [visits, visitors, search, status, purpose]);

  // =========================================================
  // TOTALS
  // =========================================================

  const totalRecords = visits.length;

  const insideCount = visits.filter(
    (visit) => visit.status === "INSIDE",
  ).length;

  const exitedCount = visits.filter(
    (visit) => visit.status === "EXITED",
  ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="visitor-movement-page">
      {/* HEADER */}

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

      {/* ERROR */}

      {error && (
        <div className="movement-error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}

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

      {/* FILTERS */}

      <section className="movement-card">
        <div className="movement-filter-header">
          <div>
            <h2>Visitor Movement</h2>

            <p>Search and filter complete visitor records.</p>
          </div>

          <span className="movement-record-count">
            <FaClipboardList />
            {filteredVisits.length} Records
          </span>
        </div>

        <div className="movement-filters">
          <input
            type="text"
            placeholder="Search name, mobile, visitor ID or visit ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All Status</option>

            <option value="INSIDE">Inside</option>

            <option value="EXITED">Exited</option>
          </select>

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

        {/* TABLE */}

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
          </div>
        ) : (
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
                {filteredVisits.map((visit) => {
                  const visitor = getVisitor(visit.visitorId);

                  return (
                    <tr key={visit.id}>
                      <td>
                        <span className="movement-date">
                          <FaCalendarAlt />
                          {formatDate(visit.entryTime)}
                        </span>
                      </td>

                      <td>
                        <div className="movement-visitor">
                          {visitor?.photoData ? (
                            <img
                              src={visitor.photoData}
                              alt={visitor.fullName}
                            />
                          ) : (
                            <div className="movement-avatar">
                              {visitor?.fullName?.charAt(0)?.toUpperCase() || (
                                <FaUser />
                              )}
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

                      <td>
                        <span className="movement-code">
                          <FaIdBadge />
                          {visit.visitorCode || "--"}
                        </span>
                      </td>

                      <td>
                        <span className="movement-code">
                          <FaClipboardList />
                          {visit.visitCode || "--"}
                        </span>
                      </td>

                      <td>
                        <span className="movement-purpose">
                          <FaMapMarkerAlt />
                          {visit.purpose || "--"}
                        </span>
                      </td>

                      <td>
                        <span className="movement-time">
                          <FaClock />
                          {formatTime(visit.entryTime)}
                        </span>
                      </td>

                      <td>
                        <span className="movement-time">
                          <FaSignOutAlt />
                          {formatTime(visit.exitTime)}
                        </span>
                      </td>

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
        )}
      </section>
    </div>
  );
}

export default VisitorMovement;
