import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useNavigate } from "react-router-dom";

import { auth } from "../firebase/config";
import { getCurrentUserRole } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

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

        if (userRole.role === "WATCHMAN") {
          navigate("/gate", { replace: true });
          return;
        }

        if (userRole.role === "POLICE") {
          navigate("/police", { replace: true });
          return;
        }

        if (userRole.role === "COMMISSIONER") {
          navigate("/commissioner", { replace: true });
          return;
        }

        await signOut(auth);
        setError("Invalid account role. Please contact the administrator.");
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

      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = result.user;
      const userRole = await getCurrentUserRole();

      if (!userRole) {
        await signOut(auth);
        setError(
          "Your account role is not configured. Please contact the administrator.",
        );
        return;
      }

      if (userRole.role === "WATCHMAN") {
        navigate("/gate", { replace: true });
        return;
      }

      if (userRole.role === "POLICE") {
        navigate("/police", { replace: true });
        return;
      }

      if (userRole.role === "COMMISSIONER") {
        navigate("/commissioner", { replace: true });
        return;
      }

      await signOut(auth);
      setError("Invalid account role. Please contact the administrator.");
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-700">
            Checking account...
          </div>
          <div className="text-sm text-slate-400 mt-1">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-lg">
            PS
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            POLICESETU AI
          </h1>

          <p className="mt-2 text-slate-500">
            Secure Station Management Portal
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in using your authorized account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold transition"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          POLICESETU AI • Secure Station Management
        </p>
      </div>
    </div>
  );
}

export default Login;
