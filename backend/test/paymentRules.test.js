import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  calculateInvoiceTotal,
  calculatePaymentSummary,
  validatePaymentTransaction,
} from "../src/utils/paymentRules.js";
import { resolveServicePriceSnapshot } from "../src/utils/bookingPriceSnapshot.js";

test("invoice total includes service price and genuine additional fees", () => {
  assert.equal(calculateInvoiceTotal(550000, 50000), 600000);
  assert.equal(calculateInvoiceTotal(350000, 0), 350000);
});

test("group booking total is represented by the service invoice without misclassifying legacy extra fees", () => {
  // Four people x Rp80,000. The migration imports the confirmed full payment.
  assert.equal(calculateInvoiceTotal(80000, 240000), 320000);
  const summary = calculatePaymentSummary(320000, 320000);
  assert.equal(summary.paymentStatus, "paid");
  assert.equal(summary.remainingAmount, 0);
});

test("unpaid legacy bookings remain unpaid when no transaction exists", () => {
  assert.deepEqual(calculatePaymentSummary(600000, 0), {
    invoiceTotal: 600000,
    totalPaid: 0,
    remainingAmount: 600000,
    paymentStatus: "unpaid",
  });
});

test("partial payment is classified as DP and leaves the correct balance", () => {
  assert.deepEqual(calculatePaymentSummary(400000, 100000), {
    invoiceTotal: 400000,
    totalPaid: 100000,
    remainingAmount: 300000,
    paymentStatus: "dp",
  });
});

test("DP must be the first payment and less than the invoice total", () => {
  assert.equal(validatePaymentTransaction({
    transactionType: "dp", amount: 100000, totalPaid: 0, invoiceTotal: 400000,
  }), null);
  assert.match(validatePaymentTransaction({
    transactionType: "dp", amount: 100000, totalPaid: 1, invoiceTotal: 400000,
  }), /pembayaran pertama/);
  assert.match(validatePaymentTransaction({
    transactionType: "dp", amount: 400000, totalPaid: 0, invoiceTotal: 400000,
  }), /lebih kecil/);
});

test("installment must leave a balance and cannot exceed remaining amount", () => {
  assert.equal(validatePaymentTransaction({
    transactionType: "installment", amount: 100000, totalPaid: 100000, invoiceTotal: 400000,
  }), null);
  assert.match(validatePaymentTransaction({
    transactionType: "installment", amount: 300000, totalPaid: 100000, invoiceTotal: 400000,
  }), /Gunakan Pelunasan/);
  assert.match(validatePaymentTransaction({
    transactionType: "installment", amount: 350000, totalPaid: 100000, invoiceTotal: 400000,
  }), /melebihi sisa/);
});

test("final payment must exactly settle the remaining balance", () => {
  assert.equal(validatePaymentTransaction({
    transactionType: "final", amount: 300000, totalPaid: 100000, invoiceTotal: 400000,
  }), null);
  assert.match(validatePaymentTransaction({
    transactionType: "final", amount: 299000, totalPaid: 100000, invoiceTotal: 400000,
  }), /sama dengan sisa/);
});

test("invalid transaction amounts and types are rejected", () => {
  for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.001]) {
    assert.ok(validatePaymentTransaction({
      transactionType: "dp", amount, totalPaid: 0, invoiceTotal: 1000,
    }));
  }
  assert.match(validatePaymentTransaction({
    transactionType: "refund", amount: 100, totalPaid: 0, invoiceTotal: 1000,
  }), /Jenis transaksi/);
});

test("migration imports booking #3 as Rp320,000 and preserves legacy booking columns", async () => {
  const sql = await readFile(
    new URL("../database/migrations/002_booking_payment_transactions.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /WHEN b\.id = 3 THEN 320000\.00/);
  assert.match(sql, /WHERE legacy_booking_id = 3\s+AND booking_id = 3\s+AND transaction_type = 'legacy'/);
  assert.match(sql, /INSERT IGNORE INTO booking_payment_transactions/);
  assert.match(sql, /UNIQUE KEY unique_legacy_booking_payment/);
  assert.doesNotMatch(sql, /UPDATE\s+bookings\s+SET/i);
});

test("migration backfills only positive historical payments and does not fabricate unpaid transactions", async () => {
  const sql = await readFile(
    new URL("../database/migrations/002_booking_payment_transactions.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /WHERE b\.payment_amount IS NOT NULL\s+AND b\.payment_amount > 0/);
});

test("migration 003 adds a nullable snapshot column without finalizing it", async () => {
  const sql = await readFile(
    new URL("../database/migrations/003_booking_service_price_snapshot.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /ADD COLUMN service_price_snapshot DECIMAL\(12,2\) NULL/);
  assert.doesNotMatch(sql, /UPDATE\s+bookings/i);
  assert.doesNotMatch(sql, /MODIFY COLUMN service_price_snapshot DECIMAL\(12,2\) NOT NULL/i);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+bookings/i);
});

test("migration 004 backfills missing snapshots and enforces NOT NULL", async () => {
  const sql = await readFile(
    new URL("../database/migrations/004_finalize_booking_service_price_snapshot.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /UPDATE bookings b\s+INNER JOIN services s ON s\.id = b\.service_id\s+SET b\.service_price_snapshot = s\.price\s+WHERE b\.service_price_snapshot IS NULL/);
  assert.match(sql, /MODIFY COLUMN service_price_snapshot DECIMAL\(12,2\) NOT NULL/);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+bookings/i);
});

test("service price snapshot changes only when the selected service changes", () => {
  assert.equal(resolveServicePriceSnapshot({
    existingServiceId: 7,
    newServiceId: "7",
    existingSnapshot: "350000.00",
    newServicePrice: "550000.00",
  }), "350000.00");

  assert.equal(resolveServicePriceSnapshot({
    existingServiceId: 7,
    newServiceId: 8,
    existingSnapshot: "350000.00",
    newServicePrice: "550000.00",
  }), "550000.00");
});

test("service price snapshot remains null before the final backfill when the service is unchanged", () => {
  assert.equal(resolveServicePriceSnapshot({
    existingServiceId: 7,
    newServiceId: 7,
    existingSnapshot: null,
    newServicePrice: "350000.00",
  }), null);
});

test("booking update persists the resolved snapshot and protects existing payments", async () => {
  const bookings = await readFile(new URL("../src/routes/bookings.js", import.meta.url), "utf8");
  assert.match(bookings, /SELECT id, service_id, service_price_snapshot, additional_fee_amount\s+FROM bookings/);
  assert.match(bookings, /resolveServicePriceSnapshot\(/);
  assert.match(bookings, /service_price_snapshot = \?/);
  assert.match(bookings, /FROM booking_payment_transactions\s+WHERE booking_id = \?/);
  assert.match(bookings, /newInvoiceTotal \+ 0\.009 < totalPaid/);
});

test("booking creation captures the current service price and all invoice readers prefer the snapshot", async () => {
  const bookings = await readFile(new URL("../src/routes/bookings.js", import.meta.url), "utf8");
  const tracking = await readFile(new URL("../src/routes/tracking.js", import.meta.url), "utf8");
  assert.match(bookings, /service_price_snapshot,\s*event_date/);
  assert.match(bookings, /services\[0\]\.price/);
  assert.match(bookings, /COALESCE\(b\.service_price_snapshot, s\.price\) AS service_price/);
  assert.match(tracking, /COALESCE\(b\.service_price_snapshot, s\.price\) AS service_price/);
});

test("invoice totals cannot be reduced below previously received payments", async () => {
  const bookings = await readFile(new URL("../src/routes/bookings.js", import.meta.url), "utf8");
  assert.match(bookings, /invoiceTotal \+ 0\.009 < totalBefore/);
});
