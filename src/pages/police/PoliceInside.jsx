import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEye,
  FaSearch,
  FaTimes,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

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

  const insideVisits = useMemo(() => {
    return visits.filter((visit) => visit.status === "INSIDE");
  }, [visits]);

  const getVisitor = (visitorId) => {
    return visitors.find((visitor) => visitor.id === visitorId);
  };

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
      <header className="police-inside-header">
        <div className="inside-header-content">
          <button
            type="button"
            className="inside-back-button"
            onClick={() => navigate("/police")}
          >
            <FaArrowLeft />
            <span>Dashboard</span>
          </button>

          <div className="inside-title-row">
            <div className="inside-title-icon">
              <FaUserClock />
            </div>

            <div>
              <h1>Currently Inside</h1>
              <p>Visitors currently inside the police station</p>
            </div>
          </div>
        </div>

        <div className="inside-count-card">
          <div className="inside-count-icon">
            <FaUsers />
          </div>

          <div>
            <span>Currently Inside</span>
            <strong>{loading ? "—" : insideVisits.length}</strong>
          </div>
        </div>
      </header>

      {error && (
        <div className="inside-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            title="Dismiss error"
          >
            <FaTimes />
          </button>
        </div>
      )}

      <div className="inside-search-box">
        <FaSearch className="inside-search-icon" />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, mobile, visitor code or purpose..."
        />

        {search && (
          <button
            type="button"
            className="inside-clear-button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            title="Clear search"
          >
            <FaTimes />
            <span>Clear</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="inside-empty">
          <div className="inside-spinner"></div>
          <p>Loading current visitors...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="inside-empty">
          <div className="inside-empty-icon">
            <FaCheckCircle />
          </div>

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

                    <td>
                      <span className="inside-code">
                        {visit.visitorCode || visitor?.visitorCode || "--"}
                      </span>
                    </td>

                    <td>
                      <span className="inside-purpose">
                        {visit.purpose || "--"}
                      </span>
                    </td>

                    <td>{formatDate(visit.entryTime)}</td>

                    <td>{formatTime(visit.entryTime)}</td>

                    <td>
                      <span className="inside-status">
                        <span className="inside-status-dot"></span>
                        INSIDE
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="inside-view-button"
                        onClick={() =>
                          navigate(`/police/visitors/${visit.visitorId}`)
                        }
                      >
                        <FaEye />
                        <span>View</span>
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
