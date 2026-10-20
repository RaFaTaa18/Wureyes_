import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminPortfolio from "./AdminPortfolio";
import AdminServices from "./AdminServices";
import AdminBookings from "./AdminBookings";
import AdminMessages from "./AdminMessages";

import "./AdminDashboard.css";
import "./AdminWarmEditorial.css";

interface DashboardStats {
  portfolio: number;
  services: number;
  bookings: number;
  pendingBookings: number;
  messages: number;
  unreadMessages: number;
}

interface User {
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const API_URL = import.meta.env.VITE_API_URL || "";

  const navigate = useNavigate();

  const [activePage, setActivePage] =
    useState("dashboard");

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const token =
      sessionStorage.getItem("wureyes_token");

    const savedUser =
      sessionStorage.getItem("wureyes_user");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_URL}/api/dashboard/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (response.status === 401) {
          sessionStorage.removeItem(
            "wureyes_token"
          );

          sessionStorage.removeItem(
            "wureyes_user"
          );

          navigate("/admin/login");

          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load dashboard"
          );
        }

        setStats(result.data);
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [navigate]);

  function handleLogout() {
    sessionStorage.removeItem(
      "wureyes_token"
    );

    sessionStorage.removeItem(
      "wureyes_user"
    );

    navigate("/admin/login");
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          WUREYES<span>_</span>
        </div>

        <p className="admin-sidebar-label">
          ADMIN PANEL
        </p>

        <nav>
          <button
            className={activePage === "dashboard" ? "active" : ""}
            aria-current={activePage === "dashboard" ? "page" : undefined}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={activePage === "portfolio" ? "active" : ""}
            aria-current={activePage === "portfolio" ? "page" : undefined}
            onClick={() => setActivePage("portfolio")}
          >
            Portfolio
          </button>

          <button
            className={activePage === "services" ? "active" : ""}
            aria-current={activePage === "services" ? "page" : undefined}
            onClick={() => setActivePage("services")}
          >
            Services
          </button>

          <button
            className={activePage === "bookings" ? "active" : ""}
            aria-current={activePage === "bookings" ? "page" : undefined}
            onClick={() => setActivePage("bookings")}
          >
            Bookings
          </button>

          <button
            className={activePage === "messages" ? "active" : ""}
            aria-current={activePage === "messages" ? "page" : undefined}
            onClick={() => setActivePage("messages")}
          >
            Messages
          </button>
        </nav>

        <button
          className="admin-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>WUREYES ADMIN</p>
            <h1>
              {activePage === "dashboard" && "Dashboard"}
              {activePage === "portfolio" && "Portfolio"}
              {activePage === "services" && "Services"}
              {activePage === "bookings" && "Bookings"}
              {activePage === "messages" && "Messages"}
            </h1>
          </div>

          {user && (
            <div className="admin-user">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <span>{user.role}</span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="admin-loading">
            Loading dashboard...
          </div>
        ) : (
          <>
            {activePage === "dashboard" && (
              <>
                <section className="admin-stats">
                  <div className="stat-card">
                    <span>PORTFOLIO</span>
                    <strong>{stats?.portfolio ?? 0}</strong>
                  </div>

                  <div className="stat-card">
                    <span>SERVICES</span>
                    <strong>{stats?.services ?? 0}</strong>
                  </div>

                  <div className="stat-card">
                    <span>BOOKINGS</span>
                    <strong>{stats?.bookings ?? 0}</strong>
                  </div>

                  <div className="stat-card">
                    <span>PENDING BOOKINGS</span>
                    <strong>{stats?.pendingBookings ?? 0}</strong>
                  </div>

                  <div className="stat-card">
                    <span>MESSAGES</span>
                    <strong>{stats?.messages ?? 0}</strong>
                  </div>

                  <div className="stat-card">
                    <span>UNREAD MESSAGES</span>
                    <strong>{stats?.unreadMessages ?? 0}</strong>
                  </div>
                </section>

                <section className="admin-welcome">
                  <p>WELCOME TO WUREYES</p>
                  <h2>
                    Manage your
                    <br />
                    <span>creative studio.</span>
                  </h2>
                  <p>
                    Use this dashboard to manage portfolio projects,
                    services, bookings, and messages from your Wureyes website.
                  </p>
                </section>
              </>
            )}

            {activePage === "portfolio" && <AdminPortfolio />}
            {activePage === "services" && <AdminServices />}
            {activePage === "bookings" && <AdminBookings />}
            {activePage === "messages" && <AdminMessages />}
          </>
        )}
      </main>
    </div>
  );
}
