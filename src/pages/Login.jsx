import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useNavigate } from "react-router-dom";

import {
  FaArrowRight,
  FaBrain,
  FaChartLine,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import "../styles/Login.css";

import { auth } from "../firebase/config";
import { getCurrentUserRole } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="login-loading-logo">
            <img src="/logo.png" alt="Nizamabad Police Commissionerate" />
          </div>

          <div className="login-loading-title">Checking account...</div>

          <div className="login-loading-subtitle">Please wait</div>

          <span className="login-loading-line" />
        </div>
      </div>
    );
  }

  return (
    <main className="login-page">
      {/* BACKGROUND */}
      <div className="login-background" aria-hidden="true">
        <div className="login-background-overlay" />

        <div className="login-scan-line" />

        <span className="login-particle login-particle-1" />
        <span className="login-particle login-particle-2" />
        <span className="login-particle login-particle-3" />
      </div>

      {/* TOP HEADER */}
      <header className="login-header">
        <div className="login-brand">
          <div className="login-brand-icon">
            <img src="/logo.png" alt="Nizamabad Police" />
          </div>

          <div className="login-brand-copy">
            <strong>POLICESETU AI</strong>

            <span>Nizamabad Police Commissionerate</span>
          </div>
        </div>

        <div className="login-online">
          <span className="login-online-dot" />
          SYSTEM ONLINE
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="login-main">
        {/* LEFT SIDE */}
        <div className="login-identity">
          <div className="login-identity-label">
            <FaShieldAlt />
            <span>SECURE POLICE PLATFORM</span>
          </div>

          <h1>
            Smart Police
            <span>Station Management</span>
          </h1>

          <p>
            Secure digital operations for visitor management, case intelligence,
            evidence workflows and real-time station activity.
          </p>

          <div className="login-identity-line" />

          <div className="login-feature-grid">
            <div className="login-feature-card">
              <div className="login-feature-icon">
                <FaShieldAlt />
              </div>

              <div>
                <strong>SECURE ACCESS</strong>
                <span>Role Based Authentication</span>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-icon">
                <FaBrain />
              </div>

              <div>
                <strong>AI POWERED</strong>
                <span>Intelligent Operations</span>
              </div>
            </div>

            <div className="login-feature-card">
              <div className="login-feature-icon">
                <FaChartLine />
              </div>

              <div>
                <strong>REAL-TIME OPERATIONS</strong>
                <span>Live Station Management</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOGIN PANEL */}
        <div className="login-panel">
          <div className="login-panel-top">
            <div className="login-panel-logo">
              <img src="/logo.png" alt="Nizamabad Police Commissionerate" />
            </div>

            <div className="login-panel-heading">
              <span className="login-panel-kicker">OFFICER PORTAL</span>

              <h2>POLICESETU AI</h2>

              <p>Nizamabad Police Commissionerate</p>
            </div>
          </div>

          <div className="login-access-title">
            <span />
            SECURE OFFICER LOGIN
            <span />
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {/* EMAIL */}
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>

              <div className="login-input">
                <FaEnvelope aria-hidden="true" />

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your official email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="login-field">
              <label htmlFor="login-password">Password</label>

              <div className="login-input">
                <FaLock aria-hidden="true" />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="login-error" role="alert">
                <FaShieldAlt />

                <span>{error}</span>
              </div>
            )}

            {/* SIGN IN */}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Authenticating...
                </>
              ) : (
                <>
                  {/* <FaSignInAlt /> */}
                  SIGN IN
                  <FaArrowRight />
                </>
              )}
            </button>
          </form>

          {/* SECURE CONNECTION */}
          <div className="login-secure-status">
            <div className="login-secure-icon">
              <FaLock />
            </div>

            <div className="login-secure-copy">
              <strong>Secure Connection</strong>

              <span>Protected Police Operations</span>
            </div>

            <FaCheckCircle className="login-secure-check" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="login-footer">
        {/* SYSTEM */}
        <div className="login-footer-system">
          <strong>POLICESETU AI</strong>
          <span>Nizamabad Police Commissionerate</span>
        </div>

        {/* COMPANY */}
        <div className="login-footer-company">
          <span className="login-footer-powered">Powered by</span>

          <img
            src="/public/nnaisolutioncomapanylogo.png"
            alt="NN AI Solutions"
            className="login-footer-company-logo"
          />

          <strong>NN AI SOLUTIONS</strong>
        </div>

        {/* PLATFORM */}
        <div className="login-footer-platform">
          <span>Smart Police Station Management Platform</span>
          <span>@2026</span>
        </div>
      </footer>
    </main>
  );
}

export default Login;
