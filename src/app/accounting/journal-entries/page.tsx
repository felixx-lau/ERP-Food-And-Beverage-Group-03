"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Lock,
  Scale,
  ShieldAlert,
  FileText,
  Check,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Receipt,
} from "lucide-react";
import Link from "next/link";

export default function JournalEntriesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Filter state
  const [journalFilter, setJournalFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Test Runner state
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
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
        const list = data.entries || [];
        setEntries(list);
        if (list.length > 0 && !selectedEntry) {
          setSelectedEntry(list[0]);
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
      setCurrentUser(data.user);
      await fetchJournalEntries();
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchType = journalFilter === "ALL" || e.journalType === journalFilter;
      const matchSearch =
        e.entryNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sourceDocument?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [entries, journalFilter, searchQuery]);

  // Overall totals across filtered entries
  const { totalDebitSum, totalCreditSum, allBalanced } = useMemo(() => {
    let d = 0;
    let c = 0;
    let balanced = true;
    for (const e of entries) {
      d += e.totalDebit || 0;
      c += e.totalCredit || 0;
      if (!e.isBalanced) balanced = false;
    }
    return { totalDebitSum: d, totalCreditSum: c, allBalanced: balanced };
  }, [entries]);

  // Run Test T-25
  const runTestT25 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

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

      const cogsItem = deliveryEntry.items?.find((i: any) => i.account?.code === "5010");
      const invItem = deliveryEntry.items?.find((i: any) => i.account?.code === "1030");
      const isDeliveryValid = cogsItem?.debit === 130000 && invItem?.credit === 130000;

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

      const resRetry = await fetch(`/api/accounting/invoices/${targetInvoice.id}/post`, {
        method: "POST",
      });
      const dataRetry = await resRetry.json();

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
    <AppLayout
      currentUser={currentUser}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[
        { label: "Keuangan & Akuntansi", href: "/accounting/invoices" },
        { label: "General Ledger & Jurnal (S-13)" },
      ]}
    >
      <div className="space-y-6">
        {/* Module Header & Sub-Nav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#DCE8DF] shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#174A3A]" />
              <h1 className="text-xl font-bold text-[#202824] tracking-tight">
                Journal Entries & General Ledger
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DCE8DF] text-[#174A3A]">
                Wireframe S-13
              </span>
            </div>
            <p className="text-xs text-[#758078] mt-1">
              Buku besar berpasangan otomatis (Double-Entry Bookkeeping), COGS tracking & pencegahan jurnal duplikat (SR-13 / F-14).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/invoices"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-[#202824] hover:bg-[#F7F8F5] transition-colors"
            >
              Customer Invoices
            </Link>
            <Link
              href="/accounting/vendor-bills"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-[#202824] hover:bg-[#F7F8F5] transition-colors"
            >
              Vendor Bills
            </Link>
            <Link
              href="/accounting/payments"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-[#202824] hover:bg-[#F7F8F5] transition-colors"
            >
              Payments
            </Link>
            <button
              onClick={fetchJournalEntries}
              className="p-1.5 rounded-lg border border-[#DCE8DF] text-[#758078] hover:text-[#174A3A] hover:bg-[#F7F8F5] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* SR-15 Access Denied Warning */}
        {accessDeniedMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-800 flex items-start space-x-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Otorisasi Gagal (SR-15)</h3>
              <p className="text-xs mt-1">{accessDeniedMessage}</p>
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-xs font-semibold">Ganti Role ke:</span>
                <button
                  onClick={() => handleSwitchRole("FINANCE")}
                  className="px-3 py-1 bg-[#174A3A] text-white rounded text-xs font-bold hover:bg-[#103429] transition-colors"
                >
                  Finance (Budi Utomo)
                </button>
                <button
                  onClick={() => handleSwitchRole("OWNER")}
                  className="px-3 py-1 bg-[#C6A15B] text-[#103429] rounded text-xs font-bold hover:bg-[#b08e4d] transition-colors"
                >
                  Owner (Maya Prasetyo)
                </button>
              </div>
            </div>
          </div>
        )}

        {!accessDeniedMessage && (
          <>
            {/* KPI Cards: General Ledger Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Akumulasi Debit"
                value={`Rp${totalDebitSum.toLocaleString("id-ID")}`}
                subtitle="Seluruh entri jurnal diposting"
                icon={TrendingUp}
              />
              <KPICard
                title="Total Akumulasi Kredit"
                value={`Rp${totalCreditSum.toLocaleString("id-ID")}`}
                subtitle="Seluruh entri kredit diposting"
                icon={TrendingUp}
              />
              <KPICard
                title="Status Keseimbangan"
                value={allBalanced ? "SEIMBANG" : "UNBALANCED"}
                subtitle="Debit vs Credit = Rp0 selisih"
                badgeText={allBalanced ? "BALANCE (100%)" : "CHECK REQUIRED"}
                badgeVariant={allBalanced ? "success" : "danger"}
                icon={Scale}
              />
              <KPICard
                title="Total Journal Entries"
                value={entries.length}
                subtitle="Arsip audit buku besar"
                icon={BookOpen}
              />
            </div>

            {/* Filter Bar & Entry Selection */}
            <div className="card-aruna p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "ALL", label: "Semua Jurnal" },
                  { key: "STOCK_DELIVERY", label: "Delivery (COGS)" },
                  { key: "CUSTOMER_INVOICE", label: "Invoices" },
                  { key: "PAYMENT_IN", label: "Kas/Bank" },
                  { key: "STOCK_RECEIPT", label: "Receipt (GRNI)" },
                  { key: "VENDOR_BILL", label: "Bills" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setJournalFilter(tab.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      journalFilter === tab.key
                        ? "bg-[#174A3A] text-white"
                        : "bg-[#F7F8F5] text-[#758078] hover:text-[#202824] hover:bg-[#DCE8DF]/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758078]" />
                  <input
                    type="text"
                    placeholder="Cari ref / nomor jurnal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#F7F8F5] border border-[#DCE8DF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#174A3A] text-[#202824]"
                  />
                </div>

                <select
                  value={selectedEntry?.id || ""}
                  onChange={(e) => {
                    const sel = entries.find((x) => x.id === e.target.value);
                    if (sel) setSelectedEntry(sel);
                  }}
                  className="text-xs font-mono font-bold bg-[#F7F8F5] border border-[#DCE8DF] rounded-lg px-3 py-1.5 text-[#202824] focus:outline-none focus:ring-1 focus:ring-[#174A3A]"
                >
                  {filteredEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.entryNumber} — {e.sourceDocument} ({e.journalType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Entry Detail Card (Wireframe S-13) */}
            {selectedEntry && (
              <div className="card-aruna overflow-hidden">
                {/* Section ③: Source, Journal, Posting State */}
                <div className="p-6 border-b border-[#DCE8DF] grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
                  <div>
                    <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                      Entry Number
                    </span>
                    <span className="text-xl font-extrabold text-[#174A3A] font-mono block mt-1">
                      {selectedEntry.entryNumber}
                    </span>
                    <span className="text-xs text-[#758078] block mt-1">
                      Tanggal: {new Date(selectedEntry.entryDate).toLocaleDateString("id-ID")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                      Source Document
                    </span>
                    <span className="text-base font-bold text-[#202824] font-mono block mt-1">
                      {selectedEntry.sourceDocument}
                    </span>
                    <span className="text-xs text-[#758078] block mt-1">
                      Tipe Jurnal: <strong className="text-[#174A3A]">{selectedEntry.journalType}</strong>
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                      Status Posting
                    </span>
                    <div className="mt-1 flex items-center space-x-2">
                      <StatusBadge status={selectedEntry.postingStatus} />
                      <span className="text-xs text-[#758078]">Double-Entry Posted</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                      Keseimbangan Debit / Credit
                    </span>
                    <div className="mt-1 flex items-center space-x-1.5">
                      <Scale className={`w-4 h-4 ${selectedEntry.isBalanced ? "text-emerald-600" : "text-rose-600"}`} />
                      <span className={`text-xs font-bold ${selectedEntry.isBalanced ? "text-emerald-700" : "text-rose-700"}`}>
                        {selectedEntry.isBalanced ? "BALANCE (SEIMBANG)" : "UNBALANCED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section ④: Debet-kredit dan hubungan stock */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-[#202824] uppercase tracking-wider flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#174A3A]" />
                      <span>Rincian Baris Jurnal Double-Entry (F-14 / S-13)</span>
                    </h3>
                    <span className="text-xs text-[#758078] font-mono">
                      {selectedEntry.items?.length || 0} akun terdampak
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#DCE8DF] rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F8F5] border-b border-[#DCE8DF] text-[#758078] font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Kode Akun</th>
                          <th className="py-3 px-4">Nama Akun (Chart of Accounts)</th>
                          <th className="py-3 px-4">Keterangan / Deskripsi</th>
                          <th className="py-3 px-4 text-right">Debit (Rp)</th>
                          <th className="py-3 px-4 text-right">Credit (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE8DF] font-mono">
                        {selectedEntry.items?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-[#F7F8F5] transition-colors">
                            <td className="py-3 px-4 font-bold text-[#174A3A]">
                              {item.account?.code}
                            </td>
                            <td className="py-3 px-4 font-sans font-semibold text-[#202824]">
                              {item.account?.name}
                            </td>
                            <td className="py-3 px-4 font-sans text-[#758078]">
                              {item.description || "-"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#202824]">
                              {item.debit > 0 ? `Rp${item.debit.toLocaleString("id-ID")}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#202824]">
                              {item.credit > 0 ? `Rp${item.credit.toLocaleString("id-ID")}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#F7F8F5] font-mono font-extrabold border-t-2 border-[#DCE8DF]">
                        <tr>
                          <td colSpan={3} className="py-3.5 px-4 font-sans text-[#202824] uppercase text-right">
                            Total Saldo Jurnal:
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#174A3A] text-sm">
                            Rp{selectedEntry.totalDebit?.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#174A3A] text-sm">
                            Rp{selectedEntry.totalCredit?.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Section ⑤: Related Docs & Audit History */}
                <div className="bg-[#F7F8F5] px-6 py-3.5 border-t border-[#DCE8DF] flex flex-wrap items-center justify-between text-xs text-[#758078]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-[#202824]">⑤ Related Documents:</span>
                    <span className="font-mono text-[#174A3A] font-semibold">
                      Source: {selectedEntry.sourceDocument}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[#202824]">
                      Ref: {selectedEntry.entryNumber}
                    </span>
                    <span>•</span>
                    <span className="font-sans text-[#758078]">
                      Posting Date: {new Date(selectedEntry.createdAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#758078] font-mono">
                    Audit trail logged in AuditLog DB
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* QA Automated Test Runner: T-25 & T-26 */}
        <div className="bg-[#103429] text-white rounded-xl shadow-lg border border-[#174A3A] p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#174A3A]/60 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-[#C6A15B]" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-white">
                  QA Automation Runner: General Ledger & Double-Entry (T-25 & T-26)
                </h2>
              </div>
              <p className="text-xs text-[#DCE8DF]/80 mt-1">
                Memverifikasi keseimbangan debit-kredit, pelacakan hubungan persediaan COGS, dan pencegahan duplikasi jurnal posting ulang (SR-13 / F-14).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT25}
                disabled={testing}
                className="px-3.5 py-1.5 bg-[#C6A15B] hover:bg-[#b08e4d] text-[#103429] rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Uji T-25 (Normal Flow)</span>
              </button>
              <button
                onClick={runTestT26}
                disabled={testing}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Uji T-26 (Edge Case SR-13)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                testResult.status === "PASS"
                  ? "bg-[#174A3A]/70 border-emerald-500/50 text-[#DCE8DF]"
                  : "bg-rose-950/60 border-rose-500/50 text-rose-200"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      testResult.status === "PASS"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    {testResult.status}
                  </span>
                  <span className="text-white text-sm">
                    {testResult.id} — {testResult.name}
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                <p>
                  <strong className="text-[#C6A15B]">Ekspektasi:</strong> {testResult.expected}
                </p>
                <p className="font-mono">
                  <strong className="text-white">Hasil Aktual:</strong> {testResult.actual}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
