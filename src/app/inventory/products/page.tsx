"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { Package, ArrowLeft, Play, Layers, Building, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("RICE-CHICK-S");
  const [productDetail, setProductDetail] = useState<any>(null);
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
      // 1. Check Hot & Ice initially
      const resHotInit = await fetch("/api/products/COF-LATT-HOT");
      const dataHotInit = await resHotInit.json();
      const resIceInit = await fetch("/api/products/COF-LATT-ICE");
      const dataIceInit = await resIceInit.json();

      const hotInitialWh = dataHotInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceInitialWh = dataIceInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      // 2. Adjust Hot only: increment by 4
      await fetch("/api/products/COF-LATT-HOT/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "WH-JKT", newOnHand: hotInitialWh + 4 }),
      });

      // 3. Verify Hot changed and Ice is untouched
      const resHotAfter = await fetch("/api/products/COF-LATT-HOT");
      const dataHotAfter = await resHotAfter.json();
      const resIceAfter = await fetch("/api/products/COF-LATT-ICE");
      const dataIceAfter = await resIceAfter.json();

      const hotAfterWh = dataHotAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceAfterWh = dataIceAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const passed = hotAfterWh === hotInitialWh + 4 && iceAfterWh === iceInitialWh;

      // Restore Hot back
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
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <HeaderNavbar
        currentUser={user}
        onSwitchRole={handleSwitchRole}
        onOpenResetModal={() => setResetModalOpen(true)}
        onOpenAuditDrawer={() => setAuditDrawerOpen(true)}
        onOpenAppSwitcher={() => setAppSwitcherOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Wireframe S-03 Header */}
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
                  Product dan Variant SKU
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-03
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Inventory / Products</strong> · Roles: Warehouse, Sales · Fitur: <strong>F-03</strong>
              </p>
            </div>
          </div>

          {/* Quick SKU Dropdown / Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-600">Pilih SKU:</span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-purple-600"
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.name} ({p.size})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Product Form View (Wireframe S-03 Section 3 & 4) */}
        {productDetail && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Variant SKU (SR-17)
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {productDetail.sku}
                </h2>

                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Nama Produk
                  </span>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {productDetail.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ukuran/Varian: <strong>{productDetail.size}</strong> · Warna/Rasa: {productDetail.color} · Satuan: {productDetail.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">Sales Price:</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">
                    Rp {productDetail.salesPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">Standard Cost:</span>
                  <span className="text-sm font-bold text-indigo-700 font-mono">
                    Rp {productDetail.standardCost.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Wireframe S-03 Section 4: Produk, Nilai dan Stok Lokasi */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  ④ Produk, Nilai dan Stok Lokasi (Pemisahan WH-JKT vs CAFE-JKT)
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  Company Total: <strong>{productDetail.companyOnHand} unit</strong> (Rp {productDetail.totalValuation.toLocaleString("id-ID")})
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Location</th>
                      <th className="px-6 py-3 text-right">On Hand</th>
                      <th className="px-6 py-3 text-right">Reserved (SR-04)</th>
                      <th className="px-6 py-3 text-right text-emerald-800">Available</th>
                      <th className="px-6 py-3 text-right">Valuasi Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productDetail.locations.map((loc: any) => (
                      <tr key={loc.locationCode} className="hover:bg-gray-50 font-mono">
                        <td className="px-6 py-3.5 font-bold text-gray-900 font-sans flex items-center space-x-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{loc.locationCode} ({loc.locationName})</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">{loc.onHand}</td>
                        <td className="px-6 py-3.5 text-right text-amber-700 font-bold">{loc.reserved}</td>
                        <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                          {loc.available}
                        </td>
                        <td className="px-6 py-3.5 text-right text-gray-600">
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
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-05 & T-06
              </h3>
              <p className="text-xs text-gray-300">
                Uji baseline SKU RICE-CHICK-S dan independensi varian COF-LATT-HOT vs ICE (SR-17).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT05}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-05 (Normal RICE-CHICK-S)</span>
              </button>

              <button
                onClick={runTestT06}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-06 (Hot vs Ice Variant Edge Case)</span>
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
          fetchProducts();
          fetchProductDetail(selectedSku);
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
