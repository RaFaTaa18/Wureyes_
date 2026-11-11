import { useEffect, useState } from "react";
import "./AdminWorkflow.css";

interface WorkflowBooking {
  id: number;
  client_name: string;
  event_date: string;
  status: string;
  payment_status: string;
  payment_amount: number | string | null;
  service_price: number | string;
  additional_fee_amount: number | string;
  service_name: string;
  current_stage: string | null;
  client_note: string | null;
  internal_note: string | null;
  estimated_delivery_date: string | null;
  tracking_active: number | boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "";
const stages = [
  ["booking_received", "Booking diterima"],
  ["booking_confirmed", "Booking dikonfirmasi"],
  ["preparation", "Persiapan"],
  ["shooting", "Sesi berlangsung"],
  ["editing", "Proses editing"],
  ["photo_selection", "Pemilihan foto"],
  ["revision", "Revisi"],
  ["final_delivery", "Hasil akhir dikirim"],
];
const formatMoney = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const formatDate = (value: string) => {
  const parsed = new Date(value.length === 10 ? value + "T00:00:00" : value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};

export default function AdminWorkflow() {
  const [items, setItems] = useState<WorkflowBooking[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stage, setStage] = useState("booking_received");
  const [clientNote, setClientNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = sessionStorage.getItem("wureyes_token") || "";
  const selected = items.find((item) => item.id === selectedId) || null;

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(API_URL + path, {
      ...options,
      headers: { Authorization: "Bearer " + token, ...(options.headers || {}) },
    });
    const result = await response.json();
    if (response.status === 401) {
      sessionStorage.removeItem("wureyes_token");
      sessionStorage.removeItem("wureyes_user");
      window.location.href = "/admin/login";
      throw new Error("Sesi login berakhir.");
    }
    if (!response.ok || !result.success) throw new Error(result.message || "Permintaan gagal.");
    return result;
  }

  async function load() {
    try {
      setError("");
      const result = await request("/api/tracking/admin/bookings");
      setItems(result.data);
      if (selectedId && !result.data.some((item: WorkflowBooking) => item.id === selectedId)) setSelectedId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function choose(item: WorkflowBooking) {
    setSelectedId(item.id);
    setStage(item.current_stage || (item.status === "confirmed" ? "booking_confirmed" : "booking_received"));
    setClientNote(item.client_note || "");
    setInternalNote(item.internal_note || "");
    setDeliveryDate(item.estimated_delivery_date ? String(item.estimated_delivery_date).slice(0, 10) : "");
    setTrackingUrl("");
  }

  async function saveProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await request(`/api/tracking/admin/bookings/${selected.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, client_note: clientNote, internal_note: internalNote, estimated_delivery_date: deliveryDate || null }),
      });
      await load();
      alert("Progres booking berhasil disimpan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan progres.");
    } finally {
      setSaving(false);
    }
  }

  async function createLink() {
    if (!selected) return;
    try {
      const result = await request(`/api/tracking/admin/bookings/${selected.id}/link`, { method: "POST" });
      const url = window.location.origin + result.data.url;
      setTrackingUrl(url);
      await navigator.clipboard.writeText(url);
      await load();
      alert("Link tracking dibuat dan disalin.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal membuat link tracking.");
    }
  }

  async function revokeLink() {
    if (!selected || !window.confirm("Nonaktifkan link tracking klien ini?")) return;
    try {
      await request(`/api/tracking/admin/bookings/${selected.id}/link`, { method: "DELETE" });
      setTrackingUrl("");
      await load();
      alert("Link tracking dinonaktifkan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menonaktifkan link.");
    }
  }

  const upcoming = items.filter((item) => item.status !== "cancelled" && item.status !== "completed").sort((a, b) => String(a.event_date).slice(0, 10).localeCompare(String(b.event_date).slice(0, 10)));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="workflow-admin">
      <header className="workflow-heading">
        <div><p>WUREYES / PROJECT OPERATIONS</p><h2>Booking workflow</h2><span>Atur tahapan produksi dan bagikan perkembangan kepada klien.</span></div>
        <button type="button" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
      </header>
      {error && <div className="workflow-error" role="alert">{error}</div>}
      <div className="workflow-overview">
        <article><small>UPCOMING / ACTIVE</small><strong>{upcoming.length}</strong><span>Booking berjalan</span></article>
        <article><small>NEED ATTENTION</small><strong>{items.filter((item) => item.status === "pending").length}</strong><span>Menunggu konfirmasi</span></article>
        <article><small>TRACKING LINKS</small><strong>{items.filter((item) => Boolean(item.tracking_active)).length}</strong><span>Link klien aktif</span></article>
      </div>
      <div className="workflow-layout">
        <section className="workflow-list-panel">
          <div className="workflow-panel-title"><div><p>BOOKING SCHEDULE</p><h3>Jadwal & proyek</h3></div><span>{items.length} total</span></div>
          {loading ? <p className="workflow-empty">Memuat booking...</p> : upcoming.length === 0 ? <p className="workflow-empty">Belum ada booking aktif.</p> : <div className="workflow-booking-list">{upcoming.map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "is-selected" : ""} onClick={() => choose(item)}><span className="workflow-date">{formatDate(String(item.event_date))}</span><strong>{item.client_name}</strong><span>{item.service_name}</span><small><i className={item.status === "pending" ? "is-pending" : "is-confirmed"} />{item.status} · {stages.find(([key]) => key === item.current_stage)?.[1] || "Belum ada progres"}</small></button>)}</div>}
          {items.filter((item) => item.status === "completed" || item.status === "cancelled").length > 0 && <details className="workflow-archived"><summary>Booking selesai / dibatalkan ({items.filter((item) => item.status === "completed" || item.status === "cancelled").length})</summary>{items.filter((item) => item.status === "completed" || item.status === "cancelled").map((item) => <button type="button" key={item.id} onClick={() => choose(item)}><strong>{item.client_name}</strong><span>{item.service_name} · {item.status}</span></button>)}</details>}
        </section>
        <section className="workflow-editor">
          {!selected ? <div className="workflow-empty workflow-select-prompt"><span>W_</span><h3>Select a booking</h3><p>Pilih booking dari jadwal untuk memperbarui progres dan mengelola link tracking klien.</p></div> : <>
            <div className="workflow-panel-title"><div><p>PROJECT #{selected.id}</p><h3>{selected.client_name}</h3><span>{selected.service_name} · {formatDate(String(selected.event_date))}</span></div><span className={"workflow-status workflow-status-" + selected.status}>{selected.status}</span></div>
            <div className="workflow-payment"><div><small>PAYMENT STATUS</small><strong>{selected.payment_status === "paid" ? "Lunas" : selected.payment_status === "dp" ? "DP terbayar" : "Belum bayar"}</strong></div><div><small>PAID AMOUNT</small><strong>{formatMoney(Number(selected.payment_amount || 0))}</strong></div><div><small>INVOICE TOTAL</small><strong>{formatMoney(Number(selected.service_price || 0) + Number(selected.additional_fee_amount || 0))}</strong></div></div>
            <form onSubmit={saveProgress} className="workflow-form">
              <label>Tahapan pengerjaan<select value={stage} onChange={(event) => setStage(event.target.value)}>{stages.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
              <label>Catatan untuk klien<textarea rows={3} maxLength={2000} value={clientNote} onChange={(event) => setClientNote(event.target.value)} placeholder="Contoh: Proses editing foto sedang berjalan. Terima kasih sudah menunggu." /></label>
              <label>Catatan internal admin<textarea rows={2} maxLength={2000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Catatan internal, tidak ditampilkan kepada klien." /></label>
              <label>Estimasi tanggal selesai<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></label>
              <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan progres"}</button>
            </form>
            <div className="workflow-link-manager"><div><p>CLIENT TRACKING PORTAL</p><h3>{selected.tracking_active ? "Link tracking aktif" : "Belum ada link tracking"}</h3><span>Klien dapat melihat progres dan catatan yang ditujukan untuk mereka.</span></div><div className="workflow-link-actions"><button type="button" onClick={() => void createLink()}>{selected.tracking_active ? "Buat ulang & salin link" : "Buat & salin link"}</button>{selected.tracking_active && <button type="button" className="workflow-revoke" onClick={() => void revokeLink()}>Nonaktifkan</button>}</div>{trackingUrl && <input readOnly value={trackingUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Client tracking URL" />}</div>
          </>}
        </section>
      </div>
    </section>
  );
}
