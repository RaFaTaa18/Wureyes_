import { useEffect, useMemo, useState } from "react";
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

interface Booking {
  id: number;
  client_name: string;
  service_name: string;
  event_date: string;
  status: string;
  payment_status: string;
  payment_amount: number | string | null;
  payment_date: string | null;
  service_price: number | string | null;
  additional_fee_amount: number | string | null;
  created_at: string;
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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsError, setBookingsError] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [selectedRevenueYear, setSelectedRevenueYear] = useState(new Date().getFullYear());
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState<number | null>(null);

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
        const headers = { Authorization: "Bearer " + token };
        const [response, bookingsResponse] = await Promise.all([
          fetch(API_URL + "/api/dashboard/stats", { headers }),
          fetch(API_URL + "/api/bookings", { headers }),
        ]);

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
        if (bookingsResponse.status === 401) {
          sessionStorage.removeItem("wureyes_token");
          sessionStorage.removeItem("wureyes_user");
          navigate("/admin/login");
          return;
        }
        if (bookingsResponse.ok) {
          const bookingsResult = await bookingsResponse.json();
          if (bookingsResult.success && Array.isArray(bookingsResult.data)) setBookings(bookingsResult.data);
          else setBookingsError("Data booking belum dapat ditampilkan.");
        } else setBookingsError("Data booking belum dapat ditampilkan.");
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

  const recentBookings = useMemo(() => [...bookings].sort((a, b) => {
    // MySQL DATE values are YYYY-MM-DD; compare their calendar dates directly
    // to avoid timezone parsing differences changing the sort order.
    const dateA = String(a.event_date ?? "").slice(0, 10);
    const dateB = String(b.event_date ?? "").slice(0, 10);
    const byEventDate = dateA.localeCompare(dateB);
    if (byEventDate !== 0) return byEventDate;
    return a.client_name.localeCompare(b.client_name, "id");
  }), [bookings]);
  const revenueYears = useMemo(() => {
    const years = bookings
      .filter((booking) => booking.payment_status === "paid" && booking.payment_date)
      .map((booking) => Number(booking.payment_date!.slice(0, 4)))
      .filter((year) => Number.isInteger(year) && year > 0);
    return Array.from(new Set([new Date().getFullYear(), ...years])).sort((a, b) => b - a);
  }, [bookings]);
  const monthlyRevenue = useMemo(() => {
    const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const values = names.map((month) => ({ month, total: 0 }));

    bookings.forEach((booking) => {
      if (booking.payment_status !== "paid" || !booking.payment_date) return;

      // Match the invoice's TOTAL TAGIHAN: service price + additional fees.
      const paymentDate = String(booking.payment_date).slice(0, 10);
      const year = Number(paymentDate.slice(0, 4));
      const month = Number(paymentDate.slice(5, 7)) - 1;
      const invoiceTotal =
        Number(booking.service_price ?? 0) +
        Number(booking.additional_fee_amount ?? 0);

      if (
        year === selectedRevenueYear &&
        month >= 0 &&
        month < 12 &&
        Number.isFinite(invoiceTotal) &&
        invoiceTotal > 0
      ) {
        values[month].total += invoiceTotal;
      }
    });

    return values;
  }, [bookings, selectedRevenueYear]);
  const formatMoney = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const formatDate = (value: string) => {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? value + "T00:00:00" : value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };
  const selectedMonthDetails = selectedRevenueMonth === null ? [] : bookings.filter((booking) => {
    if (booking.payment_status !== "paid" || !booking.payment_date) return false;

    const paymentDate = String(booking.payment_date).slice(0, 10);
    const year = Number(paymentDate.slice(0, 4));
    const month = Number(paymentDate.slice(5, 7)) - 1;
    const invoiceTotal =
      Number(booking.service_price ?? 0) +
      Number(booking.additional_fee_amount ?? 0);

    return (
      year === selectedRevenueYear &&
      month === selectedRevenueMonth &&
      Number.isFinite(invoiceTotal) &&
      invoiceTotal > 0
    );
  }).sort((a, b) => String(a.payment_date ?? "").slice(0, 10).localeCompare(String(b.payment_date ?? "").slice(0, 10)));
  const totalRevenue = monthlyRevenue.reduce((sum, item) => sum + item.total, 0);
  const maxRevenue = Math.max(...monthlyRevenue.map((item) => item.total), 1);

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
                <section className="dashboard-hero">
                  <div><p className="dashboard-eyebrow">YOUR CREATIVE WORKSPACE</p><h2>Welcome back,<br /><span>{user?.name?.split(" ")[0] || "Admin"}.</span></h2><p>Kelola cerita visual, layanan, booking, dan klien Wureyes dari satu tempat.</p></div>
                  <div className="dashboard-hero-note"><span>CAPTURE</span><span>CREATE</span><span>INSPIRE</span><small>WUREYES STUDIO</small></div>
                </section>
                <section className="dashboard-kpis" aria-label="Ringkasan statistik">
                  <article className="dashboard-kpi"><span className="kpi-icon">▣</span><div><small>Total Bookings</small><strong>{stats?.bookings ?? 0}</strong><p>Semua booking</p></div></article>
                  <article className="dashboard-kpi"><span className="kpi-icon">◷</span><div><small>Pendapatan Tahun Ini</small><strong className="kpi-revenue">{formatMoney(totalRevenue)}</strong><p>Dari pembayaran tercatat</p></div></article>
                  <article className="dashboard-kpi"><span className="kpi-icon">✉</span><div><small>Unread Messages</small><strong>{stats?.unreadMessages ?? 0}</strong><p>Perlu ditinjau</p></div></article>
                  <article className="dashboard-kpi"><span className="kpi-icon">▧</span><div><small>Portfolio Items</small><strong>{stats?.portfolio ?? 0}</strong><p>Karya tersimpan</p></div></article>
                  <article className="dashboard-kpi"><span className="kpi-icon">✳</span><div><small>Services</small><strong>{stats?.services ?? 0}</strong><p>Layanan terdaftar</p></div></article>
                </section>
                <section className="dashboard-content-grid">
                  <article className="dashboard-panel recent-bookings-panel">
                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">LATEST ACTIVITY</p><h3>Recent Bookings</h3></div><button className="dashboard-text-action" onClick={() => setActivePage("bookings")}>View all →</button></div>
                    {bookingsError ? <p className="dashboard-empty">{bookingsError}</p> : recentBookings.length === 0 ? <p className="dashboard-empty">Belum ada data booking untuk ditampilkan.</p> : <div className="dashboard-table-wrap"><table className="dashboard-bookings-table"><thead><tr><th>Client</th><th>Service</th><th>Event date</th><th>Status</th><th>Payment</th></tr></thead><tbody>{recentBookings.map((booking) => <tr key={booking.id}><td><strong>{booking.client_name}</strong></td><td>{booking.service_name || "—"}</td><td>{formatDate(booking.event_date)}</td><td><span className={"dashboard-status status-" + booking.status}>{booking.status}</span></td><td><span className={"dashboard-payment payment-" + booking.payment_status}>{booking.payment_status || "unpaid"}</span></td></tr>)}</tbody></table></div>}
                    <div className="dashboard-panel-foot"><span>{stats?.pendingBookings ?? 0} booking pending</span><button onClick={() => setActivePage("bookings")}>Manage bookings ↗</button></div>
                  </article>
                  <article className="dashboard-panel revenue-panel">
                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">PAID PAYMENTS</p><h3>Monthly Revenue</h3></div><label className="revenue-year-picker"><span>Tahun</span><select aria-label="Pilih tahun pendapatan" value={selectedRevenueYear} onChange={(event) => { setSelectedRevenueYear(Number(event.target.value)); setSelectedRevenueMonth(null); }}>{revenueYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
                    <div className="revenue-total">{formatMoney(totalRevenue)}<span>Total pendapatan tahun {selectedRevenueYear}</span></div>
                    <div className="revenue-chart" aria-label="Grafik pendapatan bulanan">{monthlyRevenue.map((item, index) => <button type="button" className={"revenue-bar-column" + (selectedRevenueMonth === index ? " is-selected" : "")} key={item.month} title={item.month + ": " + formatMoney(item.total)} aria-label={"Lihat rincian pendapatan " + item.month + " " + selectedRevenueYear} aria-pressed={selectedRevenueMonth === index} onClick={() => setSelectedRevenueMonth(index)}><span className="revenue-bar-track"><span className="revenue-bar" style={{ height: (item.total ? Math.max(4, item.total / maxRevenue * 100) : 0) + "%" }} /></span><small>{item.month}</small></button>)}</div>
                    <div className="revenue-month-details">{monthlyRevenue.map((item, index) => <button type="button" className={selectedRevenueMonth === index ? "is-selected" : ""} key={item.month} aria-pressed={selectedRevenueMonth === index} onClick={() => setSelectedRevenueMonth(index)}><span>{item.month}</span><strong>{formatMoney(item.total)}</strong></button>)}</div>
                    {selectedRevenueMonth !== null && <section className="revenue-detail-panel" aria-live="polite">
                      <div className="revenue-detail-heading"><div><p className="dashboard-eyebrow">PAYMENT BREAKDOWN</p><h4>Rincian {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedRevenueMonth]} {selectedRevenueYear}</h4></div><button type="button" className="revenue-detail-close" onClick={() => setSelectedRevenueMonth(null)} aria-label="Tutup rincian pendapatan">×</button></div>
                      <p className="revenue-detail-total">Total: <strong>{formatMoney(monthlyRevenue[selectedRevenueMonth].total)}</strong></p>
                      {selectedMonthDetails.length === 0 ? <p className="dashboard-empty">Tidak ada pembayaran berstatus paid pada bulan ini.</p> : <div className="revenue-detail-list">{selectedMonthDetails.map((booking) => <article className="revenue-detail-item" key={booking.id}><div><strong>{booking.service_name || "Service tidak tercantum"}</strong><span>{booking.client_name}</span><small>Tanggal pembayaran: {formatDate(String(booking.payment_date))}</small></div><b>{formatMoney(Number(booking.service_price ?? 0) + Number(booking.additional_fee_amount ?? 0))}</b></article>)}</div>}
                    </section>}
                    <p className="revenue-footnote">Pendapatan dihitung dari total tagihan (harga layanan + biaya tambahan) booking berstatus paid berdasarkan tanggal pembayaran. Pilih tahun untuk melihat rincian per bulan.</p>
                  </article>
                  <article className="dashboard-panel quick-actions-panel">
                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">SHORTCUTS</p><h3>Quick Actions</h3></div></div>
                    <button className="quick-action primary" onClick={() => setActivePage("portfolio")}><span>＋</span> Manage Portfolio <b>→</b></button>
                    <button className="quick-action" onClick={() => setActivePage("services")}><span>✳</span> Manage Services <b>→</b></button>
                    <button className="quick-action" onClick={() => setActivePage("bookings")}><span>▣</span> View Bookings <b>→</b></button>
                    <button className="quick-action" onClick={() => setActivePage("messages")}><span>✉</span> View Messages <b>→</b></button>
                    <div className="quick-action-note"><span>W</span><p>Every frame tells a story.<br /><strong>Make yours meaningful.</strong></p></div>
                  </article>
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
