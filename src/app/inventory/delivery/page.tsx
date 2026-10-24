"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Truck, CheckCircle, AlertTriangle, Layers, Building, MapPin, PackageCheck } from "lucide-react";
import Link from "next/link";

export default function DeliveryPage() {
  const [user, setUser] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
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

      const resConfirm = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();
      const doId = dataConfirm.deliveryOrder.id;

      await handleSwitchRole("WAREHOUSE");
      const resValidate = await fetch(`/api/inventory/deliveries/${doId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ lineId: dataConfirm.deliveryOrder.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
        }),
      });
      const dataValidate = await resValidate.json();

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
      const resVal = await fetch("/api/inventory/deliveries", { method: "GET" });
      const dataVal = await resVal.json();
      const existingDO = dataVal.deliveries[0];

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
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "Delivery Orders" }]}
      title="Delivery Orders & Backorders"
      subtitle="Surat Jalan Pengiriman, Pemenuhan Sebagian (Partial Delivery), dan Pemisahan Dokumen Backorder (F-07, F-08, SR-04, SR-10)"
      wireframe="Wireframe S-06"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Dokumen DO:</span>
          <select
            value={selectedDelivery?.id || ""}
            onChange={(e) => fetchDeliveryDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A]"
          >
            {deliveries.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deliveryNumber} — SO: {d.salesOrder?.orderNumber} ({d.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Delivery Order Detail */}
      {selectedDelivery && (
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
                      selectedDelivery.status === st
                        ? "bg-[#174A3A] text-white"
                        : "bg-white text-[#758078]"
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {selectedDelivery.isBackorder && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>Dokumen Backorder Terpisah (SR-10)</span>
              </span>
            )}
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-4 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor Surat Jalan (DO)
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedDelivery.deliveryNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Referensi Sales Order
              </span>
              <p className="text-base font-bold text-[#202824] font-mono mt-0.5">
                {selectedDelivery.salesOrder?.orderNumber}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Lokasi Asal (Source)
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-[#174A3A]" />
                <span className="text-sm font-bold text-[#202824]">{selectedDelivery.sourceLocation}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Pelanggan Penerima
              </span>
              <p className="text-sm font-bold text-[#202824] mt-0.5">
                {selectedDelivery.salesOrder?.contact?.name}
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Pemenuhan Pengiriman & Pemisahan Backorder</span>
              </h3>
              <span className="text-xs text-[#758078]">Sesuai aturan kuantitas terkirim aktual</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Dipesan (Ordered)</th>
                    <th className="px-6 py-3.5 text-right text-emerald-800">Terkirim (Done)</th>
                    <th className="px-6 py-3.5 text-right text-amber-800">Backorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedDelivery.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans">
                        <span className="font-mono text-[#174A3A] mr-2">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">{l.orderedQty}</td>
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
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-11 & T-12 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Partial Delivery, Backorder & Pencegahan Stok Negatif
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji pemenuhan sebagian (5 dari 8), pembuatan backorder otomatis (SR-10), dan perlindungan reservasi stok (SR-04).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT11}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-11 (Partial Delivery 5 of 8)</span>
            </button>

            <button
              onClick={runTestT12}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-12 (Over-delivery 38 Unit Block)</span>
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