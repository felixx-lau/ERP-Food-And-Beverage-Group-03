"use client";

import React, { useState } from "react";
import {
  Menu,
  LayoutGrid,
  ShieldAlert,
  RotateCcw,
  UserCircle,
  ChevronDown,
  Check,
  MapPin,
  Sparkles,
} from "lucide-react";

interface TopbarProps {
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
  onToggleMobileSidebar: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const ROLES_LIST = [
  { role: "OWNER", name: "Maya Prasetyo", title: "Pemilik Perusahaan (Full Access)" },
  { role: "SALES", name: "Dini Anggraini", title: "Manajer Penjualan (Sales & CRM)" },
  { role: "WAREHOUSE", name: "Sinta Maharani", title: "Kepala Gudang (Inventory & Delivery)" },
  { role: "PROCUREMENT", name: "Arief Wicaksono", title: "Manajer Pengadaan (Purchase & RFQ)" },
  { role: "FINANCE", name: "Reza Firdaus", title: "Kepala Keuangan (Accounting, Ledger & Bill)" },
  { role: "CASHIER", name: "Bagas Putra", title: "Kepala Gerai / Kasir (Point of Sale)" },
];

export default function Topbar({
  currentUser,
  onSwitchRole,
  onOpenResetModal,
  onOpenAuditDrawer,
  onOpenAppSwitcher,
  onToggleMobileSidebar,
  breadcrumbs,
}: TopbarProps) {
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
    <header className="sticky top-0 z-20 h-14 bg-[#174A3A] text-white border-b border-[#11382C] shadow-xs select-none">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle, App Switcher, and Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-[#DCE8DF] hover:text-white transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* App Switcher button */}
          <button
            onClick={onOpenAppSwitcher}
            title="App Launcher (▦ Odoo Hub)"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 transition-all text-[#DCE8DF] hover:text-white"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Breadcrumbs */}
          <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-[#DCE8DF]/80 truncate">
            <span className="text-white/70">PT Rasa Aruna Bersama</span>
            <span>/</span>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? "font-semibold text-white" : ""}>
                    {b.label}
                  </span>
                </React.Fragment>
              ))
            ) : (
              <span className="font-semibold text-white">Core ERP</span>
            )}
          </div>

          {/* Default location indicator */}
          <div className="hidden md:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#11382C] text-[#DCE8DF] border border-white/10">
            <MapPin className="w-3 h-3 text-[#C6A15B]" />
            <span>WH-JKT</span>
          </div>
        </div>

        {/* Right: Audit Trail, Reset Seed, and User Role Switcher */}
        <div className="flex items-center space-x-2">
          {/* Audit History Shortcut */}
          <button
            onClick={onOpenAuditDrawer}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all border border-white/10 shadow-xs"
            title="Buka Log Audit & Security History (SR-15 / F-21)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span className="hidden md:inline">Audit Trail</span>
          </button>

          {/* Reset Seed Button */}
          <button
            onClick={onOpenResetModal}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg text-white transition-all shadow-xs"
            title="Reset Database ke Baseline Seed (Hanya Role Owner)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#11382C] hover:bg-[#0d2a21] border border-[#C6A15B]/30 text-white text-xs font-medium transition-all shadow-xs"
            >
              <div className="w-6 h-6 rounded-full bg-[#C6A15B] text-[#174A3A] font-bold text-xs flex items-center justify-center">
                {currentUser?.name ? currentUser.name.charAt(0) : "M"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="font-semibold leading-tight text-white max-w-[110px] truncate">
                  {currentUser?.name || "Memuat..."}
                </p>
                <p className="text-[10px] text-[#C6A15B] font-bold uppercase tracking-wider">
                  {currentUser?.role || "OWNER"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#DCE8DF]" />
            </button>

            {/* Role Switcher Dropdown */}
            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-dropdown py-2 z-50 text-[#202824] border border-[#E5E9E4] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-[#E5E9E4] bg-[#F7F8F5]">
                  <p className="text-[10px] font-bold text-[#758078] uppercase tracking-wider">
                    Simulasi 6 Akun Role (SR-15)
                  </p>
                  <p className="text-[11px] text-[#758078] mt-0.5">
                    Ganti akun seketika untuk menguji otorisasi RBAC backend.
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#202824] truncate">{r.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EBECE8] font-mono font-semibold text-[#525B55]">
                              {r.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#758078] font-normal truncate mt-0.5">
                            {r.title}
                          </p>
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