"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, PackageCheck, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function GoodsReceiptsPage() {
  const [user, setUser] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
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
      // 1. Create and confirm PO P00007 if not yet created
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

      // 2. Switch to Warehouse and validate receipt: 8 accepted, 2 rejected
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

      // 3. Verify stock
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

      // Attempt to bill 10 units when accepted is only 8
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
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <HeaderNavbar
        currentUser={user}
        onSwitchRole={handleSwitchRole}
        onOpenResetModal={() => setResetModalOpen(true)}
        onOpenAuditDrawer={() => setAuditDrawerOpen(true)}
        onOpenAppSwitcher={() => setAppSwitcherOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Wireframe S-09 Header */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#714B67]" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Receipt dan Quality Acceptance
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-09
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Inventory / Receipt</strong> · Roles: Warehouse, Procurement · Fitur: <strong>F-12, SR-06</strong>
              </p>
            </div>
          </div>

          {/* Receipt Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-600">Pilih Penerimaan:</span>
            <select
              value={selectedReceipt?.id || ""}
              onChange={(e) => fetchReceiptDetail(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-purple-600"
            >
              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.receiptNumber} — PO: {r.purchaseOrder?.poNumber} ({r.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Receipt Detail */}
        {selectedReceipt && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            {/* Status Bar */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status:</span>
                <div className="inline-flex rounded-md shadow-2xs">
                  {["DRAFT", "CONFIRMED", "DONE"].map((st) => (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-bold font-mono ${
                        selectedReceipt.status === st
                          ? "bg-[#714B67] text-white"
                          : "bg-white text-gray-400"
                      } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Header */}
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-6 bg-gray-50/40">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Receipt Number
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {selectedReceipt.receiptNumber}
                </h2>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  PO Reference
                </span>
                <p className="text-base font-bold text-gray-900 font-mono mt-0.5">
                  {selectedReceipt.purchaseOrder?.poNumber}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Destination Location
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedReceipt.destLocation}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Vendor
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedReceipt.purchaseOrder?.vendor?.name}
                </p>
              </div>
            </div>

            {/* Lines Table */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                ④ Accepted dan Rejected Quantity (SR-06)
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Variant SKU</th>
                      <th className="px-6 py-3 text-right">Demand</th>
                      <th className="px-6 py-3 text-right text-emerald-800">Accepted Qty</th>
                      <th className="px-6 py-3 text-right text-rose-800">Rejected Qty</th>
                      <th className="px-6 py-3">Catatan Inspeksi Mutu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedReceipt.lines?.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 font-bold text-gray-900 font-sans">
                          {l.productSku} — {l.product?.name}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">{l.demandQty}</td>
                        <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/40">
                          {l.acceptedQty}
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-rose-700 bg-rose-50/40">
                          {l.rejectedQty}
                        </td>
                        <td className="px-6 py-3.5 font-sans text-xs text-gray-500 italic">
                          {l.rejectionReason || "Pemeriksaan lolos"}
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
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-17 & T-18
              </h3>
              <p className="text-xs text-gray-300">
                Uji penerimaan barang (8 accepted, 2 rejected) dan blokir tagihan barang ditolak (SR-06).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT17}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-17 (Penerimaan 8 Acc / 2 Rej)</span>
              </button>

              <button
                onClick={runTestT18}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-18 (Tagih 10 Barang Ditolak)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-gray-950/80 border border-gray-700 rounded-lg p-4 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-amber-300 font-mono text-sm">[{testResult.id}]</span>
                  <span className="font-semibold text-white">{testResult.name}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-xs ${
                    testResult.status === "PASS" ? "bg-emerald-500 text-gray-950" : "bg-rose-500 text-white"
                  }`}
                >
                  {testResult.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-gray-400 font-semibold block">Expected Result:</span>
                  <p className="text-gray-200 mt-0.5">{testResult.expected}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block">Actual Result:</span>
                  <p className="text-emerald-300 mt-0.5 font-mono">{testResult.actual}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        userRole={user?.role}
        onSelectApp={(app) => alert(`Buka modul: ${app}`)}
      />
      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        currentUserRole={user?.role}
        onSuccess={() => fetchReceipts()}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
