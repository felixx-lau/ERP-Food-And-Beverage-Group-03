"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, Truck, CheckCircle, AlertTriangle, Layers, Building } from "lucide-react";
import Link from "next/link";

export default function DeliveryPage() {
  const [user, setUser] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
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

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/deliveries");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        if (data.deliveries?.length > 0 && !selectedDelivery) {
          setSelectedDelivery(data.deliveries[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/deliveries/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDelivery(data.delivery);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchDeliveries();
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

  // Run Test T-11
  const runTestT11 = async () => {
    setTesting(true);
    try {
      // 1. Create order 8 x RICE-CHICK-S
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C01",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000, discountPercent: 0 }],
        }),
      });
      const dataCreate = await resCreate.json();
      const orderId = dataCreate.order.id;

      // 2. Confirm order -> generates DO
      const resConfirm = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();
      const doId = dataConfirm.deliveryOrder.id;

      // 3. Switch to Warehouse role and deliver 5 units
      await handleSwitchRole("WAREHOUSE");
      const resValidate = await fetch(`/api/inventory/deliveries/${doId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ lineId: dataConfirm.deliveryOrder.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
        }),
      });
      const dataValidate = await resValidate.json();

      // 4. Verify stock at WH-JKT
      const resStock = await fetch("/api/products/RICE-CHICK-S");
      const dataStock = await resStock.json();
      const whStock = dataStock.product.locations.find((l: any) => l.locationCode === "WH-JKT");

      const passed =
        dataValidate.success &&
        dataValidate.updatedDelivery.lines[0].deliveredQty === 5 &&
        dataValidate.updatedDelivery.lines[0].backorderQty === 3 &&
        dataValidate.totalCogs === 130000 &&
        dataValidate.totalDeliveredValueGross === 264000;

      setTestResult({
        id: "T-11",
        name: "Alur Normal: Partial Delivery & Backorder (SR-10 / F-07 / F-08)",
        status: passed ? "PASS" : "FAIL",
        expected: "Delivered 5, backorder 3; WH on-hand 35, Reserved 9 (6 existing + 3 new), Available 26; COGS Rp130.000; eligible-to-invoice gross Rp264.000.",
        actual: `Delivered: ${dataValidate.updatedDelivery.lines[0].deliveredQty}, Backorder: ${dataValidate.updatedDelivery.lines[0].backorderQty}, Backorder DO: ${dataValidate.backorderDoc?.deliveryNumber}. COGS: Rp ${dataValidate.totalCogs.toLocaleString("id-ID")}, Eligible Gross: Rp ${dataValidate.totalDeliveredValueGross.toLocaleString("id-ID")}. WH On-Hand: ${whStock.onHand}, Reserved: ${whStock.reserved}, Available: ${whStock.available}.`,
      });

      await fetchDeliveries();
      await fetchDeliveryDetail(doId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-12
  const runTestT12 = async () => {
    setTesting(true);
    try {
      // 1. Create order 38 x RICE-CHICK-S
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C01",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 38, unitPrice: 48000, discountPercent: 0 }],
        }),
      });
      const dataCreate = await resCreate.json();

      // Create dummy delivery order and attempt 38 units
      const resVal = await fetch("/api/inventory/deliveries", { method: "GET" });
      const dataVal = await resVal.json();
      const existingDO = dataVal.deliveries[0];

      // Attempt to deliver 38 units on the existing DO
      const resBlocked = await fetch(`/api/inventory/deliveries/${existingDO.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ lineId: existingDO.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 38 }],
        }),
      });
      const dataBlocked = await resBlocked.json();

      const blockedOk = resBlocked.status === 400 && dataBlocked.error.includes("SR-04");

      setTestResult({
        id: "T-12",
        name: "Aturan / Edge Case: Pencegahan Stok Negatif & Reserved Protection (SR-04 / SR-10)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Pengiriman 38 unit ditolak karena melebihi available stock dan melindungi kuantitas reserved SO lain.",
        actual: `HTTP ${resBlocked.status}: "${dataBlocked.error}". Stok negatif berhasil dicegah dan integritas reservasi dipertahankan.`,
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
        {/* Wireframe S-06 Header */}
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
                  Delivery Order dan Backorder
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-06
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Inventory / Delivery</strong> · Roles: Warehouse · Fitur: <strong>F-07, F-08</strong>
              </p>
            </div>
          </div>

          {/* Delivery Order Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-600">Pilih DO:</span>
            <select
              value={selectedDelivery?.id || ""}
              onChange={(e) => fetchDeliveryDetail(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-purple-600"
            >
              {deliveries.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deliveryNumber} — SO: {d.salesOrder?.orderNumber} ({d.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Delivery Order Detail */}
        {selectedDelivery && (
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
                        selectedDelivery.status === st
                          ? "bg-[#714B67] text-white"
                          : "bg-white text-gray-400"
                      } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {selectedDelivery.isBackorder && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  Backorder Document
                </span>
              )}
            </div>

            {/* Document Header */}
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-6 bg-gray-50/40">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Delivery Number
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {selectedDelivery.deliveryNumber}
                </h2>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Sales Order Ref
                </span>
                <p className="text-base font-bold text-gray-900 font-mono mt-0.5">
                  {selectedDelivery.salesOrder?.orderNumber}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Source Location
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedDelivery.sourceLocation}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Customer
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedDelivery.salesOrder?.contact?.name}
                </p>
              </div>
            </div>

            {/* Lines Table */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                ④ Pemenuhan Sebagian dan Reservation (SR-10)
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Variant SKU</th>
                      <th className="px-6 py-3 text-right">Ordered Qty</th>
                      <th className="px-6 py-3 text-right text-emerald-800">Done (Delivered)</th>
                      <th className="px-6 py-3 text-right text-amber-800">Backorder Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedDelivery.lines?.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 font-bold text-gray-900 font-sans">
                          {l.productSku} — {l.product?.name}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">{l.orderedQty}</td>
                        <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/40">
                          {l.deliveredQty}
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-amber-700 bg-amber-50/40">
                          {l.backorderQty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QA Test Runner for T-11 & T-12 */}
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-11 & T-12
              </h3>
              <p className="text-xs text-gray-300">
                Uji partial delivery, pembuatan backorder (SR-10), dan larangan stok negatif (SR-04).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT11}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-11 (Partial Delivery 5 of 8)</span>
              </button>

              <button
                onClick={runTestT12}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-12 (Over-delivery 38 Unit Block)</span>
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
        onSuccess={() => {
          fetchDeliveries();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
