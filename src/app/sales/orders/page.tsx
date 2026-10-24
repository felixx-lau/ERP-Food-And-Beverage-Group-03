"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { 
  CheckCircle, 
  Lock, 
  Play, 
  ShieldCheck, 
  FileText, 
  CreditCard,
  Plus,
  ShoppingCart,
  Percent,
  Receipt
} from "lucide-react";
import Link from "next/link";

export default function SalesOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
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

      const resConfirm = await fetch(`/api/sales/orders/${orderId}/confirm`, {
        method: "POST",
      });

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
      await handleSwitchRole("SALES");

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

      const resConfirmBlocked = await fetch(`/api/sales/orders/${orderId}/confirm`, {
        method: "POST",
      });
      const dataBlocked = await resConfirmBlocked.json();
      const blockedOk = resConfirmBlocked.status === 400 && dataBlocked.error.includes("Persetujuan Diperlukan");

      await handleSwitchRole("OWNER");
      await fetch(`/api/sales/orders/${orderId}/approve-discount`, { method: "POST" });

      const resConfirmOk = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      const dataConfirmOk = await resConfirmOk.json();

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
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Penjualan & CRM" }, { label: "Sales Orders" }]}
      title="Sales Orders & Quotations"
      subtitle="Penerbitan Penawaran, Konfirmasi Pesanan, Otorisasi Diskon & Kunci Harga (F-05, F-06, F-10, SR-07, SR-08)"
      wireframe="Wireframe S-04"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Dokumen:</span>
          <select
            value={selectedOrder?.id || ""}
            onChange={(e) => fetchOrderDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A] focus:border-[#174A3A]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.contact?.name} ({o.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Order Form View */}
      {selectedOrder && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Bar / Ribbon */}
          <div className="bg-[#F7F8F5] px-6 py-3 border-b border-[#E5E9E4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-[#758078] uppercase tracking-wider">Tahapan Status:</span>
              <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-[#E5E9E4]">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => (
                  <span
                    key={st}
                    className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                      selectedOrder.status === st
                        ? "bg-[#174A3A] text-white"
                        : "bg-white text-[#758078]"
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {selectedOrder.isPriceLocked && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF5EB] text-[#A88544] border border-[#F4E7CE] flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Price Locked (SR-08)</span>
              </span>
            )}
          </div>

          {/* Document Header Fields */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor Dokumen
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedOrder.orderNumber}
              </h2>
              <p className="text-xs text-[#758078] mt-1">
                Pricing: <strong className="text-[#202824]">{selectedOrder.pricingOption}</strong>
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Pelanggan & Ketentuan
              </span>
              <h3 className="text-base font-bold text-[#202824] mt-0.5">
                {selectedOrder.contact?.name}
              </h3>
              <span className="text-xs text-[#758078] font-mono">
                ID: {selectedOrder.contactId} · Terms: {selectedOrder.paymentTerms}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Diskon & Otoritas (SR-07)
              </span>
              <p className="text-sm font-bold text-[#202824] mt-0.5">
                Maks Diskon: {selectedOrder.discountPercent}%
              </p>
              <span className={`text-[11px] font-semibold ${selectedOrder.discountApproved ? "text-emerald-700" : "text-amber-700"}`}>
                {selectedOrder.discountApproved ? "✓ Disetujui Owner" : "⏳ Perlu Persetujuan Owner (>10%)"}
              </span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Item Pesanan & Pajak PBJT 10%</span>
              </h3>
              <span className="text-xs text-[#758078]">Pajak Restoran PBJT 10% otomatis dihitung</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Kuantitas</th>
                    <th className="px-6 py-3.5 text-right">Harga Satuan</th>
                    <th className="px-6 py-3.5 text-right">Diskon %</th>
                    <th className="px-6 py-3.5 text-right">Net Subtotal</th>
                    <th className="px-6 py-3.5 text-right">PBJT (10%)</th>
                    <th className="px-6 py-3.5 text-right">Total Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedOrder.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans">
                        <span className="font-mono text-[#174A3A] mr-2">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">{l.quantity}</td>
                      <td className="px-6 py-3.5 text-right text-[#525B55]">Rp {l.unitPrice.toLocaleString("id-ID")}</td>
                      <td className="px-6 py-3.5 text-right text-[#525B55]">{l.discountPercent}%</td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">
                        Rp {l.netPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[#174A3A] font-bold">
                        Rp {l.pbjtAmount.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-[#202824]">
                        Rp {l.totalAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F7F8F5] font-mono text-xs border-t-2 border-[#E5E9E4]">
                  <tr>
                    <td colSpan={4} className="px-6 py-3.5 text-right font-sans font-bold text-[#758078]">
                      Total Net & PBJT 10%:
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-[#202824]">
                      Rp {selectedOrder.subtotalNet?.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-[#174A3A]">
                      Rp {selectedOrder.pbjtTax?.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-base text-[#174A3A]">
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
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-09 & T-10 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Quotation SO, PBJT 10%, Diskon 20% & Price Lock
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji alur pembuatan SO, perhitungan eksposur kredit, approval diskon Owner, dan penguncian harga.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT09}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-09 (Normal C01 Order)</span>
            </button>

            <button
              onClick={runTestT10}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-10 (Diskon 20% & Price Lock)</span>
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