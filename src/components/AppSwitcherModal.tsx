"use client";

import React from "react";
import { 
  X, 
  ShoppingCart, 
  Users2, 
  Truck, 
  Package, 
  BookOpen, 
  Receipt, 
  Store, 
  BarChart3, 
  Lock
} from "lucide-react";
import { canAccessModule } from "@/lib/auth";
import { Role } from "@prisma/client";

interface AppSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  onSelectApp?: (appKey: string) => void;
}

export const APPS_CATALOG = [
  {
    key: "sales",
    name: "Sales",
    desc: "Quotation, Sales Orders, Discount Approval & Price Lock",
    icon: ShoppingCart,
    color: "bg-emerald-600",
    roles: ["OWNER", "SALES"],
    destination: "Quotation & Orders",
  },
  {
    key: "crm",
    name: "CRM",
    desc: "Lead Pipeline Kanban & Opportunity Tracking",
    icon: Users2,
    color: "bg-blue-600",
    roles: ["OWNER", "SALES"],
    destination: "Leads Kanban",
  },
  {
    key: "purchase",
    name: "Purchase",
    desc: "RFQ, Vendor PO & Procurement Commitments",
    icon: Truck,
    color: "bg-amber-600",
    roles: ["OWNER", "PROCUREMENT"],
    destination: "RFQ & PO",
  },
  {
    key: "inventory",
    name: "Inventory",
    desc: "15 SKU Variants, Multi-Location Stock, Delivery & Transfer",
    icon: Package,
    color: "bg-indigo-600",
    roles: ["OWNER", "WAREHOUSE", "PROCUREMENT"],
    destination: "Stock & Operations",
  },
  {
    key: "accounting",
    name: "Accounting",
    desc: "Double-Entry General Ledger, Chart of Accounts & COGS",
    icon: BookOpen,
    color: "bg-purple-700",
    roles: ["OWNER", "FINANCE"],
    destination: "General Ledger",
  },
  {
    key: "invoicing",
    name: "Invoicing",
    desc: "Delivery Invoices, Vendor Bills, 3-Way Match & PBJT 10%",
    icon: Receipt,
    color: "bg-teal-600",
    roles: ["OWNER", "FINANCE", "SALES"],
    destination: "Customer Invoices & Bills",
  },
  {
    key: "pos",
    name: "Point of Sale",
    desc: "Kasir Gerai CAFE-JKT, POS Sessions, QRIS & Takeaway",
    icon: Store,
    color: "bg-rose-600",
    roles: ["OWNER", "CASHIER"],
    destination: "POS01 Session",
  },
  {
    key: "dashboard",
    name: "Dashboard",
    desc: "KPI Operasional, Valuasi Rp12.2M, A/R & Rekonsiliasi",
    icon: BarChart3,
    color: "bg-cyan-700",
    roles: ["OWNER", "FINANCE", "SALES", "WAREHOUSE", "PROCUREMENT"],
    destination: "Reporting & KPI",
  },
];

import { useRouter } from "next/navigation";

export default function AppSwitcherModal({
  isOpen,
  onClose,
  userRole,
  onSelectApp,
}: AppSwitcherModalProps) {
  const router = useRouter();
  if (!isOpen) return null;

  const handleAppClick = (appKey: string) => {
    onClose();
    if (appKey === "sales") router.push("/sales/orders");
    else if (appKey === "crm") router.push("/crm/leads");
    else if (appKey === "inventory") router.push("/inventory/products");
    else if (appKey === "purchase") router.push("/purchase/orders");
    else if (appKey === "invoicing") router.push("/accounting/invoices");
    else if (appKey === "accounting") router.push("/accounting/journal-entries");
    else if (appKey === "pos") router.push("/pos");
    else if (appKey === "dashboard") router.push("/dashboard");
    else if (onSelectApp) onSelectApp(appKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#103429] border border-[#C6A15B]/30 w-full max-w-4xl rounded-2xl p-8 shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-[#DCE8DF] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#DCE8DF] mb-2 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#C6A15B]" />
            <span>PT Rasa Aruna Bersama — Rasa Aruna Kitchen</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>Rasa Aruna Apps Hub</span>
          </h2>
          <p className="text-xs text-[#DCE8DF]/80 mt-1">
            Navigasi modul ERP terintegrasi · Role Aktif:{" "}
            <span className="font-bold text-[#C6A15B] uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
              {userRole || "GUEST"}
            </span>
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {APPS_CATALOG.map((app) => {
            const hasAccess = userRole ? app.roles.includes(userRole) : false;
            const IconComponent = app.icon;

            return (
              <button
                key={app.key}
                onClick={() => handleAppClick(app.key)}
                className={`group flex flex-col items-center text-center p-4 rounded-xl border border-white/5 transition-all relative ${
                  hasAccess
                    ? "bg-white/5 hover:bg-white/10 hover:border-[#C6A15B]/40 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
                    : "opacity-40 hover:opacity-55 cursor-pointer bg-black/20"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-3 ${app.color} transition-transform group-hover:scale-105`}
                >
                  <IconComponent className="w-7 h-7 text-white" />
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm tracking-wide text-white">
                    {app.name}
                  </span>
                  {!hasAccess && <Lock className="w-3.5 h-3.5 text-[#C6A15B]" />}
                </div>

                <span className="text-[11px] text-[#DCE8DF]/80 mt-1 line-clamp-2 leading-relaxed">
                  {app.destination}
                </span>

                {!hasAccess && (
                  <span className="mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
                    Restricted
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
