import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaIdBadge,
  FaMapMarkerAlt,
  FaPhone,
  FaPlus,
  FaSearch,
  FaUser,
  FaUsers,
} from "react-icons/fa";

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

      if (/^[6-9]\d{9}$/.test(value)) {
        foundVisitor = await findVisitorByMobile(value);
      } else {
        foundVisitor = await fetchVisitorsBySearch(value);
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
    if (!timestamp) return "--";

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
    if (!timestamp) return "--";

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
        <section className="search-page-heading">
          <div>
            <span className="search-page-eyebrow">
              <FaSearch /> GATE PORTAL
            </span>
            <h1>Visitor Search</h1>
            <p>Search visitor records and view complete visit history.</p>
          </div>

          <button
            type="button"
            className="search-back-button"
            onClick={() => navigate("/gate")}
          >
            <FaArrowLeft />
            <span>Dashboard</span>
          </button>
        </section>

        <section className="search-card">
          <div className="search-card-heading">
            <div className="search-card-icon">
              <FaSearch />
            </div>
            <div>
              <h2>Find Visitor</h2>
              <p>Search using mobile number, visitor name or Visitor ID.</p>
            </div>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <FaSearch className="search-input-icon" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by name, mobile number or Visitor ID"
                aria-label="Search visitor"
              />
            </div>

            <button type="submit" className="search-button" disabled={loading}>
              <FaSearch />
              <span>{loading ? "Searching..." : "Search Visitor"}</span>
            </button>
          </form>

          {error && (
            <div className="search-error" role="alert">
              <span className="search-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {visitor && (
          <section className="visitor-profile-card">
            <div className="profile-photo">
              {visitor.photoData ? (
                <img src={visitor.photoData} alt={visitor.fullName} />
              ) : (
                <FaUser />
              )}
            </div>

            <div className="profile-info">
              <span className="profile-label">VISITOR PROFILE</span>
              <h2>{visitor.fullName || "Unknown Visitor"}</h2>

              <div className="profile-details">
                <span>
                  <FaPhone />
                  {visitor.mobileNumber || "--"}
                </span>

                <span>
                  <FaIdBadge />
                  {visitor.visitorCode || "--"}
                </span>
              </div>

              {visitor.address && (
                <p className="profile-address">
                  <FaMapMarkerAlt />
                  <span>{visitor.address}</span>
                </p>
              )}
            </div>

            <div className="profile-actions">
              <button type="button" onClick={() => navigate("/gate/register")}>
                <FaPlus />
                <span>New Visit</span>
              </button>
            </div>
          </section>
        )}

        {visitor && (
          <section className="history-card">
            <div className="history-header">
              <div className="history-title">
                <div className="history-icon">
                  <FaClock />
                </div>
                <div>
                  <h2>Visit History</h2>
                  <p>All recorded visits for this visitor.</p>
                </div>
              </div>

              <span className="history-count">
                <FaUsers />
                {visits.length} {visits.length === 1 ? "visit" : "visits"}
              </span>
            </div>

            {visits.length === 0 ? (
              <div className="no-history">
                <FaCalendarAlt />
                <h3>No visit history found</h3>
                <p>This visitor has no recorded visits yet.</p>
              </div>
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

                        <td>
                          <span className="history-date">
                            <FaCalendarAlt />
                            {formatDate(visit.entryTime)}
                          </span>
                        </td>

                        <td>{visit.purpose || "--"}</td>

                        <td>
                          <span className="history-time">
                            <FaClock />
                            {formatTime(visit.entryTime)}
                          </span>
                        </td>

                        <td>
                          <span className="history-time">
                            <FaClock />
                            {formatTime(visit.exitTime)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`history-status ${
                              visit.status === "INSIDE" ? "inside" : "exited"
                            }`}
                          >
                            {visit.status === "INSIDE" ? (
                              <FaCheckCircle />
                            ) : (
                              <FaCheckCircle />
                            )}
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

        {!visitor && !loading && !searched && (
          <div className="search-empty">
            <div className="search-empty-icon">
              <FaSearch />
            </div>
            <h3>Search Visitor Records</h3>
            <p>
              Enter a visitor&apos;s name, mobile number or Visitor ID to view
              their records and visit history.
            </p>
          </div>
        )}

        {!visitor && loading && (
          <div className="search-empty search-loading-state">
            <div className="search-loading-icon">
              <FaSearch />
            </div>
            <h3>Searching visitor records</h3>
            <p>Please wait while the visitor records are checked.</p>
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
 * This reads the visitors collection and performs a client-side
 * name / Visitor ID match, preserving the existing search behavior.
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
