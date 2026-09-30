import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
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

        <a href="/" className="back-to-site">
          ← Back to website
        </a>
      </div>
    </main>
  );
}