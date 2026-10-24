"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import CreateProductModal from "@/components/CreateProductModal";
import { Package, Play, Layers, Building, RefreshCw, MapPin, Tag, Plus } from "lucide-react";
import Link from "next/link";

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("RICE-CHICK-S");
  const [productDetail, setProductDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetail = async (sku: string) => {
    try {
      const res = await fetch(`/api/products/${sku}`);
      if (res.ok) {
        const data = await res.json();
        setProductDetail(data.product);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      fetchProductDetail(selectedSku);
    }
  }, [selectedSku]);

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

  // Run Test T-05
  const runTestT05 = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/products/RICE-CHICK-S");
      const data = await res.json();
      const p = data.product;

      const wh = p.locations.find((l: any) => l.locationCode === "WH-JKT");
      const cafe = p.locations.find((l: any) => l.locationCode === "CAFE-JKT");

      const passed =
        p.salesPrice === 48000 &&
        p.standardCost === 26000 &&
        wh.onHand === 40 &&
        cafe.onHand === 12 &&
        p.companyOnHand === 52 &&
        wh.reserved === 6 &&
        wh.available === 34;

      setSelectedSku("RICE-CHICK-S");
      setTestResult({
        id: "T-05",
        name: "Alur Normal: Produk RICE-CHICK-S pada Seed Awal (Fitur F-03)",
        status: passed ? "PASS" : "FAIL",
        expected: "Price Rp48.000, cost Rp26.000, WH-JKT 40, CAFE-JKT 12, total 52, reserved WH 6, available WH 34.",
        actual: `Price: Rp ${p.salesPrice.toLocaleString("id-ID")}, Cost: Rp ${p.standardCost.toLocaleString("id-ID")}, WH On-Hand: ${wh.onHand}, CAFE On-Hand: ${cafe.onHand}, Total: ${p.companyOnHand}, Reserved WH: ${wh.reserved}, Available WH: ${wh.available}.`,
      });
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-06
  const runTestT06 = async () => {
    setTesting(true);
    try {
      const resHotInit = await fetch("/api/products/COF-LATT-HOT");
      const dataHotInit = await resHotInit.json();
      const resIceInit = await fetch("/api/products/COF-LATT-ICE");
      const dataIceInit = await resIceInit.json();

      const hotInitialWh = dataHotInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceInitialWh = dataIceInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      await fetch("/api/products/COF-LATT-HOT/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "WH-JKT", newOnHand: hotInitialWh + 4 }),
      });

      const resHotAfter = await fetch("/api/products/COF-LATT-HOT");
      const dataHotAfter = await resHotAfter.json();
      const resIceAfter = await fetch("/api/products/COF-LATT-ICE");
      const dataIceAfter = await resIceAfter.json();

      const hotAfterWh = dataHotAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceAfterWh = dataIceAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const passed = hotAfterWh === hotInitialWh + 4 && iceAfterWh === iceInitialWh;

      await fetch("/api/products/COF-LATT-HOT/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "WH-JKT", newOnHand: hotInitialWh }),
      });

      setTestResult({
        id: "T-06",
        name: "Aturan / Edge Case: Pemisahan Variant SKU COF-LATT-HOT vs ICE (SR-17 / F-03)",
        status: passed ? "PASS" : "FAIL",
        expected: "Stok varian Hot diperbarui, sedangkan varian Ice terbukti independen dan tidak berubah.",
        actual: `Hot WH berubah (${hotInitialWh} -> ${hotAfterWh}). Iced WH tetap identik di ${iceAfterWh} unit (tidak terpengaruh).`,
      });
      fetchProducts();
      fetchProductDetail(selectedSku);
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "15 SKU Master Produk" }]}
      title="Master Produk & Variant SKU"
      subtitle="Katalog 15 SKU Makanan & Minuman, Standar Biaya, dan Stok Multi-Lokasi WH-JKT & CAFE-JKT (F-03, SR-17)"
      wireframe="Wireframe S-05"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-lg shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Produk Baru</span>
          </button>
          <span className="text-xs font-semibold text-[#758078] hidden sm:inline">Pilih Varian SKU:</span>
          <select
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="text-xs font-mono font-bold bg-white border border-[#E5E9E4] text-[#202824] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#174A3A]"
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} — {p.name} ({p.size})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Product Form View */}
      {productDetail && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F7F8F5]/60">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  Variant SKU (SR-17)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E1EDE6] text-[#174A3A]">
                  Independent Stock
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-1">
                {productDetail.sku}
              </h2>

              <div className="mt-3">
                <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                  Nama Produk
                </span>
                <p className="text-base font-bold text-[#202824] mt-0.5">
                  {productDetail.name}
                </p>
                <p className="text-xs text-[#758078] mt-0.5">
                  Ukuran/Varian: <strong className="text-[#202824]">{productDetail.size}</strong> · Varian Rasa/Suhu: <strong className="text-[#202824]">{productDetail.color}</strong> · Satuan: {productDetail.unit}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E5E9E4]">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-[#174A3A]" />
                  <span className="text-xs font-semibold text-[#202824]">Harga Jual (Sales Price):</span>
                </div>
                <span className="text-sm font-bold text-[#202824] font-mono">
                  Rp {productDetail.salesPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E5E9E4]">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#174A3A]" />
                  <span className="text-xs font-semibold text-[#202824]">Biaya Standar (Standard Cost):</span>
                </div>
                <span className="text-sm font-bold text-[#174A3A] font-mono">
                  Rp {productDetail.standardCost.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Produk, Nilai dan Stok Lokasi */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#174A3A]" />
                <span>Distribusi Stok Antar Lokasi (WH-JKT vs CAFE-JKT)</span>
              </h3>
              <span className="text-xs text-[#758078] font-mono">
                Total Perusahaan: <strong className="text-[#174A3A]">{productDetail.companyOnHand} unit</strong> (Rp {productDetail.totalValuation.toLocaleString("id-ID")})
              </span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] font-semibold text-[#758078] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th className="px-6 py-3.5">Lokasi Gudang / Gerai</th>
                    <th className="px-6 py-3.5 text-right">Stok Fisik (On Hand)</th>
                    <th className="px-6 py-3.5 text-right">Stok Direservasi (SR-04)</th>
                    <th className="px-6 py-3.5 text-right text-emerald-800">Tersedia (Available)</th>
                    <th className="px-6 py-3.5 text-right">Valuasi Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {productDetail.locations.map((loc: any) => (
                    <tr key={loc.locationCode} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#202824] font-sans flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-[#174A3A]" />
                        <span>{loc.locationCode} — {loc.locationName}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#202824]">{loc.onHand}</td>
                      <td className="px-6 py-3.5 text-right text-amber-700 font-bold">{loc.reserved}</td>
                      <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                        {loc.available}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[#525B55]">
                        Rp {loc.valuation.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QA Test Runner for T-05 & T-06 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-05 & T-06 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Baseline SKU & Independensi Varian Produk (SR-17)
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji data baseline RICE-CHICK-S dan independensi stok varian COF-LATT-HOT vs ICE tanpa interferensi silang.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT05}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-05 (Normal RICE-CHICK-S)</span>
            </button>

            <button
              onClick={runTestT06}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#C6A15B] hover:bg-[#A88544] text-[#103429] font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-06 (Hot vs Ice Variant Edge Case)</span>
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

      {/* Modal Tambah Produk Baru */}
      <CreateProductModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProductCreated={() => {
          fetchProducts();
        }}
      />
    </AppLayout>
  );
}