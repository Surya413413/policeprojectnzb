import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaIdBadge,
  FaMapMarkerAlt,
  FaPhone,
  FaPrint,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";

import { db } from "../../firebase/config";
import "../../styles/GatePass.css";

function GatePass() {
  const { visitId } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadGatePass = async () => {
      try {
        setLoading(true);
        setError("");

        if (!visitId) {
          throw new Error("Visit ID is missing.");
        }

        const visitRef = doc(db, "visits", visitId);
        const visitSnapshot = await getDoc(visitRef);

        if (!visitSnapshot.exists()) {
          throw new Error("Visit record not found.");
        }

        const visitData = {
          id: visitSnapshot.id,
          ...visitSnapshot.data(),
        };

        setVisit(visitData);

        if (!visitData.visitorId) {
          throw new Error("Visitor ID is missing from this visit.");
        }

        const visitorRef = doc(db, "visitors", visitData.visitorId);
        const visitorSnapshot = await getDoc(visitorRef);

        if (!visitorSnapshot.exists()) {
          throw new Error("Visitor record not found.");
        }

        setVisitor({
          id: visitorSnapshot.id,
          ...visitorSnapshot.data(),
        });
      } catch (error) {
        console.error("Gate pass loading error:", error);
        setError(error.message || "Unable to load gate pass.");
      } finally {
        setLoading(false);
      }
    };

    loadGatePass();
  }, [visitId]);

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="gate-pass-page">
        <div className="gate-pass-state">
          <div className="gate-pass-state-icon">
            <FaShieldAlt />
          </div>
          <h2>Loading Gate Pass</h2>
          <p>Retrieving visitor and visit details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gate-pass-page">
        <div className="gate-pass-error">
          <div className="gate-pass-error-icon">!</div>
          <h2>Unable to Load Gate Pass</h2>
          <p>{error}</p>

          <button type="button" onClick={() => navigate("/gate")}>
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-pass-page">
      <div className="gate-pass-actions">
        <button type="button" onClick={() => navigate("/gate")}>
          <FaArrowLeft />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className="print-pass-button"
          onClick={handlePrint}
        >
          <FaPrint />
          <span>Print Gate Pass</span>
        </button>
      </div>

      <article className="gate-pass-card">
        <header className="gate-pass-header">
          <div className="gate-pass-brand">
            <div className="gate-pass-logo">
              <FaShieldAlt />
            </div>

            <div>
              <h1>POLICESETU AI</h1>
              <p>Smart Police Grievance Management</p>
            </div>
          </div>

          <div className="gate-pass-title">
            <span>GATE PASS</span>
            <strong>VISITOR</strong>
          </div>
        </header>

        <section className="gate-pass-id-section">
          <div>
            <span>VISITOR ID</span>
            <strong>{visitor.visitorCode || "--"}</strong>
          </div>

          <div className="pass-issued">
            <span>PASS TYPE</span>
            <strong>OFFICIAL VISITOR</strong>
          </div>
        </section>

        <section className="gate-pass-body">
          <div className="gate-pass-photo">
            {visitor.photoData ? (
              <img
                src={visitor.photoData}
                alt={visitor.fullName || "Visitor"}
              />
            ) : (
              <FaUser />
            )}
          </div>

          <div className="gate-pass-details">
            <div className="pass-detail">
              <span>
                <FaUser /> FULL NAME
              </span>
              <strong>{visitor.fullName || "--"}</strong>
            </div>

            <div className="pass-detail">
              <span>
                <FaPhone /> MOBILE NUMBER
              </span>
              <strong>{visitor.mobileNumber || "--"}</strong>
            </div>

            <div className="pass-detail">
              <span>
                <FaIdBadge /> PURPOSE OF VISIT
              </span>
              <strong>{visit.purpose || "--"}</strong>
            </div>

            <div className="pass-detail">
              <span>
                <FaClock /> ENTRY TIME
              </span>
              <strong>{formatDateTime(visit.entryTime)}</strong>
            </div>

            {visitor.address && (
              <div className="pass-detail pass-address">
                <span>
                  <FaMapMarkerAlt /> ADDRESS
                </span>
                <strong>{visitor.address}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="gate-pass-status">
          <div>
            <span>CURRENT STATUS</span>
            <p>
              {visit.status === "INSIDE"
                ? "Visitor is currently inside the station"
                : "Visitor has exited the station"}
            </p>
          </div>

          <strong
            className={
              visit.status === "INSIDE" ? "pass-inside" : "pass-exited"
            }
          >
            <FaCheckCircle />
            {visit.status || "UNKNOWN"}
          </strong>
        </section>

        <section className="gate-pass-visit">
          <div>
            <span>VISIT ID</span>
            <strong>{visit.visitCode || "--"}</strong>
          </div>

          <div>
            <span>REGISTERED BY</span>
            <strong>Gate Watchman</strong>
          </div>

          <div>
            <span>ENTRY DATE</span>
            <strong>{formatDateTime(visit.entryTime)}</strong>
          </div>

          <div>
            <span>EXIT TIME</span>
            <strong>{formatDateTime(visit.exitTime)}</strong>
          </div>
        </section>

        <footer className="gate-pass-footer">
          <div className="footer-brand">
            <FaShieldAlt />
            <strong>POLICESETU AI</strong>
          </div>

          <p>This gate pass is generated by POLICESETU AI.</p>
          <span>Please retain this pass until exit.</span>
        </footer>
      </article>
    </div>
  );
}

export default GatePass;
