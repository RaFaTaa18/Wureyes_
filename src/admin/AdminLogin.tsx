import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetRequested, setResetRequested] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  async function handleForgotPassword() {
    setResetLoading(true);
    setResetMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to request password reset.");
      setResetMessage(result.message);
    } catch (requestError) {
      setResetMessage(requestError instanceof Error ? requestError.message : "Unable to request password reset.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Login gagal"
        );
      }

      sessionStorage.setItem(
        "wureyes_token",
        result.data.token
      );

      sessionStorage.setItem(
        "wureyes_user",
        JSON.stringify(result.data.user)
      );

      navigate("/admin");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login gagal"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          WUREYES<span>_</span>
        </div>

        <p className="admin-login-label">
          ADMIN DASHBOARD
        </p>

        <h1>Welcome Back.</h1>

        <p className="admin-login-description">
          Sign in to manage your Wureyes website.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="admin@wureyes.local"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              required
            />
          </label>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="admin-forgot-password">
          {!resetRequested ? (
            <button
              type="button"
              className="admin-forgot-link"
              onClick={() => {
                setResetRequested(true);
                setResetMessage("");
                setError("");
              }}
            >
              Forgot Password?
            </button>
          ) : (
            <div className="admin-reset-request">
              <p>Enter your account email above, then request a secure reset link.</p>
              {resetMessage && <div className="admin-reset-message" role="status">{resetMessage}</div>}
              <button type="button" onClick={handleForgotPassword} disabled={resetLoading || !email.trim()}>
                {resetLoading ? "Sending..." : "Send reset link"}
              </button>
              <button type="button" className="admin-forgot-link" onClick={() => { setResetRequested(false); setResetMessage(""); }}>
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <a href="/" className="back-to-site">
          ← Back to website
        </a>
      </div>
    </main>
  );
}