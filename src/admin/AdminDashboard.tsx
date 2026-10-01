import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminPortfolio from "./AdminPortfolio";
import AdminServices from "./AdminServices";
import AdminBookings from "./AdminBookings";
import AdminMessages from "./AdminMessages";

import "./AdminDashboard.css";

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

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="admin-logo">
          WUREYES<span>_</span>
        </div>

        <p className="admin-sidebar-label">
          ADMIN PANEL
        </p>

        <nav>

          <button
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              setActivePage("portfolio")
            }
          >
            Portfolio
          </button>

          <button
            onClick={() =>
              setActivePage("services")
            }
          >
            Services
          </button>

          <button
            onClick={() =>
              setActivePage("bookings")
            }
          >
            Bookings
          </button>

          <button
            onClick={() =>
              setActivePage("messages")
            }
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


      {/* MAIN CONTENT */}
      <main className="admin-main">

        {/* HEADER */}
        <header className="admin-header">

          <div>
            <p>
              WUREYES ADMIN
            </p>

            <h1>
              {activePage === "dashboard" &&
                "Dashboard"}

              {activePage === "portfolio" &&
                "Portfolio"}

              {activePage === "services" &&
                "Services"}

              {activePage === "bookings" &&
                "Bookings"}

              {activePage === "messages" &&
                "Messages"}
            </h1>
          </div>

          {user && (
            <div className="admin-user">
              <strong>
                {user.name}
              </strong>

              <span>
                {user.email}
              </span>

              <span>
                {user.role}
              </span>
            </div>
          )}

        </header>


        {/* LOADING */}
        {loading ? (

          <div className="admin-loading">
            Loading dashboard...
          </div>

        ) : (

          <>

            {/* =========================
                DASHBOARD
            ========================== */}

            {activePage === "dashboard" && (

              <>

                <section className="admin-stats">

                  <div className="stat-card">
                    <span>
                      PORTFOLIO
                    </span>

                    <strong>
                      {stats?.portfolio ?? 0}
                    </strong>
                  </div>


                  <div className="stat-card">
                    <span>
                      SERVICES
                    </span>

                    <strong>
                      {stats?.services ?? 0}
                    </strong>
                  </div>


                  <div className="stat-card">
                    <span>
                      BOOKINGS
                    </span>

                    <strong>
                      {stats?.bookings ?? 0}
                    </strong>
                  </div>


                  <div className="stat-card">
                    <span>
                      PENDING BOOKINGS
                    </span>

                    <strong>
                      {stats?.pendingBookings ?? 0}
                    </strong>
                  </div>


                  <div className="stat-card">
                    <span>
                      MESSAGES
                    </span>

                    <strong>
                      {stats?.messages ?? 0}
                    </strong>
                  </div>


                  <div className="stat-card">
                    <span>
                      UNREAD MESSAGES
                    </span>

                    <strong>
                      {stats?.unreadMessages ?? 0}
                    </strong>
                  </div>

                </section>


                <section className="admin-welcome">

                  <p>
                    WELCOME TO WUREYES
                  </p>

                  <h2>
                    Manage your
                    <br />
                    <span>
                      creative studio.
                    </span>
                  </h2>

                  <p>
                    Use this dashboard to manage
                    portfolio projects, services,
                    bookings, and messages from
                    your Wureyes website.
                  </p>

                </section>

              </>

            )}


            {/* =========================
                PORTFOLIO
            ========================== */}

            {activePage === "portfolio" && (
              <AdminPortfolio />
            )}


            {/* =========================
                SERVICES
            ========================== */}

            {activePage === "services" && (
  <AdminServices />
)}


            {/* =========================
                BOOKINGS
            ========================== */}

            {activePage === "bookings" && (
  <AdminBookings />
)}


            {/* =========================
                MESSAGES
            ========================== */}

            {activePage === "messages" && (
  <AdminMessages />
)}

          </>

        )}

      </main>

    </div>
  );
}