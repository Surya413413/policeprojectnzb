import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase/config";
import { getCurrentUserRole } from "../services/authService";

import "../styles/RoleRoute.css";

function RoleRoute({ allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      if (!user) {
        setAuthenticated(false);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRole = await getCurrentUserRole();

        if (!mounted) return;

        setAuthenticated(true);
        setRole(userRole?.role || null);
      } catch (error) {
        console.error("Role check failed:", error);

        setAuthenticated(true);
        setRole(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="policesetu-loader">
        <div className="policesetu-loader-box">
          <img
            src="/logo.png"
            alt="Nizamabad Police Commissionerate"
            className="policesetu-loader-logo"
          />

          <div className="policesetu-loader-title">POLICESETU AI</div>

          <div className="policesetu-loader-subtitle">
            Nizamabad Police Commissionerate
          </div>

          <div className="policesetu-loader-spinner"></div>

          <div className="policesetu-loader-status">
            Verifying secure access...
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     NOT LOGGED IN
  ========================= */

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  /* =========================
     WRONG ROLE
  ========================= */

  if (role !== allowedRole) {
    if (role === "WATCHMAN") {
      return <Navigate to="/gate" replace />;
    }

    if (role === "POLICE") {
      return <Navigate to="/police" replace />;
    }

    if (role === "COMMISSIONER") {
      return <Navigate to="/commissioner" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  /* =========================
     CORRECT ROLE
  ========================= */

  return <Outlet />;
}

export default RoleRoute;
