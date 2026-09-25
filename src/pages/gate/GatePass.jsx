import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

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

        // Get visit
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

        // Get visitor
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
    if (!timestamp) {
      return "--";
    }

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
        <div className="gate-pass-loading">Loading gate pass...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gate-pass-page">
        <div className="gate-pass-error">
          <h2>Unable to Load Gate Pass</h2>

          <p>{error}</p>

          <button type="button" onClick={() => navigate("/gate")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-pass-page">
      <div className="gate-pass-actions">
        <button type="button" onClick={() => navigate("/gate")}>
          ← Dashboard
        </button>

        <button type="button" onClick={handlePrint}>
          🖨 Print Gate Pass
        </button>
      </div>

      <div className="gate-pass-card">
        {/* Header */}

        <div className="gate-pass-header">
          <div className="gate-pass-brand">
            <div className="gate-pass-logo">PS</div>

            <div>
              <h1>POLICESETU AI</h1>

              <p>Smart Police Grievance Management</p>
            </div>
          </div>

          <div className="gate-pass-title">
            <span>GATE PASS</span>

            <strong>VISITOR</strong>
          </div>
        </div>

        {/* Pass ID */}

        <div className="gate-pass-id-section">
          <span>VISITOR ID</span>

          <strong>{visitor.visitorCode}</strong>
        </div>

        {/* Visitor */}

        <div className="gate-pass-body">
          <div className="gate-pass-photo">
            {visitor.photoData ? (
              <img src={visitor.photoData} alt={visitor.fullName} />
            ) : (
              <span>{visitor.fullName?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>

          <div className="gate-pass-details">
            <div className="pass-detail">
              <span>FULL NAME</span>

              <strong>{visitor.fullName}</strong>
            </div>

            <div className="pass-detail">
              <span>MOBILE NUMBER</span>

              <strong>{visitor.mobileNumber}</strong>
            </div>

            <div className="pass-detail">
              <span>PURPOSE OF VISIT</span>

              <strong>{visit.purpose}</strong>
            </div>

            <div className="pass-detail">
              <span>ENTRY TIME</span>

              <strong>{formatDateTime(visit.entryTime)}</strong>
            </div>

            {visitor.address && (
              <div className="pass-detail pass-address">
                <span>ADDRESS</span>

                <strong>{visitor.address}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Status */}

        <div className="gate-pass-status">
          <span>CURRENT STATUS</span>

          <strong
            className={
              visit.status === "INSIDE" ? "pass-inside" : "pass-exited"
            }
          >
            {visit.status}
          </strong>
        </div>

        {/* Visit ID */}

        <div className="gate-pass-visit">
          <div>
            <span>VISIT ID</span>

            <strong>{visit.visitCode}</strong>
          </div>

          <div>
            <span>REGISTERED BY</span>

            <strong>Gate Watchman</strong>
          </div>
        </div>

        {/* Footer */}

        <div className="gate-pass-footer">
          <p>This gate pass is generated by POLICESETU AI.</p>

          <span>Please retain this pass until exit.</span>
        </div>
      </div>
    </div>
  );
}

export default GatePass;
