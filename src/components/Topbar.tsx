"use client";

import React, { useState, useEffect } from "react";
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
  Users2,
  UserPlus,
} from "lucide-react";
import ManageTeamModal from "@/components/ManageTeamModal";

interface TopbarProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSwitchRole: (role: string, userId?: string) => Promise<void>;
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
  const [manageTeamOpen, setManageTeamOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [customUsers, setCustomUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        // filter out baseline 6 scenario emails to display custom team members cleanly
        const baselineEmails = [
          "owner@rasaaruna.com",
          "sales@rasaaruna.com",
          "warehouse@rasaaruna.com",
          "procurement@rasaaruna.com",
          "finance@rasaaruna.com",
          "cashier@rasaaruna.com",
        ];
        const customs = (data.users || []).filter(
          (u: any) => !baselineEmails.includes(u.email.toLowerCase())
        );
        setCustomUsers(customs);
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectRole = async (targetRole: string, userId?: string) => {
    setSwitching(true);
    try {
      await onSwitchRole(targetRole, userId);
    } finally {
      setSwitching(false);
      setRoleMenuOpen(false);
    }
  };

  return (
    <>
      <header className="bg-[#174A3A] text-white select-none sticky top-0 z-40 shadow-xs border-b border-[#11382C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Left: Mobile Toggle, Apps Launcher & Breadcrumbs */}
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 transition-all text-[#DCE8DF] hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* App Switcher Button */}
            <button
              onClick={onOpenAppSwitcher}
              title="App Switcher (▦ Apps)"
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

          {/* Right: Team Manage, Audit Trail, Reset Seed, and User Role Switcher */}
          <div className="flex items-center space-x-2">
            {/* Manage Team Shortcut */}
            <button
              onClick={() => setManageTeamOpen(true)}
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all border border-white/10 shadow-xs"
              title="Kelola Tim & Anggota Kelompok"
            >
              <Users2 className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>Kelola Tim</span>
            </button>

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
              title="Reset Database ke Baseline Seed Skenario Tugas (Hanya Role Owner)"
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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-dropdown py-2 z-50 text-[#202824] border border-[#E5E9E4] animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2.5 border-b border-[#E5E9E4] bg-[#F7F8F5]">
                    <p className="text-[10px] font-bold text-[#758078] uppercase tracking-wider">
                      Simulasi Akun Role (SR-15)
                    </p>
                    <p className="text-[11px] text-[#758078] mt-0.5">
                      Pilih akun skenario atau anggota tim untuk menguji otorisasi RBAC.
                    </p>
                  </div>

                  <div className="py-1 max-h-80 overflow-y-auto divide-y divide-[#E5E9E4]/60">
                    {/* 6 Baseline Scenario Roles */}
                    <div>
                      <p className="px-3.5 py-1 text-[10px] font-bold text-[#758078] bg-[#F7F8F5]/80 uppercase">
                        6 Akun Skenario PDF Tugas:
                      </p>
                      {ROLES_LIST.map((r) => {
                        const isSelected = currentUser?.role === r.role && !customUsers.some(cu => cu.id === currentUser?.id);
                        return (
                          <button
                            key={r.role}
                            onClick={() => handleSelectRole(r.role)}
                            disabled={switching}
                            className={`w-full text-left px-3.5 py-2 flex items-start space-x-2.5 text-xs transition-colors ${
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
                              <p className="text-[11px] text-[#758078] font-normal truncate">
                                {r.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Group Members */}
                    {customUsers.length > 0 && (
                      <div>
                        <p className="px-3.5 py-1 text-[10px] font-bold text-[#174A3A] bg-emerald-50/80 uppercase">
                          Anggota Tim Kelompok ({customUsers.length}):
                        </p>
                        {customUsers.map((u) => {
                          const isSelected = currentUser?.id === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => handleSelectRole(u.role, u.id)}
                              disabled={switching}
                              className={`w-full text-left px-3.5 py-2 flex items-start space-x-2.5 text-xs transition-colors ${
                                isSelected
                                  ? "bg-amber-50 text-[#174A3A] font-semibold"
                                  : "hover:bg-[#F7F8F5] text-[#202824]"
                              }`}
                            >
                              <div className="mt-0.5">
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-[#D5D8D3]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#202824] truncate">{u.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 font-mono font-semibold text-emerald-800">
                                    {u.role}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#758078] font-normal truncate">
                                  {u.email}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manage Team Action */}
                  <div className="p-2 border-t border-[#E5E9E4] bg-[#F7F8F5]">
                    <button
                      onClick={() => {
                        setRoleMenuOpen(false);
                        setManageTeamOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#C6A15B]" />
                      <span>+ Tambah / Kelola Anggota Tim</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Manage Team Modal */}
      <ManageTeamModal
        isOpen={manageTeamOpen}
        onClose={() => setManageTeamOpen(false)}
        currentUser={currentUser}
        onUserChanged={fetchUsers}
      />
    </>
  );
}
