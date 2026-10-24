"use client";

import React, { useState, useEffect } from "react";
import { Users2, UserPlus, X, Check, Shield, Building2, Sparkles, RefreshCw } from "lucide-react";

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserChanged?: () => void;
}

const AVAILABLE_ROLES = [
  { role: "OWNER", label: "Owner (Pemilik - Full Access)", color: "bg-purple-100 text-purple-800" },
  { role: "SALES", label: "Sales (Penjualan & CRM)", color: "bg-blue-100 text-blue-800" },
  { role: "WAREHOUSE", label: "Warehouse (Gudang & Stok)", color: "bg-amber-100 text-amber-800" },
  { role: "PROCUREMENT", label: "Procurement (Pengadaan PO)", color: "bg-orange-100 text-orange-800" },
  { role: "FINANCE", label: "Finance (Keuangan & Akuntansi)", color: "bg-emerald-100 text-emerald-800" },
  { role: "CASHIER", label: "Cashier (Kasir POS Gerai)", color: "bg-cyan-100 text-cyan-800" },
];

export default function ManageTeamModal({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}: ManageTeamModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("OWNER");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menambahkan anggota.");
        return;
      }

      setSuccessMsg(`Anggota ${name} (${role}) berhasil ditambahkan!`);
      setName("");
      setEmail("");
      setPassword("password123");
      fetchUsers();
      if (onUserChanged) onUserChanged();
      setTimeout(() => setActiveTab("list"), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E5E9E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#174A3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6A15B] text-[#174A3A] flex items-center justify-center font-bold shadow-xs">
              <Users2 className="w-5 h-5 text-[#174A3A]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">Kelola Tim & Anggota Kelompok</h2>
              <p className="text-xs text-[#DCE8DF]">
                PT Rasa Aruna Bersama · Skenario ERP F&B Group 03
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

        {/* Subheader / Tabs */}
        <div className="px-6 pt-3 border-b border-[#E5E9E4] bg-[#F7F8F5] flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "list"
                  ? "border-[#174A3A] text-[#174A3A]"
                  : "border-transparent text-[#758078] hover:text-[#202824]"
              }`}
            >
              Daftar Anggota ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 transition-all ${
                activeTab === "create"
                  ? "border-[#174A3A] text-[#174A3A]"
                  : "border-transparent text-[#758078] hover:text-[#202824]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Anggota</span>
            </button>
          </div>
          <button
            onClick={fetchUsers}
            className="text-xs text-[#758078] hover:text-[#174A3A] flex items-center space-x-1 mb-2"
            title="Refresh data anggota"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "list" ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E4] text-xs text-[#758078] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#202824]">Perusahaan:</span> PT Rasa Aruna Bersama (Group 03)
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  6 Role Skenario PDF Aktif
                </div>
              </div>

              <div className="divide-y divide-[#E5E9E4] border border-[#E5E9E4] rounded-xl overflow-hidden">
                {users.map((u) => {
                  const roleObj = AVAILABLE_ROLES.find((r) => r.role === u.role);
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 flex items-center justify-between hover:bg-[#F7F8F5] transition-colors ${
                        isCurrent ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#174A3A] text-[#C6A15B] font-bold text-sm flex items-center justify-center shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-[#202824] truncate">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                                Anda Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#758078] truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${
                            roleObj?.color || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                Tambahkan nama rekan kelompok Anda ke dalam ERP. Anggota baru dapat langsung digunakan untuk login dan berganti peran melalui Role Switcher di pojok kanan atas.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202824] mb-1">
                  Nama Lengkap Anggota Kelompok <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Felix Lau"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202824] mb-1">
                    Email Akun <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: felix@rasaaruna.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202824] mb-1">
                    Password Default
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202824] mb-1">
                  Pilih Role / Tanggung Jawab (Sesuai PDF Matriks Wewenang) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#174A3A] bg-white font-medium"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 text-xs font-medium text-[#758078] hover:text-[#202824] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-lg shadow-xs transition-all flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Simpan Anggota Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F7F8F5] border-t border-[#E5E9E4] flex items-center justify-between text-[11px] text-[#758078]">
          <span>Perusahaan Default: PT Rasa Aruna Bersama</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-white border border-[#CBD5E1] text-[#202824] font-medium hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
