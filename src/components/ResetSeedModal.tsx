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
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <h3 className="font-bold text-base">Konfirmasi Reset Baseline Seed</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {!isOwner && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Peringatan Akses Otoritas (SR-15):</span>
                <p>
                  Role aktif Anda adalah <strong>{currentUserRole}</strong>. Hanya role <strong>OWNER (Maya Prasetyo)</strong> yang diizinkan mereset database. Percobaan reset dari akun ini akan ditolak dan dicatat di Audit Log.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-700 leading-relaxed">
            Tindakan ini akan mengembalikan seluruh database ke kondisi <strong>Baseline Seed awal</strong> sesuai spesifikasi tugas PDF:
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 font-mono text-gray-700">
            <div className="flex justify-between">
              <span>• Total Persediaan:</span>
              <span className="font-bold">616 Unit (WH: 410, CAFE: 206)</span>
            </div>
            <div className="flex justify-between">
              <span>• Valuasi Persediaan:</span>
              <span className="font-bold">Rp 12.214.000</span>
            </div>
            <div className="flex justify-between">
              <span>• Saldo Bank Awal:</span>
              <span className="font-bold">Rp 20.000.000</span>
            </div>
            <div className="flex justify-between">
              <span>• Jurnal Pembuka Seimbang:</span>
              <span className="font-bold text-emerald-700">Dr = Cr = Rp 33.714.000</span>
            </div>
            <div className="flex justify-between">
              <span>• Dokumen Bawaan:</span>
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
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmReset}
            disabled={loading || !isOwner}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg flex items-center space-x-1.5 shadow-sm transition-all ${
              isOwner
                ? "bg-rose-700 hover:bg-rose-800 active:scale-95"
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
