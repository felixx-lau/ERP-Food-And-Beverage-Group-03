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
    <header className="bg-[#174A3A] text-white select-none sticky top-0 z-40 shadow-xs border-b border-[#11382C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Apps Launcher & Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAppSwitcher}
            title="App Switcher (▦ Apps)"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors text-[#DCE8DF] hover:text-white"
          >
            <LayoutGrid className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold tracking-wide">
            <span className="text-[#DCE8DF]">PT Rasa Aruna Bersama</span>
            <span className="text-[#DCE8DF]/60">/</span>
            <span className="text-white font-bold">Rasa Aruna Kitchen</span>
          </div>

          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#11382C] text-[#DCE8DF] border border-white/10">
            WH-JKT (Default Location)
          </span>
        </div>

        {/* Right: Actions, Role Selector & User Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Audit History shortcut */}
          <button
            onClick={onOpenAuditDrawer}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg text-[#DCE8DF] hover:text-white transition-colors border border-white/10"
            title="Buka Log Audit & History (F-21)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>Audit Trail</span>
          </button>

          {/* Reset Seed Button */}
          <button
            onClick={onOpenResetModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg text-white shadow-xs transition-all"
            title="Reset Database ke Baseline Seed (Hanya Owner)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Seed</span>
          </button>

          {/* Active Role Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-[#11382C] hover:bg-[#0d2a21] rounded-lg text-white shadow-xs border border-[#C6A15B]/30 transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-[#C6A15B] text-[#174A3A] font-bold text-[11px] flex items-center justify-center">
                {currentUser?.name ? currentUser.name.charAt(0) : "M"}
              </div>
              <div className="text-left flex items-center space-x-1.5">
                <span className="hidden sm:inline">{currentUser?.name || "Loading..."}</span>
                <span className="px-1.5 py-0.5 bg-[#0d2a21] rounded text-[10px] uppercase font-bold text-[#C6A15B]">
                  {currentUser?.role || "GUEST"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#DCE8DF]" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-dropdown py-2 z-50 text-[#202824] border border-[#E5E9E4] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-2 border-b border-[#E5E9E4] bg-[#F7F8F5]">
                  <p className="text-[11px] font-bold text-[#758078] uppercase tracking-wider">
                    Simulasi 6 Akun Role (SR-15)
                  </p>
                  <p className="text-xs text-[#758078]">
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
                        className={`w-full text-left px-3.5 py-2.5 flex items-start space-x-2.5 text-xs transition-colors ${
                          isSelected
                            ? "bg-[#F2F7F4] text-[#174A3A] font-semibold"
                            : "hover:bg-[#F7F8F5] text-[#202824]"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <Check className="w-4 h-4 text-[#174A3A]" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#D5D8D3]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#202824]">{r.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EBECE8] font-mono text-[#525B55]">
                              {r.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#758078] font-normal">
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
