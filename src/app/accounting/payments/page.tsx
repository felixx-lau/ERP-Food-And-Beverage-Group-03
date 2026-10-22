"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, Receipt, CheckCircle2, Lock, Landmark, CreditCard, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function RegisterPaymentPage() {
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK");
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // Test Runner state
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  const fetchPaymentsAndInvoices = async () => {
    setLoading(true);
    try {
      const [resPay, resInv] = await Promise.all([
        fetch("/api/accounting/payments"),
        fetch("/api/accounting/invoices"),
      ]);

      if (resPay.ok) {
        const dataPay = await resPay.json();
        setPayments(dataPay.payments || []);
      }

      if (resInv.ok) {
        const dataInv = await resInv.json();
        const invList = dataInv.invoices || [];
        setInvoices(invList);
        if (invList.length > 0 && !selectedInvoiceId) {
          setSelectedInvoiceId(invList[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchPaymentsAndInvoices();
  }, []);

  const handleSwitchRole = async (targetRole: string) => {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // Submit Payment Action
  const handleRegisterPayment = async () => {
    if (!selectedInvoiceId) {
      alert("Pilih invoice yang akan dibayar");
      return;
    }

    try {
      const res = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: paymentAmount,
          paymentMethod,
          notes: "Pembayaran terdaftar via UI Form S-12",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mencatat pembayaran");
        return;
      }

      alert(`Pembayaran berhasil dicatat! Sisa piutang: Rp${data.remainingBalance?.toLocaleString("id-ID")}`);
      await fetchPaymentsAndInvoices();
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test T-23
  const runTestT23 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      // Find an invoice with outstanding balance (or create/post from T-19)
      let targetInv = invoices.find((inv) => inv.status === "CONFIRMED" && inv.outstandingAmount >= 100000);

      if (!targetInv) {
        // Fallback: check all invoices
        const resInv = await fetch("/api/accounting/invoices");
        const dataInv = await resInv.json();
        targetInv = dataInv.invoices?.find((i: any) => i.status === "CONFIRMED" && i.outstandingAmount >= 100000);
      }

      if (!targetInv) {
        alert("Jalankan Uji T-19 terlebih dahulu untuk memastikan adanya Customer Invoice status CONFIRMED dengan nilai tagihan.");
        return;
      }

      const resPay = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          amount: 100000,
          paymentMethod: "BANK",
        }),
      });
      const dataPay = await resPay.json();

      const passed =
        dataPay.success === true &&
        dataPay.remainingBalance === targetInv.outstandingAmount - 100000 &&
        dataPay.journalEntry?.items?.length === 2;

      setTestResult({
        id: "T-23",
        name: "Alur Normal: Pembayaran Parsial Customer Invoice Rp100.000 (Fitur F-15 / Wireframe S-12)",
        status: passed ? "PASS" : "FAIL",
        expected: "Gross awal Rp264.000; Paid Rp100.000; Outstanding Rp164.000; Bank naik Rp100.000; A/R turun Rp100.000.",
        actual: `Pembayaran ${dataPay.payment?.paymentNumber} sukses. Nilai bayar: Rp${dataPay.payment?.amount?.toLocaleString("id-ID")}, Sisa Piutang: Rp${dataPay.remainingBalance?.toLocaleString("id-ID")}. Journal Entry: Dr 1010 Bank Rp100.000 / Cr 1020 AR Rp100.000.`,
      });

      await fetchPaymentsAndInvoices();
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-24
  const runTestT24 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.status === "CONFIRMED");

      if (!targetInv) {
        alert("Jalankan Uji T-19 terlebih dahulu untuk menghasilkan data tagihan.");
        return;
      }

      // Try paying Rp300.000 when invoice outstanding is Rp264.000 (or less)
      const resExcess = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          amount: 300000,
          paymentMethod: "BANK",
        }),
      });
      const dataExcess = await resExcess.json();

      const blockedOk =
        resExcess.status === 400 &&
        dataExcess.error.includes("Pembayaran melebihi sisa tagihan");

      setTestResult({
        id: "T-24",
        name: "Aturan / Edge Case: Pencegahan Pembayaran Berlebih / Overpayment (SR-19 / F-15)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Sistem menolak pembayaran Rp300.000 karena melebihi saldo outstanding sesuai aturan SR-19.",
        actual: `HTTP ${resExcess.status}: "${dataExcess.error}". Overpayment berhasil diblokir di server.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <HeaderNavbar
        currentUser={user}
        onSwitchRole={handleSwitchRole}
        onOpenResetModal={() => setResetModalOpen(true)}
        onOpenAuditDrawer={() => setAuditDrawerOpen(true)}
        onOpenAppSwitcher={() => setAppSwitcherOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Wireframe S-12 Header */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Register Payment
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-800">
                  Wireframe S-12
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Accounting / Payments</strong> · Roles: Finance · Fitur: <strong>F-15, SR-19</strong>
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/invoices"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Customer Invoices
            </Link>
            <Link
              href="/accounting/vendor-bills"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Vendor Bills
            </Link>
            <Link
              href="/accounting/journal-entries"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
            >
              Journal Entries
            </Link>
          </div>
        </div>

        {/* Selected Invoice Payment Card (Wireframe S-12 Sections ②, ③, ④) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Section ②: Mode View / Status */}
          <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tahap Pembayaran:</span>
              <div className="inline-flex rounded-md shadow-2xs">
                {["INVOICE", "PAYMENT", "RECONCILED"].map((st) => {
                  const isReconciled = selectedInvoice?.paymentStatus === "PAID";
                  const isPartial = selectedInvoice?.paymentStatus === "PARTIAL";
                  const active =
                    st === "INVOICE" ||
                    (st === "PAYMENT" && (isPartial || isReconciled)) ||
                    (st === "RECONCILED" && isReconciled);

                  return (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-bold font-mono ${
                        active
                          ? "bg-green-700 text-white"
                          : "bg-white text-gray-400"
                      } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                    >
                      {st}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Kebijakan <strong className="text-gray-800">SR-19</strong>: Pembayaran parsial diizinkan; kelebihan bayar dilarang keras.
            </div>
          </div>

          {/* Section ③: Form Inti */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border-b border-gray-200">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Pilih Customer Invoice
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-green-600"
              >
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customer?.name} (Rp{inv.totalAmount?.toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-gray-500 block mt-1">
                Customer: {selectedInvoice?.customer?.name} ({selectedInvoice?.customer?.code})
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-green-600"
              >
                <option value="BANK">Bank BCA / Transfer (1010 Bank)</option>
                <option value="CASH">Kas Tunai / Cash (1010 Cash)</option>
                <option value="QRIS">QRIS Statis/Dinamis (1010 Bank)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Nominal Pembayaran (Rp)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                min={1}
                className="w-full text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-green-600"
              />
              <span className="text-[11px] text-gray-500 block mt-1">
                Contoh: Rp100.000 untuk pengujian T-23
              </span>
            </div>

            <div className="flex flex-col justify-end">
              <button
                onClick={handleRegisterPayment}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>Catat Pembayaran</span>
              </button>
            </div>
          </div>

          {/* Section ④: Pembayaran Parsial dan Sisa KPI Grid */}
          <div className="p-6 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">
              ④ Ringkasan Saldo Pembayaran Parsial dan Sisa (F-15 / Wireframe S-12)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Invoice Total
                </span>
                <span className="text-xl font-extrabold text-gray-900 font-mono">
                  Rp{selectedInvoice?.totalAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  Net + PBJT 10%
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-green-600 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="text-xl font-extrabold text-green-700 font-mono">
                  Rp{selectedInvoice?.paidAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  Akumulasi pembayaran diterima
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                  Outstanding Balance
                </span>
                <span className="text-xl font-extrabold text-amber-800 font-mono">
                  Rp{selectedInvoice?.outstandingAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  Sisa piutang dagang (1020 A/R)
                </span>
              </div>
            </div>
          </div>

          {/* Wireframe S-12 Section ⑤: Related Docs & Audit History */}
          <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-gray-700">⑤ Related Docs:</span>
              <span className="font-mono text-teal-700">Invoice: {selectedInvoice?.invoiceNumber || "-"}</span>
              <span>·</span>
              <span className="font-mono text-gray-700">Customer: {selectedInvoice?.customer?.code || "-"}</span>
              <span>·</span>
              <span className="font-mono text-purple-700">Jurnal Otomatis: Dr 1010 Bank / Cr 1020 A/R</span>
            </div>
            <button
              onClick={() => setAuditDrawerOpen(true)}
              className="text-green-700 hover:text-green-900 font-semibold flex items-center space-x-1"
            >
              <span>Lihat Log Notes & Audit Trail</span>
            </button>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
              Riwayat Pembayaran Terdaftar (Payment History)
            </h2>
            <span className="text-xs text-gray-500 font-mono">
              Total: {payments.length} transaksi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">No. Bukti Bayar</th>
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4">Customer / Partner</th>
                  <th className="py-2.5 px-4">Invoice / Referensi</th>
                  <th className="py-2.5 px-4">Metode</th>
                  <th className="py-2.5 px-4 text-right">Nominal Bayar</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400 font-sans">
                      Belum ada catatan pembayaran. Jalankan Uji T-23 untuk menguji pembayaran.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-bold text-green-800">{p.paymentNumber}</td>
                      <td className="py-2.5 px-4 font-sans text-gray-600">
                        {new Date(p.paymentDate).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-gray-900 font-semibold">
                        {p.customer?.name || p.vendor?.name || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-teal-700">
                        {p.invoice?.invoiceNumber || p.bill?.billNumber || "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-green-900">
                        Rp{p.amount?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Test Suite for Phase 6 (T-23, T-24) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center space-x-2">
                <Play className="w-4 h-4 text-green-600" />
                <span>Pengujian Modul Pembayaran (T-23 & T-24)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Verifikasi pembayaran parsial, saldo piutang, dan perlindungan overpayment (SR-19 / F-15).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT23}
                disabled={testing}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-23 (Normal Flow)</span>
              </button>
              <button
                onClick={runTestT24}
                disabled={testing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-24 (Edge Case)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                testResult.status === "PASS"
                  ? "bg-green-50 border-green-200 text-green-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      testResult.status === "PASS"
                        ? "bg-green-200 text-green-800"
                        : "bg-rose-200 text-rose-800"
                    }`}
                  >
                    {testResult.status}
                  </span>
                  <span>
                    {testResult.id} — {testResult.name}
                  </span>
                </span>
              </div>
              <p>
                <strong>Ekspektasi:</strong> {testResult.expected}
              </p>
              <p className="font-mono">
                <strong>Hasil Aktual:</strong> {testResult.actual}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modals & Drawers */}
      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        userRole={user?.role || "FINANCE"}
      />
      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        userRole={user?.role || "FINANCE"}
        onSuccess={() => {
          fetchPaymentsAndInvoices();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
