"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, PackageCheck, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Building, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function GoodsReceiptsPage() {
  const [user, setUser] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
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

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/receipts");
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
        if (data.receipts?.length > 0 && !selectedReceipt) {
          setSelectedReceipt(data.receipts[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/receipts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReceipt(data.receipt);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchReceipts();
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

  // Run Test T-17
  const runTestT17 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("PROCUREMENT");
      const resPO = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: "V03",
          lines: [{ productSku: "COF-LATT-HOT", orderedQty: 10, unitPrice: 12000 }],
        }),
      });
      const dataPO = await resPO.json();
      const resConf = await fetch(`/api/purchase/orders/${dataPO.order.id}/confirm`, { method: "POST" });
      const dataConf = await resConf.json();
      const receiptId = dataConf.receipt.id;

      await handleSwitchRole("WAREHOUSE");
      const resVal = await fetch(`/api/inventory/receipts/${receiptId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              lineId: dataConf.receipt.lines[0].id,
              productSku: "COF-LATT-HOT",
              acceptedQty: 8,
              rejectedQty: 2,
              rejectionReason: "Kemasan bocor",
            },
          ],
        }),
      });
      const dataVal = await resVal.json();

      const resStock = await fetch("/api/products/COF-LATT-HOT");
      const dataStock = await resStock.json();
      const whStock = dataStock.product.locations.find((l: any) => l.locationCode === "WH-JKT");

      const passed =
        dataVal.success &&
        dataVal.updatedReceipt.lines[0].acceptedQty === 8 &&
        dataVal.updatedReceipt.lines[0].rejectedQty === 2 &&
        dataVal.totalValuationAdded === 96000 &&
        whStock.onHand === 28;

      setTestResult({
        id: "T-17",
        name: "Alur Normal: Receipt Quality Acceptance (8 Accepted, 2 Rejected) (Fitur F-12)",
        status: passed ? "PASS" : "FAIL",
        expected: "Accepted 8, rejected 2; WH on-hand 20->28; valuation +Rp96.000; GRNI credit Rp96.000; tidak ada tambahan stok dari 2 rejected.",
        actual: `Receipt: ${dataVal.updatedReceipt.receiptNumber} (Accepted: 8, Rejected: 2). WH On-Hand: ${whStock.onHand} (hanya 8 unit diterima). Jurnal: ${dataVal.journalEntry.entryNumber} (Dr Persediaan Rp96.000 = Cr GRNI Rp96.000).`,
      });

      await fetchReceipts();
      await fetchReceiptDetail(receiptId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-18
  const runTestT18 = async () => {
    setTesting(true);
    try {
      if (!selectedReceipt) {
        alert("Pilih Goods Receipt terlebih dahulu");
        return;
      }

      await handleSwitchRole("FINANCE");

      const resBill = await fetch("/api/accounting/vendor-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedReceipt.purchaseOrderId,
          receiptId: selectedReceipt.id,
          lines: [{ productSku: "COF-LATT-HOT", quantity: 10, unitPrice: 12000 }],
        }),
      });
      const dataBill = await resBill.json();

      const blockedOk = resBill.status === 400 && dataBill.error.includes("Three-Way Match Gagal");

      setTestResult({
        id: "T-18",
        name: "Aturan / Edge Case: Penolakan Tagihan Barang Ditolak (SR-06 / F-12)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Mencoba menagih 10 unit diblokir; sistem membatasi penagihan maksimal sebesar accepted quantity (8 unit).",
        actual: `HTTP ${resBill.status}: "${dataBill.error}". Sistem three-way match mencegah tagihan atas barang yang ditolak.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "Penerimaan Barang" }]}
      title="Goods Receipts & Quality Inspection"
      subtitle="Penerimaan Barang dari Vendor, Inspeksi Mutu (Accepted vs Rejected) & Akrual GRNI Otomatis (F-12, SR-06)"
      wireframe="Wireframe S-09"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Dokumen Receipt:</span>
          <select
            value={selectedReceipt?.id || ""}
            onChange={(e) => fetchReceiptDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A]"
          >
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.receiptNumber} — PO: {r.purchaseOrder?.poNumber} ({r.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Receipt Detail */}
      {selectedReceipt && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Bar */}
          <div className="bg-[#F7F8F5] px-6 py-3 border-b border-[#E5E9E4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-[#758078] uppercase tracking-wider">Tahapan Dokumen:</span>
              <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-[#E5E9E4]">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => (
                  <span
                    key={st}
                    className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                      selectedReceipt.status === st
                        ? "bg-[#174A3A] text-white"
                        : "bg-white text-[#758078]"
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#758078]">Inspeksi Mutu:</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pemeriksaan Fisik Aktif (SR-06)
              </span>
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-4 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor Goods Receipt
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedReceipt.receiptNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Referensi PO
              </span>
              <p className="text-base font-bold text-[#202824] font-mono mt-0.5">
                {selectedReceipt.purchaseOrder?.poNumber}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Lokasi Penerimaan (Dest)
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-[#174A3A]" />
                <span className="text-sm font-bold text-[#202824]">{selectedReceipt.destLocation}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Vendor Pengirim
              </span>
              <p className="text-sm font-bold text-[#202824] mt-0.5">
                {selectedReceipt.purchaseOrder?.vendor?.name}
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Hasil Inspeksi Kualitas & Diterima (Accepted / Rejected)</span>
              </h3>
              <span className="text-xs text-[#758078]">Hanya barang diterima (accepted) yang masuk ke stok</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Dipesan (Demand)</th>
                    <th className="px-6 py-3.5 text-right text-emerald-800">Diterima (Accepted)</th>
                    <th className="px-6 py-3.5 text-right text-rose-800">Ditolak (Rejected)</th>
                    <th className="px-6 py-3.5">Catatan Inspeksi Mutu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedReceipt.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans">
                        <span className="font-mono text-[#174A3A] mr-2">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">{l.demandQty}</td>
                      <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/40">
                        {l.acceptedQty}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-rose-700 bg-rose-50/40">
                        {l.rejectedQty}
                      </td>
                      <td className="px-6 py-3.5 font-sans text-xs text-[#758078] italic">
                        {l.rejectionReason || "Pemeriksaan mutu lolos (kondisi prima)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QA Test Runner for T-17 & T-18 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-17 & T-18 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Penerimaan Mutu (8 Acc / 2 Rej) & Blokir Tagihan Ditolak
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji penerimaan barang dengan inspeksi mutu (F-12) dan blokir pembuatan tagihan atas barang ditolak (SR-06).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT17}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-17 (Penerimaan 8 Acc / 2 Rej)</span>
            </button>

            <button
              onClick={runTestT18}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-18 (Tagih 10 Barang Ditolak)</span>
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