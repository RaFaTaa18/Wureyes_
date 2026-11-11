import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./BookingTracking.css";

interface TrackingData {
  client_name: string;
  service_name: string;
  event_date: string;
  location: string | null;
  booking_status: string;
  payment_status: string;
  payment_amount: number | null;
  total_amount: number;
  remaining_amount: number;
  current_stage: string;
  current_stage_label: string;
  client_note: string | null;
  estimated_delivery_date: string | null;
  final_delivery_url: string | null;
  photo_selection_url: string | null;
  history: { stage: string; stage_label: string; client_note: string | null; created_at: string }[];
}

const API_URL = import.meta.env.VITE_API_URL || "";
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => {
  if (!value) return "—";
  const parsed = new Date(value.length === 10 ? value + "T00:00:00" : value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
};
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

export default function BookingTracking() {
  const { token = "" } = useParams();
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/tracking/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Link tracking tidak dapat dibuka.");
        if (active) setData(result.data);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Terjadi kesalahan."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  if (loading) return <main className="tracking-page"><p className="tracking-muted">Memuat informasi booking...</p></main>;
  if (error || !data) return <main className="tracking-page"><section className="tracking-error"><span>WUREYES_ CLIENT PORTAL</span><h1>Tracking link unavailable.</h1><p>{error || "Informasi booking tidak tersedia."}</p><Link to="/">Kembali ke Wureyes</Link></section></main>;

  const currentIndex = Math.max(0, stages.findIndex(([key]) => key === data.current_stage));
  const isCancelled = data.booking_status === "cancelled";

  return (
    <main className="tracking-page">
      <header className="tracking-topbar"><Link to="/" className="tracking-brand">WUREYES<span>_</span></Link><span>CLIENT PORTAL</span></header>
      <section className="tracking-intro">
        <p>YOUR MOMENT, IN PROGRESS</p>
        <h1>Hi, {data.client_name.split(" ")[0]}.</h1>
        <span>Here’s the latest update on your Wureyes experience.</span>
      </section>
      <section className="tracking-summary">
        <div><small>SERVICE</small><strong>{data.service_name}</strong></div>
        <div><small>EVENT DATE</small><strong>{date(data.event_date)}</strong></div>
        <div><small>LOCATION</small><strong>{data.location || "Belum ditentukan"}</strong></div>
        <div><small>BOOKING STATUS</small><strong className={`tracking-status status-${data.booking_status}`}>{data.booking_status}</strong></div>
      </section>
      <section className="tracking-layout">
        <article className="tracking-card tracking-progress">
          <div className="tracking-card-heading"><div><p>PROJECT JOURNEY</p><h2>Progress timeline</h2></div><span>{isCancelled ? "Cancelled" : `${currentIndex + 1} / ${stages.length}`}</span></div>
          {isCancelled ? <p className="tracking-note">Booking ini telah dibatalkan. Silakan hubungi Wureyes jika membutuhkan bantuan.</p> : <ol className="tracking-timeline">{stages.map(([key, label], index) => {
            const done = index <= currentIndex;
            return <li key={key} className={done ? "is-done" : ""}><span className="tracking-step-marker">{done ? "✓" : String(index + 1).padStart(2, "0")}</span><div><strong>{label}</strong>{key === data.current_stage && <small>Current stage</small>}</div></li>;
          })}</ol>}
          {data.client_note && <div className="tracking-update"><small>LATEST UPDATE FROM WUREYES</small><p>{data.client_note}</p></div>}
          {data.estimated_delivery_date && <div className="tracking-estimate"><small>ESTIMATED DELIVERY</small><strong>{date(data.estimated_delivery_date)}</strong></div>}
        </article>
        <aside className="tracking-side">
          <article className="tracking-card"><p className="tracking-eyebrow">PAYMENT OVERVIEW</p><h2>{data.payment_status === "paid" ? "Paid in full" : data.payment_status === "dp" ? "Down payment received" : "Awaiting payment"}</h2><div className="tracking-money-row"><span>Total invoice</span><strong>{money(data.total_amount)}</strong></div><div className="tracking-money-row"><span>Paid amount</span><strong>{money(data.payment_amount || 0)}</strong></div><div className="tracking-money-row"><span>Remaining</span><strong>{money(data.remaining_amount)}</strong></div></article>
          {data.photo_selection_url && <article className="tracking-card"><p className="tracking-eyebrow">PHOTO SELECTION</p><h2>Your photo picks</h2><p>Open your private photo selection gallery.</p><a className="tracking-link" href={data.photo_selection_url}>Open photo gallery ↗</a></article>}
          {data.final_delivery_url && <article className="tracking-card"><p className="tracking-eyebrow">FINAL DELIVERY</p><h2>Your memories are ready.</h2><a className="tracking-link" href={data.final_delivery_url} target="_blank" rel="noreferrer">Open final files ↗</a></article>}
        </aside>
      </section>
      <section className="tracking-card tracking-history"><p className="tracking-eyebrow">PROJECT UPDATES</p><h2>Progress history</h2>{data.history.length ? <ul>{data.history.map((item, index) => <li key={item.created_at + item.stage + index}><div><strong>{item.stage_label}</strong>{item.client_note && <p>{item.client_note}</p>}</div><time>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></li>)}</ul> : <p className="tracking-muted">Belum ada pembaruan progres.</p>}</section>
      <footer className="tracking-footer">WUREYES_ · With Ur Eyes</footer>
    </main>
  );
}
