"use client";

import React, { useState } from "react";
import { AlertTriangle, RotateCcw, X, CheckCircle, ShieldAlert } from "lucide-react";

interface ResetSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  userRole?: string;
  onSuccess: () => void;
}

export default function ResetSeedModal({
  isOpen,
  onClose,
  currentUserRole,
  userRole,
  onSuccess,
}: ResetSeedModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const role = currentUserRole || userRole;
  const isOwner = role === "OWNER";

  const handleConfirmReset = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/seed/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmReset: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mereset seed database.");
        return;
      }

      setSuccessMsg(data.message || "Baseline Seed berhasil dipulihkan.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#E5E9E4]">
        {/* Modal Header */}
        <div className="bg-rose-50/80 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <h3 className="font-bold text-base">Konfirmasi Reset Baseline Seed</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#758078] hover:text-[#202824] hover:bg-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {!isOwner && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Peringatan Akses Otoritas (SR-15):</span>
                <p className="mt-0.5">
                  Role aktif Anda adalah <strong>{currentUserRole}</strong>. Hanya role <strong>OWNER (Maya Prasetyo)</strong> yang diizinkan mereset database. Percobaan reset dari akun ini akan ditolak dan dicatat di Audit Log.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-[#202824] leading-relaxed">
            Tindakan ini akan mengembalikan seluruh database ke kondisi <strong>Baseline Seed awal</strong> sesuai spesifikasi tugas PDF:
          </p>

          <div className="bg-[#F7F8F5] border border-[#E5E9E4] rounded-xl p-3.5 text-xs space-y-1.5 font-mono text-[#202824]">
            <div className="flex justify-between">
              <span className="text-[#758078]">• Total Persediaan:</span>
              <span className="font-bold text-[#174A3A]">616 Unit (WH: 410, CAFE: 206)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#758078]">• Valuasi Persediaan:</span>
              <span className="font-bold text-[#174A3A]">Rp 12.214.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#758078]">• Saldo Bank Awal:</span>
              <span className="font-bold">Rp 20.000.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#758078]">• Jurnal Pembuka Seimbang:</span>
              <span className="font-bold text-emerald-700">Dr = Cr = Rp 33.714.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#758078]">• Dokumen Bawaan:</span>
              <span className="font-bold">LD0003, S00006 (Res 6), P00006</span>
            </div>
          </div>

          <p className="text-xs text-rose-600 font-medium">
            ⚠️ Seluruh transaksi uji coba yang telah dibuat akan dihapus dan tidak dapat dikembalikan.
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bg-[#F7F8F5] px-6 py-4 border-t border-[#E5E9E4] flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-[#525B55] bg-white border border-[#D5D8D3] rounded-lg hover:bg-[#F7F8F5] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmReset}
            disabled={loading || !isOwner}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg flex items-center space-x-1.5 shadow-xs transition-all ${
              isOwner
                ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Memproses Reset..." : "Konfirmasi Reset Database"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
