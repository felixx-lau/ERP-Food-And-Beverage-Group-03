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
  onSelectApp: (appKey: string) => void;
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

export default function AppSwitcherModal({
  isOpen,
  onClose,
  userRole,
  onSelectApp,
}: AppSwitcherModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#2B2D42]/95 border border-purple-500/30 w-full max-w-4xl rounded-2xl p-8 shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>Rasa Aruna Apps Hub</span>
          </h2>
          <p className="text-xs text-purple-200 mt-1">
            Navigasi aplikasi terintegrasi Odoo Web 17.0 · Role Aktif:{" "}
            <span className="font-bold text-amber-300 uppercase px-2 py-0.5 rounded bg-black/40">
              {userRole || "GUEST"}
            </span>
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {APPS_CATALOG.map((app) => {
            const hasAccess = userRole ? app.roles.includes(userRole) : false;
            const IconComponent = app.icon;

            return (
              <button
                key={app.key}
                onClick={() => {
                  onSelectApp(app.key);
                  onClose();
                }}
                className={`group flex flex-col items-center text-center p-4 rounded-xl transition-all relative ${
                  hasAccess
                    ? "hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer"
                    : "opacity-45 hover:opacity-60 cursor-pointer"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3 ${app.color} transition-transform group-hover:rotate-1`}
                >
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="font-bold text-sm tracking-wide text-white">
                    {app.name}
                  </span>
                  {!hasAccess && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <span className="text-[10px] text-gray-300 mt-1 line-clamp-2">
                  {app.destination}
                </span>

                {!hasAccess && (
                  <span className="mt-1 text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-700/50">
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
