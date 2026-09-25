import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  subscribeToAllVisits,
  subscribeToVisitors,
} from "../../services/gateService";

import "../../styles/PoliceInside.css";

function PoliceInside() {
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD VISITS
  // ==========================================

  useEffect(() => {
    const unsubscribe = subscribeToAllVisits(
      (data) => {
        setVisits(data);
        setLoading(false);
      },
      (error) => {
        console.error("Police inside visitors error:", error);

        setError("Unable to load current visitors.");

        setLoading(false);
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
  // FIND CURRENTLY INSIDE VISITS
  // ==========================================

  const insideVisits = useMemo(() => {
    return visits.filter((visit) => visit.status === "INSIDE");
  }, [visits]);

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
      return insideVisits;
    }

    return insideVisits.filter((visit) => {
      const visitor = getVisitor(visit.visitorId);

      return (
        visitor?.fullName?.toLowerCase().includes(value) ||
        visitor?.mobileNumber?.toLowerCase().includes(value) ||
        visitor?.visitorCode?.toLowerCase().includes(value) ||
        visit.visitorCode?.toLowerCase().includes(value) ||
        visit.purpose?.toLowerCase().includes(value)
      );
    });
  }, [insideVisits, visitors, search]);

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

  return (
    <div className="police-inside-page">
      {/* HEADER */}

      <header className="police-inside-header">
        <div>
          <button
            type="button"
            className="inside-back-button"
            onClick={() => navigate("/police")}
          >
            ← Dashboard
          </button>

          <h1>Currently Inside</h1>

          <p>Visitors currently inside the police station</p>
        </div>

        <div className="inside-count-card">
          <span>Currently Inside</span>

          <strong>{loading ? "—" : insideVisits.length}</strong>
        </div>
      </header>

      {/* ERROR */}

      {error && <div className="inside-error">{error}</div>}

      {/* SEARCH */}

      <div className="inside-search-box">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, mobile, visitor code or purpose..."
        />

        {search && (
          <button type="button" onClick={() => setSearch("")}>
            Clear
          </button>
        )}
      </div>

      {/* CONTENT */}

      {loading ? (
        <div className="inside-empty">
          <div className="inside-spinner"></div>

          <p>Loading current visitors...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="inside-empty">
          <div className="inside-empty-icon">✓</div>

          <h2>No Visitors Inside</h2>

          <p>There are currently no visitors inside the station.</p>
        </div>
      ) : (
        <div className="inside-table-wrapper">
          <table className="inside-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visitor ID</th>
                <th>Purpose</th>
                <th>Entry Date</th>
                <th>Entry Time</th>
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
                      <div className="inside-visitor">
                        {visitor?.photoData ? (
                          <img
                            src={visitor.photoData}
                            alt={visitor.fullName || "Visitor"}
                            className="inside-photo"
                          />
                        ) : (
                          <div className="inside-avatar">
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
                      <span className="inside-code">
                        {visit.visitorCode || visitor?.visitorCode || "--"}
                      </span>
                    </td>

                    {/* PURPOSE */}

                    <td>
                      <span className="inside-purpose">
                        {visit.purpose || "--"}
                      </span>
                    </td>

                    {/* DATE */}

                    <td>{formatDate(visit.entryTime)}</td>

                    {/* TIME */}

                    <td>{formatTime(visit.entryTime)}</td>

                    {/* STATUS */}

                    <td>
                      <span className="inside-status">
                        <span className="inside-status-dot"></span>
                        INSIDE
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <button
                        type="button"
                        className="inside-view-button"
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

      {!loading && filteredVisits.length > 0 && (
        <div className="inside-result-count">
          Showing <strong>{filteredVisits.length}</strong> visitor
          {filteredVisits.length !== 1 ? "s" : ""} currently inside
        </div>
      )}
    </div>
  );
}

export default PoliceInside;
