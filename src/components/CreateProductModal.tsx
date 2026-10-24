"use client";

import React, { useState } from "react";
import { Package, X, Check, Layers, Building, Plus } from "lucide-react";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export default function CreateProductModal({
  isOpen,
  onClose,
  onProductCreated,
}: CreateProductModalProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState("Regular");
  const [color, setColor] = useState("Original");
  const [unit, setUnit] = useState("porsi");
  const [salesPrice, setSalesPrice] = useState<number | "">("");
  const [standardCost, setStandardCost] = useState<number | "">("");
  const [initialWhStock, setInitialWhStock] = useState<number>(10);
  const [initialCafeStock, setInitialCafeStock] = useState<number>(5);
  const [defaultVendorId, setDefaultVendorId] = useState("V01");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          size,
          color,
          unit,
          salesPrice: Number(salesPrice),
          standardCost: Number(standardCost),
          initialWhStock: Number(initialWhStock),
          initialCafeStock: Number(initialCafeStock),
          defaultVendorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat produk.");
        return;
      }

      setSuccessMsg(`Produk ${sku} (${name}) berhasil ditambahkan!`);
      setTimeout(() => {
        onProductCreated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E5E9E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#174A3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6A15B] text-[#174A3A] flex items-center justify-center font-bold shadow-xs">
              <Package className="w-5 h-5 text-[#174A3A]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">Tambah Produk / Barang Baru</h2>
              <p className="text-xs text-[#DCE8DF]">
                Master Produk Rasa Aruna Kitchen (Odoo 17 Catalog)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#DCE8DF] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">
                Kode SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: BEV-MATCHA-R"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono px-3 py-2 border border-[#CBD5E1] rounded-lg uppercase focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#758078]">Huruf kapital & unik (misal: RICE-xxx, BEV-xxx)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Matcha Latte"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">Ukuran / Varian</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Regular, Small, Large"
                className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">Varian Rasa / Tipe</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Original, Hot, Iced"
                className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">Satuan (UoM)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="porsi, cup, box"
                className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">
                Harga Jual Konsumen (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="Contoh: 28000"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs font-mono px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#758078]">Dikenakan PBJT 10% di kasir / invoice</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202824] mb-1">
                Biaya Pokok / HPP Standar (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="Contoh: 15000"
                value={standardCost}
                onChange={(e) => setStandardCost(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs font-mono px-3 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#758078]">Untuk valuasi kartu stok & COGS</span>
            </div>
          </div>

          <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E4] space-y-2">
            <span className="text-xs font-bold text-[#202824]">Stok Awal Alokasi Gudang & Gerai:</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#758078] mb-0.5">
                  WH-JKT (Gudang Utama)
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialWhStock}
                  onChange={(e) => setInitialWhStock(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#758078] mb-0.5">
                  CAFE-JKT (Gerai Kasir)
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialCafeStock}
                  onChange={(e) => setInitialCafeStock(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202824] mb-1">
              Vendor Utama Pengadaan
            </label>
            <select
              value={defaultVendorId}
              onChange={(e) => setDefaultVendorId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg bg-white focus:ring-2 focus:ring-[#174A3A] focus:outline-hidden"
            >
              <option value="V01">V01 - PT Segar Pangan Nusantara</option>
              <option value="V02">V02 - CV Beras Makmur</option>
              <option value="V03">V03 - PT Unggas Jaya Abadi</option>
              <option value="V04">V04 - CV Bumbu Alami</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#758078] hover:text-[#202824] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-lg shadow-xs transition-all flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Simpan Produk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
