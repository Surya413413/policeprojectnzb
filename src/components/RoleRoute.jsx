import { useEffect, useState } from "react";

import { Navigate, Outlet } from "react-router-dom";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase/config";

import { getCurrentUserRole } from "../services/authService";

function RoleRoute({ allowedRole }) {
  const [loading, setLoading] = useState(true);

  const [authenticated, setAuthenticated] = useState(false);

  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) {
        return;
      }

      // Not logged in
      if (!user) {
        setAuthenticated(false);
        setRole(null);
        setLoading(false);

        return;
      }

      try {
        const userRole = await getCurrentUserRole();

        if (!mounted) {
          return;
        }

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

  // Loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role
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

  // Correct role
  return <Outlet />;
}

export default RoleRoute;
