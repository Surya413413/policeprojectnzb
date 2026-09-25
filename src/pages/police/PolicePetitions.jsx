import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  subscribeToVisitsByDate,
  subscribeToVisitors,
} from "../../services/gateService";

import "../../styles/PolicePetitions.css";

function PolicePetitions() {
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD TODAY'S VISITS
  // ==========================================

  useEffect(() => {
    const unsubscribe = subscribeToVisitsByDate(
      new Date(),
      (data) => {
        setVisits(data);
        setLoading(false);
      },
      (error) => {
        console.error("Police petition visits error:", error);

        setError("Unable to load petition visitors.");

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
  // FILTER PETITION / COMPLAINT VISITS
  // ==========================================

  const petitionVisits = useMemo(() => {
    return visits.filter((visit) => visit.purpose === "Petition / Complaint");
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
      return petitionVisits;
    }

    return petitionVisits.filter((visit) => {
      const visitor = getVisitor(visit.visitorId);

      return (
        visitor?.fullName?.toLowerCase().includes(value) ||
        visitor?.mobileNumber?.toLowerCase().includes(value) ||
        visitor?.visitorCode?.toLowerCase().includes(value) ||
        visit.visitorCode?.toLowerCase().includes(value) ||
        visit.visitCode?.toLowerCase().includes(value)
      );
    });
  }, [petitionVisits, visitors, search]);

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
    <div className="police-petitions-page">
      {/* HEADER */}

      <header className="police-petitions-header">
        <div>
          <button
            type="button"
            className="petitions-back-button"
            onClick={() => navigate("/police")}
          >
            ← Dashboard
          </button>

          <h1>Petitions / Complaints</h1>

          <p>Today's visitors who came for petitions or complaints</p>
        </div>

        <div className="petitions-count-card">
          <span>Today's Petitions</span>

          <strong>{loading ? "—" : petitionVisits.length}</strong>
        </div>
      </header>

      {/* ERROR */}

      {error && <div className="petitions-error">{error}</div>}

      {/* SEARCH */}

      <div className="petitions-search-box">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by visitor name, mobile number, visitor ID or visit ID..."
        />

        {search && (
          <button type="button" onClick={() => setSearch("")}>
            Clear
          </button>
        )}
      </div>

      {/* CONTENT */}

      {loading ? (
        <div className="petitions-empty">
          <div className="petitions-spinner"></div>

          <p>Loading petition visitors...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="petitions-empty">
          <div className="petitions-empty-icon">📄</div>

          <h2>No Petitions Today</h2>

          <p>No petition or complaint visitors have been registered today.</p>
        </div>
      ) : (
        <div className="petitions-table-wrapper">
          <table className="petitions-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visitor ID</th>
                <th>Visit ID</th>
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
                      <div className="petition-visitor">
                        {visitor?.photoData ? (
                          <img
                            src={visitor.photoData}
                            alt={visitor.fullName || "Visitor"}
                            className="petition-photo"
                          />
                        ) : (
                          <div className="petition-avatar">
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
                      <span className="petition-code">
                        {visit.visitorCode || visitor?.visitorCode || "--"}
                      </span>
                    </td>

                    {/* VISIT ID */}

                    <td>
                      <span className="petition-code">
                        {visit.visitCode || "--"}
                      </span>
                    </td>

                    {/* DATE */}

                    <td>{formatDate(visit.entryTime)}</td>

                    {/* TIME */}

                    <td>{formatTime(visit.entryTime)}</td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`petition-status ${
                          visit.status === "INSIDE" ? "inside" : "exited"
                        }`}
                      >
                        <span className="petition-status-dot"></span>

                        {visit.status || "UNKNOWN"}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <button
                        type="button"
                        className="petition-view-button"
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
        <div className="petitions-result-count">
          Showing <strong>{filteredVisits.length}</strong> petition visitor
          {filteredVisits.length !== 1 ? "s" : ""} today
        </div>
      )}
    </div>
  );
}

export default PolicePetitions;
