const CENT_TOLERANCE = 0.009;

export function calculateInvoiceTotal(servicePrice, additionalFee = 0) {
  return Number((Number(servicePrice || 0) + Number(additionalFee || 0)).toFixed(2));
}

export function calculatePaymentSummary(invoiceTotal, totalPaid) {
  const total = Number(Number(invoiceTotal || 0).toFixed(2));
  const paid = Number(Number(totalPaid || 0).toFixed(2));
  return {
    invoiceTotal: total,
    totalPaid: paid,
    remainingAmount: Math.max(0, Number((total - paid).toFixed(2))),
    paymentStatus: paid >= total - CENT_TOLERANCE ? "paid" : paid > 0 ? "dp" : "unpaid",
  };
}

export function validatePaymentTransaction({ transactionType, amount, totalPaid, invoiceTotal }) {
  if (!["dp", "installment", "final"].includes(transactionType)) {
    return "Jenis transaksi tidak valid.";
  }
  if (!Number.isFinite(amount) || amount <= 0 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
    return "Nominal pembayaran harus lebih besar dari Rp0 dan maksimal 2 angka desimal.";
  }

  const summary = calculatePaymentSummary(invoiceTotal, totalPaid);
  const remaining = summary.remainingAmount;
  if (remaining <= 0 || amount > remaining + CENT_TOLERANCE) {
    return "Nominal pembayaran melebihi sisa tagihan.";
  }
  if (transactionType === "dp" && (totalPaid > 0 || amount >= invoiceTotal)) {
    return "DP hanya dapat dicatat sebagai pembayaran pertama dan harus lebih kecil dari total tagihan.";
  }
  if (transactionType === "installment" && (totalPaid <= 0 || amount >= remaining - CENT_TOLERANCE)) {
    return "Cicilan tambahan harus menyisakan tagihan. Gunakan Pelunasan untuk pembayaran terakhir.";
  }
  if (transactionType === "final" && Math.abs(amount - remaining) > CENT_TOLERANCE) {
    return "Nominal pelunasan harus sama dengan sisa tagihan.";
  }
  return null;
}
