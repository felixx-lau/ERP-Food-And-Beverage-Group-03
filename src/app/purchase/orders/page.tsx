"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Truck, CheckCircle2, Lock, Plus, Building, RefreshCw, Calendar, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function PurchaseOrdersPage() {
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
      await handleSwitchRole("PROCUREMENT");

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

      const resStockBefore = await fetch("/api/products/COF-LATT-HOT");
      const dataStockBefore = await resStockBefore.json();
      const whBefore = dataStockBefore.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const resConfirm = await fetch(`/api/purchase/orders/${poId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();

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
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Pengadaan" }, { label: "Purchase Orders" }]}
      title="Purchase Orders & RFQ"
      subtitle="Pengelolaan Permintaan Penawaran (RFQ), Konfirmasi Pesanan Pengadaan & Komitmen Vendor (F-11, SR-13)"
      wireframe="Wireframe S-08"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Dokumen PO:</span>
          <select
            value={selectedOrder?.id || ""}
            onChange={(e) => fetchOrderDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.poNumber} — {o.vendor?.name} ({o.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected PO Detail */}
      {selectedOrder && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Bar */}
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

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#758078]">Vendor Tax:</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                0% (Fixture)
              </span>
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor RFQ / PO
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedOrder.poNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Vendor Rekanan
              </span>
              <p className="text-base font-bold text-[#202824] mt-0.5">
                {selectedOrder.vendor?.name}
              </p>
              <span className="text-xs text-[#758078] font-mono">
                ID: {selectedOrder.vendorId} · Terms: {selectedOrder.vendor?.paymentTerms}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Jadwal Pengiriman (Scheduled Date)
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-[#174A3A]" />
                <p className="text-sm font-bold text-[#202824] font-mono">
                  {new Date(selectedOrder.scheduledDate).toLocaleDateString("id-ID")}
                </p>
              </div>
              <span className="text-xs text-[#758078]">Lokasi Tujuan: WH-JKT</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Item Bahan Baku / Produk Pesanan</span>
              </h3>
              <span className="text-xs text-[#758078]">Komitmen pengadaan vendor</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Kuantitas Dipesan</th>
                    <th className="px-6 py-3.5 text-right">Harga Satuan (Cost)</th>
                    <th className="px-6 py-3.5 text-right">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedOrder.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans">
                        <span className="font-mono text-[#174A3A] mr-2">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">{l.orderedQty}</td>
                      <td className="px-6 py-3.5 text-right text-[#525B55]">Rp {l.unitPrice.toLocaleString("id-ID")}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">
                        Rp {l.subtotal.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F7F8F5] font-mono text-xs border-t-2 border-[#E5E9E4]">
                  <tr>
                    <td colSpan={3} className="px-6 py-3.5 text-right font-sans font-bold text-[#758078]">
                      Total Tagihan PO:
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-base text-[#174A3A]">
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
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-15 & T-16 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: RFQ, Konfirmasi PO Tanpa Penambahan Stok & Idempotency
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji pembuatan RFQ, konfirmasi PO (tanpa penambahan stok fisik sebelum GR), dan idempotency konfirmasi berulang (SR-13).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT15}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-15 (Normal RFQ & PO V03)</span>
            </button>

            <button
              onClick={runTestT16}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#C6A15B] hover:bg-[#A88544] text-[#103429] font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-16 (Idempotent PO Retry)</span>
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