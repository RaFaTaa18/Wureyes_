import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./AdminLogin.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function AdminResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset link is invalid or missing. Please request a new link.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Use a password between 12 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to reset password.");
      }
      setComplete(true);
      setMessage(result.message || "Password reset successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">WUREYES<span>_</span></div>
        <p className="admin-login-label">ADMIN DASHBOARD</p>
        <h1>{complete ? "Password Updated." : "Reset Password."}</h1>
        <p className="admin-login-description">
          {complete
            ? "Your password has been changed. You can now sign in with your new password."
            : "Choose a new, strong password for your Wureyes account."}
        </p>

        {!complete && (
          <form onSubmit={handleSubmit}>
            <label>
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 12 characters"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your new password again"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            {error && <div className="admin-login-error" role="alert">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

        {complete && <div className="admin-reset-message" role="status">{message}</div>}
        {complete ? (
          <Link to="/admin/login" className="back-to-site">← Back to sign in</Link>
        ) : (
          <Link to="/admin/login" className="back-to-site">← Back to sign in</Link>
        )}
      </div>
    </main>
  );
}
