import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  subscribeToVisitsByDate,
  subscribeToVisitors,
} from "../../services/gateService";

import "../../styles/PoliceHistory.css";

function PoliceHistory() {
  const navigate = useNavigate();

  const getTodayDate = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD VISITORS
  // ==========================================

  useEffect(() => {
    const unsubscribe = subscribeToVisitors(
      (data) => {
        setVisitors(data);
      },
      (error) => {
        console.error("Police history visitor error:", error);

        setError("Unable to load visitor information.");
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // LOAD VISITS FOR SELECTED DATE
  // ==========================================

  useEffect(() => {
    setLoading(true);
    setError("");

    const date = new Date(`${selectedDate}T00:00:00`);

    const unsubscribe = subscribeToVisitsByDate(
      date,
      (data) => {
        setVisits(data);
        setLoading(false);
      },
      (error) => {
        console.error("Police history error:", error);

        setError("Unable to load visit history.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [selectedDate]);

  // ==========================================
  // VISITOR LOOKUP
  // ==========================================

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredVisits = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return visits;
    }

    return visits.filter((visit) => {
      const visitor = getVisitor(visit.visitorId);

      return (
        visitor?.fullName?.toLowerCase().includes(value) ||
        visitor?.mobileNumber?.toLowerCase().includes(value) ||
        visitor?.visitorCode?.toLowerCase().includes(value) ||
        visit.visitorCode?.toLowerCase().includes(value) ||
        visit.visitCode?.toLowerCase().includes(value) ||
        visit.purpose?.toLowerCase().includes(value)
      );
    });
  }, [visits, visitors, search]);

  // ==========================================
  // FORMAT DATE
  // ==========================================

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
  // SET TODAY
  // ==========================================

  const handleToday = () => {
    setSelectedDate(getTodayDate());
  };

  // ==========================================
  // DATE DISPLAY
  // ==========================================

  const displaySelectedDate = () => {
    if (!selectedDate) {
      return "--";
    }

    try {
      return new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  };

  return (
    <div className="police-history-page">
      {/* =====================================
          HEADER
      ====================================== */}

      <header className="police-history-header">
        <div>
          <button
            type="button"
            className="history-back-button"
            onClick={() => navigate("/police")}
          >
            ← Dashboard
          </button>

          <h1>Visit History</h1>

          <p>View visitor movement records by date</p>
        </div>

        <div className="history-count-card">
          <span>Visits</span>

          <strong>{loading ? "—" : filteredVisits.length}</strong>
        </div>
      </header>

      {/* =====================================
          DATE FILTER
      ====================================== */}

      <section className="history-filter-card">
        <div className="history-date-section">
          <label htmlFor="history-date">Select Date</label>

          <div className="history-date-controls">
            <input
              id="history-date"
              type="date"
              value={selectedDate}
              max={getTodayDate()}
              onChange={(event) => setSelectedDate(event.target.value)}
            />

            <button
              type="button"
              onClick={handleToday}
              className="history-today-button"
            >
              Today
            </button>
          </div>
        </div>

        <div className="history-selected-date">
          <span>SHOWING RECORDS FOR</span>

          <strong>{displaySelectedDate()}</strong>
        </div>
      </section>

      {/* =====================================
          SEARCH
      ====================================== */}

      <div className="history-search-box">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by visitor name, mobile, visitor ID, visit ID or purpose..."
        />

        {search && (
          <button type="button" onClick={() => setSearch("")}>
            Clear
          </button>
        )}
      </div>

      {/* =====================================
          ERROR
      ====================================== */}

      {error && <div className="history-error">{error}</div>}

      {/* =====================================
          TABLE
      ====================================== */}

      {loading ? (
        <div className="history-empty">
          <div className="history-spinner"></div>

          <p>Loading visit history...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">🕒</div>

          <h2>No Visits Found</h2>

          <p>There are no visitor records for {displaySelectedDate()}.</p>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visitor ID</th>
                <th>Visit ID</th>
                <th>Purpose</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredVisits.map((visit) => {
                const visitor = getVisitor(visit.visitorId);

                return (
                  <tr key={visit.id}>
                    {/* VISITOR */}

                    <td>
                      <div className="history-visitor">
                        {visitor?.photoData ? (
                          <img
                            src={visitor.photoData}
                            alt={visitor.fullName || "Visitor"}
                            className="history-photo"
                          />
                        ) : (
                          <div className="history-avatar">
                            {visitor?.fullName?.charAt(0)?.toUpperCase() || "V"}
                          </div>
                        )}

                        <div>
                          <strong>{visitor?.fullName || "--"}</strong>

                          <span>{visitor?.mobileNumber || "No mobile"}</span>
                        </div>
                      </div>
                    </td>

                    {/* VISITOR ID */}

                    <td>
                      <span className="history-code">
                        {visit.visitorCode || visitor?.visitorCode || "--"}
                      </span>
                    </td>

                    {/* VISIT ID */}

                    <td>
                      <span className="history-code">
                        {visit.visitCode || "--"}
                      </span>
                    </td>

                    {/* PURPOSE */}

                    <td>{visit.purpose || "--"}</td>

                    {/* ENTRY */}

                    <td>
                      <div className="history-date-time">
                        <strong>{formatDate(visit.entryTime)}</strong>

                        <span>{formatTime(visit.entryTime)}</span>
                      </div>
                    </td>

                    {/* EXIT */}

                    <td>
                      <div className="history-date-time">
                        <strong>{formatDate(visit.exitTime)}</strong>

                        <span>{formatTime(visit.exitTime)}</span>
                      </div>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`history-status ${
                          visit.status === "INSIDE" ? "inside" : "exited"
                        }`}
                      >
                        <span className="history-status-dot"></span>

                        {visit.status || "UNKNOWN"}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <button
                        type="button"
                        className="history-view-button"
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

      {/* RESULT */}

      {!loading && filteredVisits.length > 0 && (
        <div className="history-result-count">
          Showing <strong>{filteredVisits.length}</strong> of{" "}
          <strong>{visits.length}</strong> visits for{" "}
          <strong>{displaySelectedDate()}</strong>
        </div>
      )}
    </div>
  );
}

export default PoliceHistory;
