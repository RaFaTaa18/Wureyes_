import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal");
      }

      sessionStorage.setItem("wureyes_token", result.data.token);
      sessionStorage.setItem(
        "wureyes_user",
        JSON.stringify(result.data.user)
      );

      // Let the success animation finish before entering the dashboard.
      setSignedIn(true);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      navigate("/admin");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Login gagal"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-grain" aria-hidden="true" />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          WUREYES<span>_</span>
        </div>

        <p className="admin-login-label">ADMIN DASHBOARD</p>
        <h1 id="admin-login-title">Welcome back<span>.</span></h1>
        <p className="admin-login-description">
          Sign in to continue managing your visual stories.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="admin-login-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@wureyes.local"
              autoComplete="username"
              required
              disabled={loading || signedIn}
            />
          </label>

          <label className="admin-login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading || signedIn}
            />
          </label>

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={signedIn ? "is-signed-in" : ""}
            disabled={loading || signedIn}
          >
            <span className="admin-login-button-icon" aria-hidden="true">
              {signedIn ? "✓" : ""}
            </span>
            <span>
              {signedIn ? "Signed in" : loading ? "Signing in..." : "Sign In"}
            </span>
          </button>
        </form>

        <a href="/" className="back-to-site">
          <span aria-hidden="true">←</span> Back to website
        </a>
      </section>
    </main>
  );
}
