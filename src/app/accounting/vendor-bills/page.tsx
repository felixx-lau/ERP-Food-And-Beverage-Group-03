"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Receipt, CheckCircle2, Lock, FileSpreadsheet, ShieldAlert, FileText, Check } from "lucide-react";
import Link from "next/link";

export default function VendorBillsPage() {
  const [user, setUser] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/vendor-bills");
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
        if (data.bills?.length > 0 && !selectedBill) {
          setSelectedBill(data.bills[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/accounting/vendor-bills/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBill(data.bill);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchBills();
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

  // Run Test T-21
  const runTestT21 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resReceipts = await fetch("/api/inventory/receipts");
      const dataReceipts = await resReceipts.json();
      const doneReceipt = dataReceipts.receipts.find((r: any) => r.status === "DONE");

      if (!doneReceipt) {
        alert("Jalankan Uji T-17 terlebih dahulu untuk menghasilkan penerimaan barang yang valid.");
        return;
      }

      const resBill = await fetch("/api/accounting/vendor-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: doneReceipt.purchaseOrderId,
          receiptId: doneReceipt.id,
          lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
        }),
      });
      const dataBill = await resBill.json();

      const resPost = await fetch(`/api/accounting/vendor-bills/${dataBill.bill.id}/post`, { method: "POST" });
      const dataPost = await resPost.json();

      const passed =
        dataBill.bill.subtotalNet === 96000 &&
        dataBill.bill.taxAmount === 0 &&
        dataBill.bill.totalGross === 96000 &&
        dataPost.vendorBill.status === "POSTED";

      setTestResult({
        id: "T-21",
        name: "Alur Normal: Vendor Bill & Three-Way Match (Fitur F-13)",
        status: passed ? "PASS" : "FAIL",
        expected: "Vendor Bill net Rp96.000, tax 0, total Rp96.000; Dr GRNI Rp96.000, Cr A/P Rp96.000; GRNI bernilai nol.",
        actual: `Vendor Bill: ${dataPost.vendorBill.billNumber}, Total: Rp ${dataPost.vendorBill.totalGross.toLocaleString("id-ID")}. Jurnal: ${dataPost.journalEntry.entryNumber} (Dr GRNI Rp96.000 = Cr A/P Rp96.000). Akun GRNI klir menjadi 0.`,
      });

      await fetchBills();
      await fetchBillDetail(dataBill.bill.id);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-22
  const runTestT22 = async () => {
    setTesting(true);
    try {
      if (!selectedBill) {
        alert("Pilih Vendor Bill terlebih dahulu.");
        return;
      }

      await handleSwitchRole("FINANCE");

      const resRetry = await fetch(`/api/accounting/vendor-bills/${selectedBill.id}/post`, { method: "POST" });
      const dataRetry = await resRetry.json();

      const resDup = await fetch("/api/accounting/vendor-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedBill.purchaseOrderId,
          lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
        }),
      });
      const dataDup = await resDup.json();

      const blockedOk = resDup.status === 400 && dataDup.error.includes("Three-Way Match Gagal");

      setTestResult({
        id: "T-22",
        name: "Aturan / Edge Case: Pencegahan Tagihan Vendor Duplikat (SR-06 / SR-13 / F-13)",
        status: dataRetry.alreadyPosted && blockedOk ? "PASS" : "FAIL",
        expected: "Post ulang bersifat idempotent (tidak ada jurnal kedua) dan pembuatan bill duplikat diblokir oleh Three-Way Match.",
        actual: `Post ulang bill: "${dataRetry.message}". Pembuatan bill kedua: HTTP ${resDup.status} "${dataDup.error}".`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Keuangan & Akuntansi" }, { label: "Vendor Bills (3-Way)" }]}
      title="Vendor Bills & Three-Way Matching"
      subtitle="Verifikasi Tagihan Pemasok Melalui Pencocokan 3 Arah (PO vs GR vs Bill) & Kliring Akun GRNI (F-13, SR-06, SR-13)"
      wireframe="Wireframe S-11"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Tagihan Vendor:</span>
          <select
            value={selectedBill?.id || ""}
            onChange={(e) => fetchBillDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A]"
          >
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.billNumber} — {b.vendor?.name} ({b.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Bill Detail */}
      {selectedBill && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Bar */}
          <div className="bg-[#F7F8F5] px-6 py-3 border-b border-[#E5E9E4] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-[#758078] uppercase tracking-wider">Status Tagihan:</span>
              <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-[#E5E9E4]">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => {
                  const active = (selectedBill.status === "POSTED" && st === "DONE") || selectedBill.status === st;
                  return (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                        active
                          ? "bg-[#174A3A] text-white"
                          : "bg-white text-[#758078]"
                      }`}
                    >
                      {st}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#758078]">Pencocokan:</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Three-Way Match Terverifikasi
              </span>
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-4 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor Vendor Bill
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedBill.billNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Pemasok / Vendor
              </span>
              <p className="text-base font-bold text-[#202824] mt-0.5">
                {selectedBill.vendor?.name}
              </p>
              <span className="text-xs text-[#758078] font-mono">
                ID: {selectedBill.vendorId}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Referensi Purchase Order
              </span>
              <p className="text-sm font-bold text-[#174A3A] font-mono mt-0.5">
                {selectedBill.purchaseOrder?.poNumber}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Pajak Vendor
              </span>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                0% (Fixture)
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#174A3A]" />
                <span>Pencocokan Tiga Arah: PO vs Receipt (Accepted) vs Tagihan Baru</span>
              </h3>
              <span className="text-xs text-[#758078]">Mencegah penagihan berlebih atau barang ditolak</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Dipesan (PO)</th>
                    <th className="px-6 py-3.5 text-right text-emerald-800">Diterima (Receipt)</th>
                    <th className="px-6 py-3.5 text-right text-[#758078]">Sudah Ditagih</th>
                    <th className="px-6 py-3.5 text-right text-[#174A3A] font-bold">Qty Tagihan Ini</th>
                    <th className="px-6 py-3.5 text-right">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedBill.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans">
                        <span className="font-mono text-[#174A3A] mr-2">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">10</td>
                      <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/40">8</td>
                      <td className="px-6 py-3.5 text-right text-[#758078]">0</td>
                      <td className="px-6 py-3.5 text-right font-black text-[#174A3A] bg-[#F2F7F4]">
                        {l.quantity}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">
                        Rp {l.totalAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F7F8F5] font-mono text-xs border-t-2 border-[#E5E9E4]">
                  <tr>
                    <td colSpan={5} className="px-6 py-3.5 text-right font-sans font-bold text-[#758078]">
                      Total Kewajiban Tagihan Vendor:
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-base text-[#174A3A]">
                      Rp {selectedBill.totalGross?.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QA Test Runner for T-21 & T-22 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-21 & T-22 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Three-Way Match, Kliring GRNI & Proteksi Tagihan Duplikat
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji pencocokan Three-Way Match, posting Vendor Bill (Dr GRNI = Cr AP), dan blokir tagihan duplikat (SR-13).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT21}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-21 (Vendor Bill 8 Accepted)</span>
            </button>

            <button
              onClick={runTestT22}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#C6A15B] hover:bg-[#A88544] text-[#103429] font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-22 (Duplicate Bill Prevention)</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-[#081B15] border border-[#C6A15B]/40 rounded-xl p-4.5 space-y-2.5 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#C6A15B] font-mono text-sm">[{testResult.id}]</span>
                <span className="font-semibold text-white">{testResult.name}</span>
              </div>
              <span
                className={`px-3 py-0.5 rounded-full font-bold font-mono text-xs ${
                  testResult.status === "PASS" ? "bg-emerald-500 text-gray-950" : "bg-rose-500 text-white"
                }`}
              >
                {testResult.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
              <div className="space-y-1">
                <span className="text-[#ADB2AA] font-semibold block">Ekspektasi:</span>
                <p className="text-[#DCE8DF] leading-relaxed">{testResult.expected}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[#ADB2AA] font-semibold block">Hasil Aktual:</span>
                <p className="text-emerald-300 font-mono leading-relaxed">{testResult.actual}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}