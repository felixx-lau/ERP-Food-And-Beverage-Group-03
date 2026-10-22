"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { 
  ArrowLeft, 
  CheckCircle, 
  Lock, 
  Play, 
  ShieldCheck, 
  FileText, 
  CreditCard,
  Plus
} from "lucide-react";
import Link from "next/link";

export default function SalesOrdersPage() {
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
      const res = await fetch("/api/sales/orders");
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
      const res = await fetch(`/api/sales/orders/${id}`);
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

  // Run Test T-09
  const runTestT09 = async () => {
    setTesting(true);
    try {
      // 1. Create quotation for C01: 4 x RICE-CHICK-S and 2 x RICE-CHICK-L
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C01",
          lines: [
            { productSku: "RICE-CHICK-S", quantity: 4, unitPrice: 48000, discountPercent: 0 },
            { productSku: "RICE-CHICK-L", quantity: 2, unitPrice: 62000, discountPercent: 0 },
          ],
        }),
      });
      const dataCreate = await resCreate.json();
      const orderId = dataCreate.order.id;

      // 2. Confirm order
      const resConfirm = await fetch(`/api/sales/orders/${orderId}/confirm`, {
        method: "POST",
      });
      const dataConfirm = await resConfirm.json();

      // 3. Check C01 exposure & headroom
      const resC01 = await fetch("/api/contacts/C01");
      const dataC01 = await resC01.json();

      const calcOk =
        dataCreate.order.subtotalNet === 316000 &&
        dataCreate.order.pbjtTax === 31600 &&
        dataCreate.order.totalGross === 347600 &&
        dataCreate.order.projectedCost === 172000;

      const creditOk =
        dataC01.creditStatus.creditExposure === 1547600 &&
        dataC01.creditStatus.creditHeadroom === 1452400;

      setTestResult({
        id: "T-09",
        name: "Alur Normal: Quotation ke Sales Order C01 (Fitur F-05 / F-06 / F-10)",
        status: calcOk && creditOk && resConfirm.ok ? "PASS" : "FAIL",
        expected: "Net Rp316.000, PBJT Rp31.600, gross Rp347.600; projected standard cost Rp172.000; exposure C01 Rp1.547.600 dan headroom Rp1.452.400.",
        actual: `Net: Rp ${dataCreate.order.subtotalNet.toLocaleString("id-ID")}, PBJT: Rp ${dataCreate.order.pbjtTax.toLocaleString("id-ID")}, Gross: Rp ${dataCreate.order.totalGross.toLocaleString("id-ID")}, Cost: Rp ${dataCreate.order.projectedCost.toLocaleString("id-ID")}. Exposure C01: Rp ${dataC01.creditStatus.creditExposure.toLocaleString("id-ID")}, Headroom: Rp ${dataC01.creditStatus.creditHeadroom.toLocaleString("id-ID")}.`,
      });

      await fetchOrders();
      await fetchOrderDetail(orderId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-10
  const runTestT10 = async () => {
    setTesting(true);
    try {
      // 1. Switch to Sales (Dini)
      await handleSwitchRole("SALES");

      // 2. Create quotation with 20% discount (2 x RICE-CHICK-S)
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C01",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 2, unitPrice: 48000, discountPercent: 20 }],
        }),
      });
      const dataCreate = await resCreate.json();
      const orderId = dataCreate.order.id;

      // 3. Dini tries to confirm without Owner approval -> Expect block!
      const resConfirmBlocked = await fetch(`/api/sales/orders/${orderId}/confirm`, {
        method: "POST",
      });
      const dataBlocked = await resConfirmBlocked.json();
      const blockedOk = resConfirmBlocked.status === 400 && dataBlocked.error.includes("Persetujuan Diperlukan");

      // 4. Switch to Owner (Maya) and approve discount
      await handleSwitchRole("OWNER");
      await fetch(`/api/sales/orders/${orderId}/approve-discount`, { method: "POST" });

      // 5. Confirm order as Owner
      const resConfirmOk = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      const dataConfirmOk = await resConfirmOk.json();

      // 6. Try editing price on Confirmed SO -> Expect block!
      const resEditBlocked = await fetch(`/api/sales/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: dataConfirmOk.confirmedOrder.lines[0].id,
          unitPrice: 55000,
        }),
      });
      const dataEditBlocked = await resEditBlocked.json();
      const priceLockOk = resEditBlocked.status === 400 && dataEditBlocked.error.includes("dikunci");

      setTestResult({
        id: "T-10",
        name: "Aturan / Edge Case: Diskon 20% & Price Lock (SR-07 / SR-08 / F-06)",
        status: blockedOk && resConfirmOk.ok && priceLockOk ? "PASS" : "FAIL",
        expected: "Diskon 20% butuh persetujuan Owner. Setelah Confirmed, harga dan diskon dikunci (price lock).",
        actual: `Penolakan approval: "${dataBlocked.error}". Setelah disetujui Owner, SO Confirmed. Percobaan ubah harga: HTTP ${resEditBlocked.status} "${dataEditBlocked.error}".`,
      });

      await fetchOrders();
      await fetchOrderDetail(orderId);
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
        {/* Wireframe S-05 Header */}
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
                  Quotation dan Sales Order Form
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-05
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Sales</strong> · Roles: Sales, Owner · Fitur: <strong>F-05, F-06, F-10</strong>
              </p>
            </div>
          </div>

          {/* Order Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-600">Pilih Dokumen:</span>
            <select
              value={selectedOrder?.id || ""}
              onChange={(e) => fetchOrderDetail(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-purple-600"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.contact?.name} ({o.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Order Form View */}
        {selectedOrder && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            {/* Status Bar / Ribbon */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
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

              {selectedOrder.isPriceLocked && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Price Locked (SR-08)</span>
                </span>
              )}
            </div>

            {/* Document Header Fields */}
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50/40">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Document Number
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Pricing: <strong>{selectedOrder.pricingOption}</strong>
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Pelanggan
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {selectedOrder.contact?.name}
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  ID: {selectedOrder.contactId} · Terms: {selectedOrder.paymentTerms}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Diskon & Otoritas
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  Maks Diskon: {selectedOrder.discountPercent}%
                </p>
                <span className={`text-[11px] font-semibold ${selectedOrder.discountApproved ? "text-emerald-700" : "text-amber-700"}`}>
                  {selectedOrder.discountApproved ? "✓ Disetujui" : "⏳ Perlu Persetujuan Owner"}
                </span>
              </div>
            </div>

            {/* Lines Table */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                ④ Penawaran dan Konfirmasi Order
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Variant SKU</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-right">Diskon %</th>
                      <th className="px-6 py-3 text-right">Net</th>
                      <th className="px-6 py-3 text-right">PBJT (10%)</th>
                      <th className="px-6 py-3 text-right">Total Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedOrder.lines?.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 font-bold text-gray-900 font-sans">
                          {l.productSku} — {l.product?.name}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">{l.quantity}</td>
                        <td className="px-6 py-3.5 text-right">Rp {l.unitPrice.toLocaleString("id-ID")}</td>
                        <td className="px-6 py-3.5 text-right">{l.discountPercent}%</td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          Rp {l.netPrice.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-3.5 text-right text-purple-700 font-bold">
                          Rp {l.pbjtAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-gray-950">
                          Rp {l.totalAmount.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-mono text-xs border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-right font-sans font-bold text-gray-700">
                        Subtotal Net & PBJT Total:
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900">
                        Rp {selectedOrder.subtotalNet?.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-purple-700">
                        Rp {selectedOrder.pbjtTax?.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3 text-right font-black text-base text-[#714B67]">
                        Rp {selectedOrder.totalGross?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QA Test Runner for T-09 & T-10 */}
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-09 & T-10
              </h3>
              <p className="text-xs text-gray-300">
                Uji kalkulasi Quotation, credit exposure, approval diskon 20%, dan price lock.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT09}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-09 (Normal C01 Order)</span>
              </button>

              <button
                onClick={runTestT10}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-10 (Diskon 20% & Price Lock)</span>
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
          fetchOrders();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
