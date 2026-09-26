import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaSignInAlt } from "react-icons/fa";

import "../styles/Login.css";
import { auth } from "../firebase/config";
import { getCurrentUserRole } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  const redirectByRole = (role) => {
    if (role === "WATCHMAN") {
      navigate("/gate", { replace: true });
      return true;
    }

    if (role === "POLICE") {
      navigate("/police", { replace: true });
      return true;
    }

    if (role === "COMMISSIONER") {
      navigate("/commissioner", { replace: true });
      return true;
    }

    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        const userRole = await getCurrentUserRole();

        if (!userRole) {
          await signOut(auth);
          setError(
            "Your account role is not configured. Please contact the administrator.",
          );
          setCheckingAuth(false);
          return;
        }

        if (!redirectByRole(userRole.role)) {
          await signOut(auth);
          setError("Invalid account role. Please contact the administrator.");
        }
      } catch (error) {
        console.error("Authentication check error:", error);

        await signOut(auth);
        setError("Unable to verify your account.");
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      const userRole = await getCurrentUserRole();

      if (!userRole) {
        await signOut(auth);
        setError(
          "Your account role is not configured. Please contact the administrator.",
        );
        return;
      }

      if (!redirectByRole(userRole.role)) {
        await signOut(auth);
        setError("Invalid account role. Please contact the administrator.");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else {
        setError(error.message || "Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="login-page login-loading-page">
        <div className="login-loading">
          <div className="login-loading-title">
            <FaShieldAlt aria-hidden="true" />
            Checking account...
          </div>
          <div className="login-loading-subtitle">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <FaShieldAlt />
          </div>

          <h1>POLICESETU AI</h1>
          <p>Secure Station Management Portal</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Sign In</h2>
            <p>Sign in using your authorized account</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="login-button">
              <FaSignInAlt aria-hidden="true" />

              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="login-footer">
          POLICESETU AI • Secure Station Management
        </p>
      </div>
    </div>
  );
}

export default Login;
