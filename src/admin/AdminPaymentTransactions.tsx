import { useCallback, useEffect, useState } from "react";
import "./AdminPaymentTransactions.css";

type TransactionType = "dp" | "installment" | "final" | "legacy";

interface PaymentTransaction {
  id: number;
  transaction_type: TransactionType;
  amount: number;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
}

interface PaymentSummary {
  booking_id: number;
  invoice_total: number;
  total_paid: number;
  remaining_amount: number;
  additional_fee_amount: number;
  additional_fee_description: string;
  transactions: PaymentTransaction[];
}

interface SavedPayment {
  payment_status: "unpaid" | "dp" | "paid";
  total_paid: number;
  remaining_amount: number;
  payment_date: string;
  additional_fee_amount: number;
  additional_fee_description: string;
}

interface Props {
  bookingId: number;
  onSaved: (payment: SavedPayment) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "";
const money = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value);

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const transactionLabels: Record<TransactionType, string> = {
  dp: "DP",
  installment: "Cicilan",
  final: "Pelunasan",
  legacy: "Pembayaran lama",
};

export default function AdminPaymentTransactions({ bookingId, onSaved }: Props) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localToday());
  const [transactionType, setTransactionType] = useState<"dp" | "installment" | "final">("dp");
  const [notes, setNotes] = useState("");
  const [additionalFee, setAdditionalFee] = useState("0");
  const [additionalFeeDescription, setAdditionalFeeDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    const token = sessionStorage.getItem("wureyes_token");
    if (!token) throw new Error("Sesi admin berakhir. Silakan login kembali.");
    const response = await fetch(
      `${API_URL}/api/bookings/${bookingId}/payment-transactions`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const result = await response.json();
    if (response.status === 401) {
      sessionStorage.removeItem("wureyes_token");
      sessionStorage.removeItem("wureyes_user");
      window.location.assign("/admin/login");
      throw new Error("Sesi admin berakhir. Silakan login kembali.");
    }
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat riwayat pembayaran.");
    }
    const next = result.data as PaymentSummary;
    setSummary(next);
    setAdditionalFee(String(next.additional_fee_amount ?? 0));
    setAdditionalFeeDescription(next.additional_fee_description ?? "");
    if (next.transactions.length > 0) {
      setTransactionType(next.remaining_amount <= 0 ? "final" : "installment");
    } else {
      setTransactionType("dp");
    }
    return next;
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        return loadTransactions();
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat pembayaran.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadTransactions]);

  async function addTransaction() {
    const token = sessionStorage.getItem("wureyes_token");
    if (!token) {
      setError("Sesi admin berakhir. Silakan login kembali.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Masukkan nominal pembayaran yang valid.");
      return;
    }
    if (!paymentDate) {
      setError("Tanggal pembayaran wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/payment-transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transaction_type: transactionType,
            amount: parsedAmount,
            payment_date: paymentDate,
            notes,
            additional_fee_amount: Number(additionalFee || 0),
            additional_fee_description: additionalFeeDescription,
          }),
        }
      );
      const result = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem("wureyes_token");
        sessionStorage.removeItem("wureyes_user");
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menyimpan transaksi.");
      }

      const refreshed = await loadTransactions();
      const saved = result.data;
      onSaved({
        payment_status: saved.payment_status,
        total_paid: saved.total_paid,
        remaining_amount: saved.remaining_amount,
        payment_date: saved.payment_date,
        additional_fee_amount: saved.additional_fee_amount,
        additional_fee_description: saved.additional_fee_description,
      });
      setAmount("");
      setNotes("");
      setPaymentDate(localToday());
      setAdditionalFee(String(saved.additional_fee_amount ?? 0));
      setAdditionalFeeDescription(saved.additional_fee_description ?? "");
      if (refreshed.remaining_amount <= 0) setTransactionType("final");
      else setTransactionType("installment");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan transaksi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="payment-transactions"><p className="payment-transactions-muted">Memuat riwayat pembayaran...</p></section>;

  if (!summary) {
    return (
      <section className="payment-transactions">
        <p className="payment-transaction-error" role="alert">{error || "Riwayat pembayaran belum dapat dimuat."}</p>
      </section>
    );
  }

  const remaining = summary.remaining_amount;
  const hasPayments = summary.transactions.length > 0;

  return (
    <section className="payment-transactions">
      <div className="payment-transactions-summary">
        <div><span>Total tagihan</span><strong>{money(summary?.invoice_total ?? 0)}</strong></div>
        <div><span>Total diterima</span><strong>{money(summary?.total_paid ?? 0)}</strong></div>
        <div><span>Sisa tagihan</span><strong>{money(remaining)}</strong></div>
      </div>

      <div className="payment-transactions-history">
        <div className="payment-transactions-heading">
          <h4>Riwayat pembayaran</h4>
          <span>{summary.transactions.length} transaksi</span>
        </div>
        {hasPayments ? (
          <ol>
            {summary.transactions.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{transactionLabels[item.transaction_type] || item.transaction_type}</strong>
                  <small>{item.payment_date || "Tanggal tidak tercatat"}{item.created_by_name ? ` · ${item.created_by_name}` : ""}</small>
                  {item.notes && <p>{item.notes}</p>}
                </div>
                <b>{money(item.amount)}</b>
              </li>
            ))}
          </ol>
        ) : <p className="payment-transactions-muted">Belum ada pembayaran yang tercatat.</p>}
      </div>

      {remaining > 0 && (
        <div className="payment-transaction-form">
          <h4>Catat pembayaran baru</h4>
          <div className="payment-transaction-fields">
            <label>
              Jenis pembayaran
              <select value={transactionType} onChange={(event) => setTransactionType(event.target.value as "dp" | "installment" | "final")}>
                {!hasPayments && <option value="dp">DP pertama</option>}
                {hasPayments && <option value="installment">Cicilan tambahan</option>}
                <option value="final">Pelunasan</option>
              </select>
            </label>
            <label>
              Nominal (Rp)
              <input type="number" min="1" max={remaining} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={transactionType === "final" ? String(remaining) : "Masukkan nominal"} />
            </label>
            <label>
              Tanggal pembayaran
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </label>
            <label>
              Biaya tambahan (Rp)
              <input type="number" min="0" step="0.01" value={additionalFee} onChange={(event) => setAdditionalFee(event.target.value)} />
            </label>
            <label className="payment-transaction-wide">
              Keterangan biaya tambahan
              <input type="text" maxLength={255} value={additionalFeeDescription} onChange={(event) => setAdditionalFeeDescription(event.target.value)} placeholder="Contoh: Biaya transportasi" />
            </label>
            <label className="payment-transaction-wide">
              Catatan transaksi (opsional)
              <input type="text" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: Transfer melalui BCA" />
            </label>
          </div>
          {error && <p className="payment-transaction-error" role="alert">{error}</p>}
          <button type="button" onClick={addTransaction} disabled={saving}>
            {saving ? "Menyimpan..." : "Tambah transaksi"}
          </button>
        </div>
      )}
      {remaining <= 0 && <p className="payment-transactions-paid">Pembayaran sudah lunas.</p>}
      {error && remaining > 0 && <p className="payment-transaction-error" role="alert">{error}</p>}
    </section>
  );
}
