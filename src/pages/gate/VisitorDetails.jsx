import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaDoorOpen,
  FaExclamationTriangle,
  FaHistory,
  FaIdBadge,
  FaMapMarkerAlt,
  FaPhone,
  FaSignOutAlt,
  FaUser,
  FaUserPlus,
} from "react-icons/fa";

import { db } from "../../firebase/config";
import { getVisitorVisitHistory } from "../../services/visitorService";
import { checkoutVisit } from "../../services/gateService";
import "../../styles/VisitorDetails.css";

function VisitorDetails() {
  const { visitorId } = useParams();
  const navigate = useNavigate();

  const [visitor, setVisitor] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVisitor = async () => {
      try {
        setLoading(true);
        setError("");

        if (!visitorId) {
          throw new Error("Visitor ID is missing.");
        }

        const visitorRef = doc(db, "visitors", visitorId);
        const visitorSnapshot = await getDoc(visitorRef);

        if (!visitorSnapshot.exists()) {
          throw new Error("Visitor record not found.");
        }

        const visitorData = {
          id: visitorSnapshot.id,
          ...visitorSnapshot.data(),
        };

        setVisitor(visitorData);

        const history = await getVisitorVisitHistory(visitorId);
        setVisits(history);
      } catch (error) {
        console.error("Load visitor details error:", error);
        setError(error.message || "Unable to load visitor details.");
      } finally {
        setLoading(false);
      }
    };

    loadVisitor();
  }, [visitorId]);

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "--";

    try {
      return timestamp.toDate().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--";
    }
  };

  const activeVisit = visits.find((visit) => visit.status === "INSIDE");

  const handleCheckout = async () => {
    if (!activeVisit) return;

    const confirmed = window.confirm(`Check out ${visitor.fullName}?`);
    if (!confirmed) return;

    try {
      setCheckingOut(true);
      await checkoutVisit(activeVisit.id);

      const updatedHistory = await getVisitorVisitHistory(visitorId);
      setVisits(updatedHistory);
    } catch (error) {
      console.error("Checkout failed:", error);
      setError("Unable to check out visitor.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="visitor-details-page">
        <div className="visitor-details-loading">
          <FaClock />
          <span>Loading visitor details...</span>
        </div>
      </div>
    );
  }

  if (error && !visitor) {
    return (
      <div className="visitor-details-page">
        <div className="visitor-details-error">
          <div className="details-state-icon error-state">
            <FaExclamationTriangle />
          </div>
          <h2>Unable to Load Visitor</h2>
          <p>{error}</p>
          <button type="button" onClick={() => navigate("/gate")}>
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-details-page">
      <div className="visitor-details-container">
        <div className="visitor-details-header">
          <div>
            <span className="page-eyebrow">
              <FaIdBadge />
              GATE PORTAL
            </span>
            <h1>Visitor Details</h1>
            <p>View visitor information and visit activity.</p>
          </div>

          <button
            type="button"
            className="details-back-button"
            onClick={() => navigate("/gate")}
          >
            <FaArrowLeft />
            Dashboard
          </button>
        </div>

        {error && (
          <div className="details-error">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        <section className="visitor-main-card">
          <div className="visitor-identity">
            <div className="visitor-main-photo">
              {visitor.photoData ? (
                <img src={visitor.photoData} alt={visitor.fullName} />
              ) : (
                <span>
                  {visitor.fullName?.charAt(0)?.toUpperCase() || <FaUser />}
                </span>
              )}
            </div>

            <div className="visitor-main-info">
              <span className="details-label">VISITOR PROFILE</span>
              <h2>{visitor.fullName}</h2>

              <div className="visitor-meta">
                <div>
                  <span className="meta-icon">
                    <FaIdBadge />
                  </span>
                  <div>
                    <strong>Visitor ID</strong>
                    <span>{visitor.visitorCode || "--"}</span>
                  </div>
                </div>

                <div>
                  <span className="meta-icon">
                    <FaPhone />
                  </span>
                  <div>
                    <strong>Mobile</strong>
                    <span>{visitor.mobileNumber || "--"}</span>
                  </div>
                </div>

                <div className="address-meta">
                  <span className="meta-icon">
                    <FaMapMarkerAlt />
                  </span>
                  <div>
                    <strong>Address</strong>
                    <span>{visitor.address || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {activeVisit ? (
            <div className="active-visit-box">
              <div className="status-heading">
                <span className="status-dot" />
                <span>CURRENT STATUS</span>
              </div>

              <strong>INSIDE</strong>

              <div className="visit-info-row">
                <FaDoorOpen />
                <span>{activeVisit.purpose || "Visit"}</span>
              </div>

              <div className="visit-info-row">
                <FaCalendarAlt />
                <span>{formatDateTime(activeVisit.entryTime)}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                <FaSignOutAlt />
                {checkingOut ? "Checking Out..." : "Check Out"}
              </button>
            </div>
          ) : (
            <div className="no-active-visit-box">
              <div className="status-heading">
                <span className="status-dot neutral-dot" />
                <span>CURRENT STATUS</span>
              </div>

              <strong>NOT INSIDE</strong>
              <small>No active visit for this visitor.</small>

              <button type="button" onClick={() => navigate("/gate/register")}>
                <FaUserPlus />
                Register New Visit
              </button>
            </div>
          )}
        </section>

        <section className="visitor-history-card">
          <div className="visitor-history-heading">
            <div className="history-title">
              <div className="section-icon">
                <FaHistory />
              </div>
              <div>
                <h2>Visit History</h2>
                <p>Complete visit records for this visitor.</p>
              </div>
            </div>

            <span className="visit-count">{visits.length} Visits</span>
          </div>

          {visits.length === 0 ? (
            <div className="details-no-history">
              <FaHistory />
              <strong>No visit history</strong>
              <span>No visit records are available for this visitor.</span>
            </div>
          ) : (
            <div className="details-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Visit ID</th>
                    <th>Purpose</th>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <span className="visit-code">
                          <FaIdBadge />
                          {visit.visitCode || "--"}
                        </span>
                      </td>
                      <td>{visit.purpose || "--"}</td>
                      <td>
                        <span className="table-date">
                          <FaCalendarAlt />
                          {formatDateTime(visit.entryTime)}
                        </span>
                      </td>
                      <td>
                        <span className="table-date">
                          <FaCalendarAlt />
                          {formatDateTime(visit.exitTime)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            visit.status === "INSIDE"
                              ? "detail-status-inside"
                              : "detail-status-exited"
                          }
                        >
                          {visit.status === "INSIDE" && <FaCheckCircle />}
                          {visit.status === "INSIDE" ? "INSIDE" : "EXITED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default VisitorDetails;
