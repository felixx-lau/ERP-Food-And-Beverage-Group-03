"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Users2,
  Contact2,
  ShoppingCart,
  Package,
  Truck,
  ArrowLeftRight,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Receipt,
  FileText,
  CreditCard,
  BookOpen,
  Store,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  wireframe?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    group: "Ringkasan & Analitik",
    items: [
      { name: "Beranda & Apps", href: "/", icon: Home, roles: ["OWNER", "SALES", "WAREHOUSE", "PROCUREMENT", "FINANCE", "CASHIER"], wireframe: "S-01" },
      { name: "Executive Dashboard", href: "/dashboard", icon: BarChart3, roles: ["OWNER", "FINANCE", "SALES", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-16" },
    ],
  },
  {
    group: "Penjualan & CRM",
    items: [
      { name: "CRM Leads Kanban", href: "/crm/leads", icon: Users2, roles: ["OWNER", "SALES"], wireframe: "S-02" },
      { name: "Kontak & Limit Kredit", href: "/sales/contacts", icon: Contact2, roles: ["OWNER", "SALES"], wireframe: "S-03" },
      { name: "Sales Orders", href: "/sales/orders", icon: ShoppingCart, roles: ["OWNER", "SALES"], wireframe: "S-04" },
    ],
  },
  {
    group: "Persediaan & Gudang",
    items: [
      { name: "15 SKU Produk Master", href: "/inventory/products", icon: Package, roles: ["OWNER", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-05" },
      { name: "Delivery Orders", href: "/inventory/delivery", icon: Truck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-06" },
      { name: "Transfer Antar Lokasi", href: "/inventory/transfers", icon: ArrowLeftRight, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-07" },
      { name: "Penerimaan Barang", href: "/inventory/receipts", icon: PackageCheck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-09" },
      { name: "Retur & Credit Note", href: "/inventory/returns", icon: RotateCcw, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-15" },
    ],
  },
  {
    group: "Pengadaan (Procurement)",
    items: [
      { name: "Purchase Orders (RFQ)", href: "/purchase/orders", icon: ShoppingBag, roles: ["OWNER", "PROCUREMENT"], wireframe: "S-08" },
    ],
  },
  {
    group: "Keuangan & Akuntansi",
    items: [
      { name: "Customer Invoices", href: "/accounting/invoices", icon: Receipt, roles: ["OWNER", "FINANCE", "SALES"], wireframe: "S-10" },
      { name: "Vendor Bills (3-Way)", href: "/accounting/vendor-bills", icon: FileText, roles: ["OWNER", "FINANCE"], wireframe: "S-11" },
      { name: "Pembayaran & Kas", href: "/accounting/payments", icon: CreditCard, roles: ["OWNER", "FINANCE"], wireframe: "S-12" },
      { name: "General Ledger & Jurnal", href: "/accounting/journal-entries", icon: BookOpen, roles: ["OWNER", "FINANCE"], wireframe: "S-13" },
    ],
  },
  {
    group: "Point of Sale",
    items: [
      { name: "Kasir POS CAFE-JKT", href: "/pos", icon: Store, roles: ["OWNER", "CASHIER"], wireframe: "S-14" },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  userRole = "OWNER",
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#174A3A] text-white select-none border-r border-[#11382C]">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#11382C]/80 bg-[#134032]">
        <Link href="/" className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#C6A15B] flex items-center justify-center text-[#174A3A] font-extrabold text-base flex-shrink-0 shadow-sm">
            RA
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-wide text-white truncate">
                Rasa Aruna
              </span>
              <span className="text-[10px] text-[#DCE8DF] font-medium tracking-tight truncate">
                Enterprise Kitchen ERP
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 text-[#DCE8DF] hover:text-white transition-colors"
          title={isCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold text-[#DCE8DF]/60 uppercase tracking-wider">
                {group.group}
              </p>
            )}

            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const hasAccess = item.roles.includes(userRole);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={`${item.name} (${item.wireframe})`}
                  className={`group flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#C6A15B]"
                      : hasAccess
                      ? "text-[#DCE8DF] hover:bg-white/10 hover:text-white"
                      : "text-white/40 hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive
                        ? "text-[#C6A15B]"
                        : hasAccess
                        ? "text-[#DCE8DF] group-hover:text-white"
                        : "text-white/30"
                    } ${!isCollapsed ? "mr-2.5" : "mx-auto"}`}
                  />

                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.name}</span>
                      {!hasAccess && (
                        <Lock className="w-3 h-3 text-[#C6A15B]/70 flex-shrink-0 ml-1.5" />
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#11382C]/80 bg-[#134032]/60 text-[11px] text-[#DCE8DF]/80">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>PT Rasa Aruna Bersama</span>
          </div>
          <p className="text-[10px] text-[#DCE8DF]/60 mt-0.5">
            Role Aktif: <span className="font-bold text-[#C6A15B] uppercase">{userRole}</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}