import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

import {
  findVisitorByMobile,
  getVisitorVisitHistory,
} from "../../services/visitorService";

import "../../styles/VisitorSearch.css";

function VisitorSearch() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");

  const [visitor, setVisitor] = useState(null);

  const [visits, setVisits] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [searched, setSearched] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();

    setError("");
    setVisitor(null);
    setVisits([]);
    setSearched(false);

    const value = searchText.trim();

    if (!value) {
      setError("Enter a name, mobile number or Visitor ID.");
      return;
    }

    try {
      setLoading(true);

      let foundVisitor = null;

      // ----------------------------------------
      // Mobile search
      // ----------------------------------------

      if (/^[6-9]\d{9}$/.test(value)) {
        foundVisitor = await findVisitorByMobile(value);
      }

      // ----------------------------------------
      // Visitor ID / Name search
      // ----------------------------------------
      else {
        const response = await fetchVisitorsBySearch(value);

        foundVisitor = response;
      }

      if (!foundVisitor) {
        setSearched(true);

        setError("No visitor found with those details.");

        return;
      }

      setVisitor(foundVisitor);

      const history = await getVisitorVisitHistory(foundVisitor.id);

      setVisits(history);

      setSearched(true);
    } catch (error) {
      console.error("Visitor search failed:", error);

      setError("Unable to search visitor.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="visitor-search-page">
      <div className="visitor-search-container">
        {/* Header */}

        <header className="search-header">
          <div>
            <span className="search-label">GATE PORTAL</span>

            <h1>Visitor Search</h1>

            <p>Search visitor records and view complete visit history.</p>
          </div>

          <button
            type="button"
            className="search-back-button"
            onClick={() => navigate("/gate")}
          >
            ← Dashboard
          </button>
        </header>

        {/* Search */}

        <section className="search-card">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by name, mobile number or Visitor ID"
              />
            </div>

            <button type="submit" className="search-button" disabled={loading}>
              {loading ? "Searching..." : "Search Visitor"}
            </button>
          </form>

          {error && <div className="search-error">{error}</div>}
        </section>

        {/* Visitor Profile */}

        {visitor && (
          <section className="visitor-profile-card">
            <div className="profile-photo">
              {visitor.photoData ? (
                <img src={visitor.photoData} alt={visitor.fullName} />
              ) : (
                <span>{visitor.fullName?.charAt(0)?.toUpperCase() || "?"}</span>
              )}
            </div>

            <div className="profile-info">
              <span className="profile-label">VISITOR PROFILE</span>

              <h2>{visitor.fullName}</h2>

              <div className="profile-details">
                <span>📱 {visitor.mobileNumber}</span>

                <span>ID: {visitor.visitorCode}</span>
              </div>

              {visitor.address && <p>{visitor.address}</p>}
            </div>

            <div className="profile-actions">
              <button type="button" onClick={() => navigate("/gate/register")}>
                New Visit
              </button>
            </div>
          </section>
        )}

        {/* Visit History */}

        {visitor && (
          <section className="history-card">
            <div className="history-header">
              <div>
                <h2>Visit History</h2>

                <p>All recorded visits for this visitor.</p>
              </div>

              <span className="history-count">{visits.length} visits</span>
            </div>

            {visits.length === 0 ? (
              <div className="no-history">No visit history found.</div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Visit ID</th>
                      <th>Date</th>
                      <th>Purpose</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <span className="history-visit-id">
                            {visit.visitCode || "--"}
                          </span>
                        </td>

                        <td>{formatDate(visit.entryTime)}</td>

                        <td>{visit.purpose || "--"}</td>

                        <td>{formatTime(visit.entryTime)}</td>

                        <td>{formatTime(visit.exitTime)}</td>

                        <td>
                          <span
                            className={`history-status ${
                              visit.status === "INSIDE" ? "inside" : "exited"
                            }`}
                          >
                            {visit.status || "UNKNOWN"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}

        {!visitor && !loading && !searched && (
          <div className="search-empty">
            <div className="search-empty-icon">⌕</div>

            <h3>Search Visitor Records</h3>

            <p>
              Enter a visitor's name, mobile number or Visitor ID to view their
              records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Search visitor by name or Visitor ID.
 *
 * NOTE:
 * This function will be replaced with
 * Firestore queries below.
 */
const fetchVisitorsBySearch = async (searchValue) => {
  try {
    const snapshot = await getDocs(collection(db, "visitors"));

    const visitors = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const search = searchValue.trim().toLowerCase();

    const visitor = visitors.find((item) => {
      const fullName = (item.fullName || "").toLowerCase();
      const visitorCode = (item.visitorCode || "").toLowerCase();

      return fullName.includes(search) || visitorCode.includes(search);
    });

    return visitor || null;
  } catch (error) {
    console.error("Visitor search error:", error);
    throw error;
  }
};

export default VisitorSearch;
