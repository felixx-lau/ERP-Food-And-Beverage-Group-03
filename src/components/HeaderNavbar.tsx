"use client";

import React, { useState } from "react";
import { 
  LayoutGrid, 
  Building2, 
  UserCircle, 
  RotateCcw, 
  ShieldAlert, 
  ChevronDown, 
  Check, 
  LogOut,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";

interface HeaderNavbarProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSwitchRole: (role: string) => Promise<void>;
  onOpenResetModal: () => void;
  onOpenAuditDrawer: () => void;
  onOpenAppSwitcher: () => void;
}

const ROLES_LIST = [
  { role: "OWNER", name: "Maya Prasetyo", title: "Pemilik Perusahaan (Full Access)" },
  { role: "SALES", name: "Dini Anggraini", title: "Manajer Penjualan (Sales & CRM)" },
  { role: "WAREHOUSE", name: "Sinta Maharani", title: "Kepala Gudang (Inventory & Delivery)" },
  { role: "PROCUREMENT", name: "Arief Wicaksono", title: "Manajer Pengadaan (Purchase & RFQ)" },
  { role: "FINANCE", name: "Reza Firdaus", title: "Kepala Keuangan (Accounting, Ledger & Bill)" },
  { role: "CASHIER", name: "Bagas Putra", title: "Kepala Gerai / Kasir (Point of Sale)" },
];

export default function HeaderNavbar({
  currentUser,
  onSwitchRole,
  onOpenResetModal,
  onOpenAuditDrawer,
  onOpenAppSwitcher,
}: HeaderNavbarProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSelectRole = async (targetRole: string) => {
    setSwitching(true);
    try {
      await onSwitchRole(targetRole);
    } finally {
      setSwitching(false);
      setRoleMenuOpen(false);
    }
  };

  return (
    <header className="bg-[#714B67] text-white select-none sticky top-0 z-40 shadow-sm border-b border-[#5a3a52]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        {/* Left: Apps Launcher & Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAppSwitcher}
            title="App Switcher (▦ Apps)"
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#875A7B] active:bg-[#5a3a52] transition-colors"
          >
            <LayoutGrid className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center space-x-2 text-sm font-semibold tracking-wide">
            <span className="text-purple-200">PT Rasa Aruna Bersama</span>
            <span className="text-purple-300">/</span>
            <span className="text-white font-bold">Core / Home</span>
          </div>

          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#5a3a52] text-purple-200 border border-purple-400/20">
            WH-JKT (Default Location)
          </span>
        </div>

        {/* Right: Actions, Role Selector & User Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Audit History shortcut */}
          <button
            onClick={onOpenAuditDrawer}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-[#5a3a52]/80 hover:bg-[#875A7B] rounded text-purple-100 transition-colors"
            title="Buka Log Audit & History (F-21)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Audit Trail</span>
          </button>

          {/* Reset Seed Button */}
          <button
            onClick={onOpenResetModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-700/80 hover:bg-rose-600 rounded text-white shadow-sm transition-all"
            title="Reset Database ke Baseline Seed (Hanya Owner)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Seed</span>
          </button>

          {/* Active Role Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-[#875A7B] hover:bg-[#9a678d] rounded text-white shadow-sm border border-purple-300/30 transition-all"
            >
              <UserCircle className="w-4 h-4 text-purple-100" />
              <div className="text-left flex items-center space-x-1">
                <span>{currentUser?.name || "Loading..."}</span>
                <span className="px-1.5 py-0.2 bg-[#5a3a52] rounded text-[10px] uppercase font-bold text-amber-300">
                  {currentUser?.role || "GUEST"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-purple-200" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl py-2 z-50 text-gray-800 border border-gray-200 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Simulasi 6 Akun Role (SR-15)
                  </p>
                  <p className="text-xs text-gray-500">
                    Pilih akun untuk menguji otorisasi RBAC backend.
                  </p>
                </div>

                <div className="py-1 max-h-80 overflow-y-auto">
                  {ROLES_LIST.map((r) => {
                    const isSelected = currentUser?.role === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => handleSelectRole(r.role)}
                        disabled={switching}
                        className={`w-full text-left px-3 py-2 flex items-start space-x-2 text-xs transition-colors ${
                          isSelected
                            ? "bg-purple-50 text-purple-900 font-semibold"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <Check className="w-4 h-4 text-purple-700" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{r.name}</span>
                            <span className="text-[10px] px-1 rounded bg-gray-100 font-mono text-gray-600">
                              {r.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-normal">
                            {r.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
