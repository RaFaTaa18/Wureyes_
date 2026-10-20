import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || signedIn) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal");
      }

      sessionStorage.setItem("wureyes_token", result.data.token);
      sessionStorage.setItem("wureyes_user", JSON.stringify(result.data.user));

      // Collapse the form back into the signed-in pill before opening admin.
      setSignedIn(true);
      setFormOpen(false);
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      navigate("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  function handleSignInClick() {
    if (signedIn || loading) return;
    setError("");
    setFormOpen((open) => !open);
  }

  return (
    <main className="admin-login">
      <div className="admin-login-grain" aria-hidden="true" />
      <section className={`admin-login-card ${formOpen ? "form-open" : ""} ${signedIn ? "login-complete" : ""}`} aria-labelledby="admin-login-title">
        <div className="admin-login-brand">WUREYES<span>_</span></div>
        <p className="admin-login-label">ADMIN DASHBOARD</p>
        <h1 id="admin-login-title">Welcome back<span>.</span></h1>
        <p className="admin-login-description">
          Sign in to continue managing your visual stories.
        </p>

        <div className={`admin-login-form-wrap ${formOpen && !signedIn ? "is-open" : ""}`} aria-hidden={!formOpen || signedIn}>
          <form onSubmit={handleSubmit} tabIndex={formOpen && !signedIn ? 0 : -1}>
            <label className="admin-login-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@wureyes.local"
                autoComplete="username"
                required
                disabled={!formOpen || loading || signedIn}
                tabIndex={formOpen && !signedIn ? 0 : -1}
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
                disabled={!formOpen || loading || signedIn}
                tabIndex={formOpen && !signedIn ? 0 : -1}
              />
            </label>

            {error && <div className="admin-login-error" role="alert">{error}</div>}

            <button type="submit" className="admin-login-submit" disabled={loading || signedIn}>
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>

        <button
          type="button"
          className={`admin-login-pill ${signedIn ? "is-signed-in" : ""}`}
          onClick={handleSignInClick}
          disabled={loading || signedIn}
          aria-expanded={formOpen}
        >
          <span className="admin-login-button-icon" aria-hidden="true">{signedIn ? "✓" : ""}</span>
          <span>{signedIn ? "Signed in" : "Sign In"}</span>
        </button>

        <a href="/" className="back-to-site"><span aria-hidden="true">←</span> Back to website</a>
      </section>
    </main>
  );
}
