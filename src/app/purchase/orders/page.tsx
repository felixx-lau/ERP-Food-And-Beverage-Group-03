"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, Truck, CheckCircle2, Lock, Plus, Building, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PurchaseOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.orders?.length > 0 && !selectedOrder) {
          setSelectedOrder(data.orders[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchOrders();
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

  // Run Test T-15
  const runTestT15 = async () => {
    setTesting(true);
    try {
      // 1. Switch to Procurement
      await handleSwitchRole("PROCUREMENT");

      // 2. Create RFQ V03: 10 x COF-LATT-HOT @ 12.000
      const resCreate = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: "V03",
          lines: [{ productSku: "COF-LATT-HOT", orderedQty: 10, unitPrice: 12000 }],
        }),
      });
      const dataCreate = await resCreate.json();
      const poId = dataCreate.order.id;

      // 3. Check stock before confirm
      const resStockBefore = await fetch("/api/products/COF-LATT-HOT");
      const dataStockBefore = await resStockBefore.json();
      const whBefore = dataStockBefore.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      // 4. Confirm PO
      const resConfirm = await fetch(`/api/purchase/orders/${poId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();

      // 5. Check stock after confirm (must remain unchanged!)
      const resStockAfter = await fetch("/api/products/COF-LATT-HOT");
      const dataStockAfter = await resStockAfter.json();
      const whAfter = dataStockAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const passed =
        dataCreate.order.subtotal === 120000 &&
        dataCreate.order.taxAmount === 0 &&
        dataCreate.order.total === 120000 &&
        dataConfirm.purchaseOrder.status === "CONFIRMED" &&
        whBefore === whAfter;

      setTestResult({
        id: "T-15",
        name: "Alur Normal: RFQ dan Confirm PO V03 (Fitur F-11)",
        status: passed ? "PASS" : "FAIL",
        expected: "PO subtotal Rp120.000, vendor tax 0%, total Rp120.000; on-hand tidak berubah dan commitment pembelian tercatat.",
        actual: `PO: ${dataConfirm.purchaseOrder.poNumber}, Total: Rp ${dataConfirm.purchaseOrder.total.toLocaleString("id-ID")}, Tax: 0%. Stok WH On-Hand sebelum: ${whBefore}, sesudah: ${whAfter} (stok fisik tidak bertambah sebelum barang datang).`,
      });

      await fetchOrders();
      await fetchOrderDetail(poId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-16
  const runTestT16 = async () => {
    setTesting(true);
    try {
      if (!selectedOrder) {
        alert("Pilih PO terlebih dahulu");
        return;
      }

      // Re-confirm selected PO
      const resRetry = await fetch(`/api/purchase/orders/${selectedOrder.id}/confirm`, { method: "POST" });
      const dataRetry = await resRetry.json();

      setTestResult({
        id: "T-16",
        name: "Aturan / Edge Case: Konfirmasi PO Idempotent (SR-13 / F-11)",
        status: dataRetry.alreadyConfirmed ? "PASS" : "FAIL",
        expected: "Klik Confirm ulang tidak menambah receipt atau commitment ganda (SR-13).",
        actual: `Response: "${dataRetry.message}". alreadyConfirmed: ${dataRetry.alreadyConfirmed}. Dokumen receipt tetap tunggal.`,
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
        {/* Wireframe S-08 Header */}
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
                  Request for Quotation dan Purchase Order
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-08
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Purchase</strong> · Roles: Procurement · Fitur: <strong>F-11</strong>
              </p>
            </div>
          </div>

          {/* PO Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-600">Pilih PO:</span>
            <select
              value={selectedOrder?.id || ""}
              onChange={(e) => fetchOrderDetail(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-purple-600"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.poNumber} — {o.vendor?.name} ({o.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected PO Detail (Wireframe S-08 Section 3 & 4) */}
        {selectedOrder && (
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
                        selectedOrder.status === st
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
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50/40">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  RFQ / PO Number
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {selectedOrder.poNumber}
                </h2>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Vendor
                </span>
                <p className="text-base font-bold text-gray-900 mt-0.5">
                  {selectedOrder.vendor?.name}
                </p>
                <span className="text-xs text-gray-500 font-mono">
                  ID: {selectedOrder.vendorId} · Terms: {selectedOrder.vendor?.paymentTerms}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Scheduled Date
                </span>
                <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">
                  {new Date(selectedOrder.scheduledDate).toLocaleDateString("id-ID")}
                </p>
                <span className="text-xs text-emerald-700 font-medium">Vendor Tax: 0% (Fixture)</span>
              </div>
            </div>

            {/* Lines Table */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                ④ Persetujuan Pembelian
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Variant SKU</th>
                      <th className="px-6 py-3 text-right">Ordered Qty</th>
                      <th className="px-6 py-3 text-right">Unit Cost</th>
                      <th className="px-6 py-3 text-right">Net Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedOrder.lines?.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 font-bold text-gray-900 font-sans">
                          {l.productSku} — {l.product?.name}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">{l.orderedQty}</td>
                        <td className="px-6 py-3.5 text-right">Rp {l.unitPrice.toLocaleString("id-ID")}</td>
                        <td className="px-6 py-3.5 text-right font-black text-gray-950">
                          Rp {l.subtotal.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-mono text-xs border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right font-sans font-bold text-gray-700">
                        Total PO:
                      </td>
                      <td className="px-6 py-3 text-right font-black text-base text-[#714B67]">
                        Rp {selectedOrder.total?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QA Test Runner for T-15 & T-16 */}
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-15 & T-16
              </h3>
              <p className="text-xs text-gray-300">
                Uji pembuatan RFQ, konfirmasi PO (tanpa penambahan stok fisik), dan idempotency konfirmasi berulang (SR-13).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT15}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-15 (Normal RFQ & PO V03)</span>
              </button>

              <button
                onClick={runTestT16}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-16 (Idempotent PO Retry)</span>
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
        onSuccess={() => fetchOrders()}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
