"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ArrowLeft,
  DollarSign,
  TrendingDown,
  UserCheck,
  Wallet,
  Clock
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
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C02",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 2, unitPrice: 48000, discountPercent: 0 }],
        }),
      });
      const orderData = await resCreate.json();

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
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Penjualan & CRM" }, { label: "Kontak & Limit Kredit" }]}
      title="Contact Form & Credit Exposure"
      subtitle="Pengaturan Limit Plafon Kredit, Syarat Pembayaran & Pemantauan Headroom Piutang (F-02, F-10, SR-09)"
      wireframe="Wireframe S-03"
      actions={
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-[#758078] mr-1 hidden sm:inline">Pilih Kontak:</span>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedContact?.id === c.id
                  ? "bg-[#174A3A] text-white shadow-xs"
                  : "bg-white border border-[#E5E9E4] text-[#202824] hover:bg-[#F7F8F5]"
              }`}
            >
              {c.id} - {c.name.split(" ")[0]}
            </button>
          ))}
        </div>
      }
    >
      {/* Selected Customer Detail Card */}
      {selectedContact && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F7F8F5]/60">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  Customer ID / Code
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E1EDE6] text-[#174A3A]">
                  Active Customer
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-1">
                {selectedContact.id}
              </h2>

              <div className="mt-3">
                <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                  Nama Pelanggan
                </span>
                <p className="text-base font-bold text-[#202824] mt-0.5">
                  {selectedContact.name}
                </p>
                <p className="text-xs text-[#758078]">
                  Tipe: {selectedContact.customerType || "Corporate / Business"} · Kota: {selectedContact.city}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E5E9E4]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#174A3A]" />
                  <span className="text-xs font-semibold text-[#202824]">Payment Terms:</span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FAF5EB] text-[#A88544] border border-[#F4E7CE]">
                  {selectedContact.paymentTerms}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-[#E5E9E4]">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-[#174A3A]" />
                  <span className="text-xs font-semibold text-[#202824]">Credit Limit Plafon:</span>
                </div>
                <span className="text-sm font-bold text-[#202824] font-mono">
                  Rp {selectedContact.creditLimit.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Piutang dan Batas Kredit (Formula SR-09) */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Credit Exposure & Sisa Plafon (SR-09)</span>
              </h3>
              <span className="text-xs text-[#758078]">Formula: Headroom = Limit - Exposure</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#E5E9E4] bg-[#F7F8F5]">
                <span className="text-xs text-[#758078] block">Open A/R (Piutang Terbuka):</span>
                <p className="text-lg font-bold text-[#202824] font-mono mt-1">
                  Rp {selectedContact.openReceivable.toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-[#758078]">Saldo invoice confirmed belum lunas</span>
              </div>

              <div className="p-4 rounded-xl border border-[#E5E9E4] bg-[#F7F8F5]">
                <span className="text-xs text-[#758078] block">Confirmed-Uninvoiced SO:</span>
                <p className="text-lg font-bold text-[#202824] font-mono mt-1">
                  Rp {(selectedContact.creditExposure - selectedContact.openReceivable).toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-[#758078]">Order confirmed belum diterbitkan tagihan</span>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70">
                <span className="text-xs font-semibold text-emerald-800 block">
                  Credit Headroom (Sisa Plafon):
                </span>
                <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                  Rp {selectedContact.creditHeadroom.toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">Batas aman transaksi berikutnya</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QA Test Runner for T-03 & T-04 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-03 & T-04 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Batas Kredit, Piutang Terbuka & Proteksi Overlimit (SR-09)
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji perhitungan credit exposure dan penolakan otomatis konfirmasi order yang melampaui sisa plafon.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT03}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-03 (Normal Headroom)</span>
            </button>

            <button
              onClick={runTestT04}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-04 (C02 Over-limit Edge Case)</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-[#081B15] border border-[#C6A15B]/40 rounded-xl p-4.5 space-y-2.5 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#C6A15B] font-mono text-sm">[{testResult.id}]</span>
                <span className="font-semibold text-white">{testResult.name}</span>
              </div>
              <span
                className={`px-3 py-0.5 rounded-full font-bold font-mono text-xs ${
                  testResult.status === "PASS" ? "bg-emerald-500 text-gray-950" : "bg-rose-500 text-white"
                }`}
              >
                {testResult.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
              <div className="space-y-1">
                <span className="text-[#ADB2AA] font-semibold block">Ekspektasi:</span>
                <p className="text-[#DCE8DF] leading-relaxed">{testResult.expected}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[#ADB2AA] font-semibold block">Hasil Aktual:</span>
                <p className="text-emerald-300 font-mono leading-relaxed">{testResult.actual}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}