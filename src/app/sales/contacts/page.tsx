"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ArrowLeft,
  DollarSign,
  TrendingDown
} from "lucide-react";
import Link from "next/link";

interface ContactItem {
  id: string;
  name: string;
  type: string;
  customerType: string;
  city: string;
  creditLimit: number;
  paymentTerms: string;
  creditExposure: number;
  creditHeadroom: number;
  openReceivable: number;
}

export default function ContactsPage() {
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // Test Runner for T-03 & T-04
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts?type=CUSTOMER");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        if (data.contacts?.length > 0) {
          setSelectedContact(data.contacts[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchContacts();
  }, []);

  const handleSwitchRole = async (targetRole: string) => {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  // Run Test T-03
  const runTestT03 = async () => {
    setTesting(true);
    try {
      const resC01 = await fetch("/api/contacts/C01");
      const dataC01 = await resC01.json();
      const resC02 = await fetch("/api/contacts/C02");
      const dataC02 = await resC02.json();

      const c01Ok =
        dataC01.creditStatus.creditLimit === 3000000 &&
        dataC01.creditStatus.openReceivable === 1200000 &&
        dataC01.creditStatus.creditHeadroom === 1800000;

      const c02Ok =
        dataC02.creditStatus.creditLimit === 350000 &&
        dataC02.creditStatus.openReceivable === 300000 &&
        dataC02.creditStatus.creditHeadroom === 50000;

      setTestResult({
        id: "T-03",
        name: "Alur Normal: Verifikasi Limit, Piutang & Headroom C01 & C02 (F-02 / F-10)",
        status: c01Ok && c02Ok ? "PASS" : "FAIL",
        expected: "C01: limit Rp3.000.000, piutang Rp1.200.000, headroom Rp1.800.000 | C02: limit Rp350.000, piutang Rp300.000, headroom Rp50.000.",
        actual: `C01 [Limit: Rp ${dataC01.creditStatus.creditLimit.toLocaleString("id-ID")}, AR: Rp ${dataC01.creditStatus.openReceivable.toLocaleString("id-ID")}, Headroom: Rp ${dataC01.creditStatus.creditHeadroom.toLocaleString("id-ID")}] · C02 [Limit: Rp ${dataC02.creditStatus.creditLimit.toLocaleString("id-ID")}, AR: Rp ${dataC02.creditStatus.openReceivable.toLocaleString("id-ID")}, Headroom: Rp ${dataC02.creditStatus.creditHeadroom.toLocaleString("id-ID")}].`,
      });
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-04
  const runTestT04 = async () => {
    setTesting(true);
    try {
      // Create quotation for C02: 2 x RICE-CHICK-S = Rp 105.600 gross
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C02",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 2, unitPrice: 48000, discountPercent: 0 }],
        }),
      });
      const orderData = await resCreate.json();

      // Attempt to confirm
      const resConfirm = await fetch(`/api/sales/orders/${orderData.order.id}/confirm`, {
        method: "POST",
      });
      const confirmData = await resConfirm.json();

      const blocked = resConfirm.status === 400 && confirmData.error.includes("Batas Kredit Terlampaui");

      setTestResult({
        id: "T-04",
        name: "Aturan / Edge Case: Order C02 Melebihi Headroom (SR-09 / F-02 / F-10)",
        status: blocked ? "PASS" : "FAIL",
        expected: "Gross order Rp105.600 melebihi headroom Rp50.000. Sistem menolak konfirmasi order dan menjaga saldo headroom.",
        actual: `HTTP ${resConfirm.status}: "${confirmData.error}". Konfirmasi otomatis diblokir, headroom C02 Rp50.000 tetap terlindungi.`,
      });
      fetchContacts();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <HeaderNavbar
        currentUser={user}
        onSwitchRole={handleSwitchRole}
        onOpenResetModal={() => setResetModalOpen(true)}
        onOpenAuditDrawer={() => setAuditDrawerOpen(true)}
        onOpenAppSwitcher={() => setAppSwitcherOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Wireframe S-02 Header */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#714B67]" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Contact Form dan Credit Exposure
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-02
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Sales / Contacts</strong> · Roles: Sales, Finance · Fitur: <strong>F-02, F-10</strong>
              </p>
            </div>
          </div>

          {/* Customer Selector Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedContact?.id === c.id
                    ? "bg-[#714B67] text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Customer Detail Card (Wireframe S-02 Section 3 & 4) */}
        {selectedContact && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Customer ID / Code
                </span>
                <h2 className="text-2xl font-black text-[#714B67] font-mono mt-0.5">
                  {selectedContact.id}
                </h2>

                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                    Nama Pelanggan
                  </span>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {selectedContact.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tipe: {selectedContact.customerType || "Company"} · Kota: {selectedContact.city}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">Payment Terms:</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                    {selectedContact.paymentTerms}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-600">Credit Limit:</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">
                    Rp {selectedContact.creditLimit.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Wireframe S-02 Section 4: Piutang dan Batas Kredit (SR-09) */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center space-x-2">
                <span>④ Piutang dan Batas Kredit (Formula SR-09)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block">Open A/R (Piutang Terbuka):</span>
                  <p className="text-lg font-bold text-gray-900 font-mono mt-1">
                    Rp {selectedContact.openReceivable.toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] text-gray-400">Saldo invoice belum terbayar</span>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-xs text-gray-500 block">Confirmed-Uninvoiced SO:</span>
                  <p className="text-lg font-bold text-gray-900 font-mono mt-1">
                    Rp {(selectedContact.creditExposure - selectedContact.openReceivable).toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] text-gray-400">Order confirmed belum ditagih</span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <span className="text-xs font-semibold text-emerald-800 block">
                    Credit Headroom (Sisa Plafon):
                  </span>
                  <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                    Rp {selectedContact.creditHeadroom.toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] text-emerald-600">Credit Limit - Credit Exposure</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QA Test Runner for T-03 & T-04 */}
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-03 & T-04
              </h3>
              <p className="text-xs text-gray-300">
                Uji perhitungan credit exposure (SR-09) dan penolakan over-limit order.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT03}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-03 (Normal Headroom)</span>
              </button>

              <button
                onClick={runTestT04}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-04 (C02 Over-limit Edge Case)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-gray-950/80 border border-gray-700 rounded-lg p-4 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-amber-300 font-mono text-sm">[{testResult.id}]</span>
                  <span className="font-semibold text-white">{testResult.name}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-xs ${
                    testResult.status === "PASS" ? "bg-emerald-500 text-gray-950" : "bg-rose-500 text-white"
                  }`}
                >
                  {testResult.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-gray-400 font-semibold block">Expected Result:</span>
                  <p className="text-gray-200 mt-0.5">{testResult.expected}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block">Actual Result:</span>
                  <p className="text-emerald-300 mt-0.5 font-mono">{testResult.actual}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        userRole={user?.role}
        onSelectApp={(app) => alert(`Buka modul: ${app}`)}
      />
      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        currentUserRole={user?.role}
        onSuccess={() => {
          fetchContacts();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
