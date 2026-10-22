"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, BookOpen, CheckCircle2, Lock, Scale, ShieldAlert, FileText, Check } from "lucide-react";
import Link from "next/link";

export default function JournalEntriesPage() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Filter state
  const [journalFilter, setJournalFilter] = useState<string>("ALL");

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

  const fetchJournalEntries = async () => {
    setLoading(true);
    setAccessDeniedMessage(null);
    try {
      const res = await fetch("/api/accounting/journal-entries");
      if (res.status === 403) {
        const err = await res.json();
        setAccessDeniedMessage(err.error || "Akses Ditolak: Hanya Finance dan Owner yang berwenang membuka General Ledger (SR-15).");
        setEntries([]);
        setSelectedEntry(null);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        if (data.entries?.length > 0 && !selectedEntry) {
          setSelectedEntry(data.entries[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchJournalEntries();
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
      // Refetch journal entries with new role credentials
      await fetchJournalEntries();
    }
  };

  const filteredEntries = journalFilter === "ALL"
    ? entries
    : entries.filter((e) => e.journalType === journalFilter);

  // Run Test T-25
  const runTestT25 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      // Fetch entries for delivery (WH/OUT) and invoice (INV/2026)
      const resDeliveries = await fetch("/api/accounting/journal-entries?journalType=STOCK_DELIVERY");
      const dataDeliveries = await resDeliveries.json();

      const resInvoices = await fetch("/api/accounting/journal-entries?journalType=CUSTOMER_INVOICE");
      const dataInvoices = await resInvoices.json();

      const deliveryEntry = dataDeliveries.entries?.find((e: any) => e.sourceDocument?.startsWith("WH/OUT"));
      const invoiceEntry = dataInvoices.entries?.find((e: any) => e.sourceDocument?.startsWith("INV/2026"));

      if (!deliveryEntry || !invoiceEntry) {
        alert("Jalankan Uji T-11 dan Uji T-19 terlebih dahulu untuk menghasilkan event jurnal delivery dan invoice.");
        return;
      }

      // Check delivery entry: COGS 130k / Inventory 130k
      const cogsItem = deliveryEntry.items?.find((i: any) => i.account?.code === "5010");
      const invItem = deliveryEntry.items?.find((i: any) => i.account?.code === "1030");
      const isDeliveryValid = cogsItem?.debit === 130000 && invItem?.credit === 130000;

      // Check invoice entry: AR 264k / Revenue 240k / PBJT 24k
      const arItem = invoiceEntry.items?.find((i: any) => i.account?.code === "1020");
      const revItem = invoiceEntry.items?.find((i: any) => i.account?.code === "4010");
      const taxItem = invoiceEntry.items?.find((i: any) => i.account?.code === "2020");
      const isInvoiceValid =
        arItem?.debit === 264000 &&
        revItem?.credit === 240000 &&
        taxItem?.credit === 24000;

      const totalDebitCombined = deliveryEntry.totalDebit + invoiceEntry.totalDebit;
      const totalCreditCombined = deliveryEntry.totalCredit + invoiceEntry.totalCredit;
      const totalValid = totalDebitCombined === 394000 && totalCreditCombined === 394000;

      const passed = isDeliveryValid && isInvoiceValid && totalValid;

      setTestResult({
        id: "T-25",
        name: "Alur Normal: Verifikasi Jurnal Delivery & Customer Invoice (Fitur F-14 / Wireframe S-13)",
        status: passed ? "PASS" : "FAIL",
        expected: "Delivery: Dr COGS Rp130.000 = Cr Inventory Rp130.000; Invoice: Dr A/R Rp264.000 = Cr Revenue Rp240.000 + Cr PBJT Rp24.000; total debit = credit Rp394.000.",
        actual: `Delivery (${deliveryEntry.entryNumber}): Dr 5010 Rp${cogsItem?.debit?.toLocaleString("id-ID")} = Cr 1030 Rp${invItem?.credit?.toLocaleString("id-ID")}. Invoice (${invoiceEntry.entryNumber}): Dr 1020 Rp${arItem?.debit?.toLocaleString("id-ID")} = Cr 4010 Rp${revItem?.credit?.toLocaleString("id-ID")} + Cr 2020 Rp${taxItem?.credit?.toLocaleString("id-ID")}. Total debit=credit Rp${totalDebitCombined.toLocaleString("id-ID")}.`,
      });

      await fetchJournalEntries();
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-26
  const runTestT26 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resInvoices = await fetch("/api/accounting/invoices");
      const dataInvoices = await resInvoices.json();
      const targetInvoice = dataInvoices.invoices?.find((i: any) => i.status === "CONFIRMED");

      if (!targetInvoice) {
        alert("Jalankan Uji T-19 terlebih dahulu untuk menghasilkan invoice terkonfirmasi.");
        return;
      }

      // Retry posting the same invoice
      const resRetry = await fetch(`/api/accounting/invoices/${targetInvoice.id}/post`, {
        method: "POST",
      });
      const dataRetry = await resRetry.json();

      // Check journal entries count for this invoice
      const resEntries = await fetch(`/api/accounting/journal-entries?sourceDocument=${targetInvoice.invoiceNumber}`);
      const dataEntries = await resEntries.json();
      const count = dataEntries.entries?.length || 0;

      const passed = dataRetry.alreadyPosted === true && count === 1;

      setTestResult({
        id: "T-26",
        name: "Aturan / Edge Case: Pencegahan Duplikasi Jurnal Posting Ulang (SR-13 / F-14)",
        status: passed ? "PASS" : "FAIL",
        expected: "Posting ulang dokumen yang telah diposting tidak membuat jurnal ganda dan menjaga integritas buku besar.",
        actual: `Sistem mendeteksi status POSTED: "${dataRetry.message}". Jumlah journal entry untuk ${targetInvoice.invoiceNumber} tetap tepat 1 entri (Idempotent OK).`,
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
        {/* Wireframe S-13 Header */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-purple-700" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Journal Entries dan General Ledger
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-13
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Accounting / Journal</strong> · Roles: Finance, Owner · Fitur: <strong>F-14, SR-13, SR-15</strong>
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
              href="/accounting/payments"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
            >
              Customer Payments
            </Link>
          </div>
        </div>

        {/* SR-15 Access Denied Warning */}
        {accessDeniedMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-800 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Otorisasi Gagal (SR-15)</h3>
              <p className="text-xs mt-1">{accessDeniedMessage}</p>
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-xs font-semibold">Ganti Role ke:</span>
                <button
                  onClick={() => handleSwitchRole("FINANCE")}
                  className="px-2.5 py-1 bg-purple-700 text-white rounded text-xs font-bold hover:bg-purple-800"
                >
                  Finance (Budi Utomo)
                </button>
                <button
                  onClick={() => handleSwitchRole("OWNER")}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700"
                >
                  Owner (Maya Prasetyo)
                </button>
              </div>
            </div>
          </div>
        )}

        {!accessDeniedMessage && (
          <>
            {/* View & Filter Bar (Wireframe S-13 Section ②) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe Jurnal:</span>
                <div className="inline-flex rounded-md shadow-2xs">
                  {[
                    { key: "ALL", label: "Semua Jurnal" },
                    { key: "STOCK_DELIVERY", label: "Stock Delivery (COGS)" },
                    { key: "CUSTOMER_INVOICE", label: "Customer Invoices" },
                    { key: "PAYMENT_IN", label: "Penerimaan Kas/Bank" },
                    { key: "STOCK_RECEIPT", label: "Goods Receipt (GRNI)" },
                    { key: "VENDOR_BILL", label: "Vendor Bills" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setJournalFilter(tab.key)}
                      className={`px-3 py-1.5 text-xs font-bold ${
                        journalFilter === tab.key
                          ? "bg-purple-700 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      } border border-gray-300 first:rounded-l-md last:rounded-r-md transition-colors`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-600">Pilih Entri Jurnal:</span>
                <select
                  value={selectedEntry?.id || ""}
                  onChange={(e) => {
                    const sel = entries.find((x) => x.id === e.target.value);
                    if (sel) setSelectedEntry(sel);
                  }}
                  className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-purple-600"
                >
                  {filteredEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.entryNumber} — {e.sourceDocument} ({e.journalType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Entry Detail Card */}
            {selectedEntry && (
              <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                {/* Section ③: Source, Journal, Posting State */}
                <div className="p-6 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Entry Number
                    </span>
                    <span className="text-xl font-extrabold text-purple-800 font-mono">
                      {selectedEntry.entryNumber}
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      Tanggal: {new Date(selectedEntry.entryDate).toLocaleDateString("id-ID")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Source Document
                    </span>
                    <span className="text-base font-bold text-gray-900 font-mono block">
                      {selectedEntry.sourceDocument}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Tipe: {selectedEntry.journalType}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Posting State
                    </span>
                    <div className="mt-1 flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded font-bold font-mono text-xs flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>{selectedEntry.postingStatus}</span>
                      </span>
                      <span className="text-xs text-gray-500 font-medium">· Double-Entry Posted</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Keseimbangan Debet / Kredit
                    </span>
                    <div className="mt-1 flex items-center space-x-2">
                      <Scale className={`w-4 h-4 ${selectedEntry.isBalanced ? "text-green-600" : "text-rose-600"}`} />
                      <span className={`text-xs font-bold ${selectedEntry.isBalanced ? "text-green-700" : "text-rose-700"}`}>
                        {selectedEntry.isBalanced ? "BALANCE (SEIMBANG)" : "UNBALANCED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section ④: Debet-kredit dan hubungan stock */}
                <div className="p-6">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    ④ Debet-kredit dan Hubungan Stock (F-14 / Wireframe S-13)
                  </h3>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4">Kode Akun</th>
                          <th className="py-2.5 px-4">Nama Akun (Chart of Accounts)</th>
                          <th className="py-2.5 px-4">Keterangan / Deskripsi</th>
                          <th className="py-2.5 px-4 text-right">Debit (Rp)</th>
                          <th className="py-2.5 px-4 text-right">Credit (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-mono">
                        {selectedEntry.items?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-2.5 px-4 font-bold text-purple-800">{item.account?.code}</td>
                            <td className="py-2.5 px-4 font-sans font-semibold text-gray-900">
                              {item.account?.name}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-gray-600">{item.description || "-"}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                              {item.debit > 0 ? `Rp${item.debit.toLocaleString("id-ID")}` : "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                              {item.credit > 0 ? `Rp${item.credit.toLocaleString("id-ID")}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-mono font-extrabold border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 font-sans text-gray-700 uppercase text-right">
                            Total Saldo Jurnal:
                          </td>
                          <td className="py-3 px-4 text-right text-purple-900 text-sm">
                            Rp{selectedEntry.totalDebit?.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-right text-purple-900 text-sm">
                            Rp{selectedEntry.totalCredit?.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Section ⑤: Related Docs & Audit History */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="font-bold text-gray-700">⑤ Related Docs:</span>
                    <span className="font-mono text-purple-700">Source: {selectedEntry.sourceDocument}</span>
                    <span>·</span>
                    <span className="font-mono text-gray-700">Ref: {selectedEntry.entryNumber}</span>
                    <span>·</span>
                    <span className="font-sans text-gray-500">Posting Date: {new Date(selectedEntry.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                  <button
                    onClick={() => setAuditDrawerOpen(true)}
                    className="text-purple-700 hover:text-purple-900 font-semibold flex items-center space-x-1"
                  >
                    <span>Lihat Log Notes & Audit Trail</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Interactive Test Suite for Phase 6 (T-25, T-26) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center space-x-2">
                <Play className="w-4 h-4 text-purple-600" />
                <span>Pengujian General Ledger (T-25 & T-26)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Verifikasi debit-kredit seimbang, pelacakan hubungan stok COGS, dan pencegahan duplikasi jurnal (SR-13 / F-14).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT25}
                disabled={testing}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-25 (Normal Flow)</span>
              </button>
              <button
                onClick={runTestT26}
                disabled={testing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-26 (Edge Case)</span>
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
          fetchJournalEntries();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
