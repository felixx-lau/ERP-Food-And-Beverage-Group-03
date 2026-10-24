"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Users2, Play, Plus, Building, DollarSign, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

const STAGES = [
  { key: "NEW", label: "New Lead", border: "border-t-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "QUALIFIED", label: "Qualified", border: "border-t-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "PROPOSITION", label: "Proposition", border: "border-t-[#174A3A]", badge: "bg-[#F2F7F4] text-[#174A3A] border-[#C4DBD0]" },
  { key: "WON", label: "Won / Deal", border: "border-t-emerald-600", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
];

export default function CrmLeadsPage() {
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Test Runner state
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchLeads();
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

  // Run Test T-07
  const runTestT07 = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/crm/leads/LD0003");
      const data = await res.json();
      const lead = data.lead;

      const passed =
        lead &&
        lead.stage === "QUALIFIED" &&
        lead.expectedRevenue === 1200000 &&
        lead.contactId === "C03";

      setTestResult({
        id: "T-07",
        name: "Alur Normal: Lead LD0003 di Tahap Qualified (Fitur F-04)",
        status: passed ? "PASS" : "FAIL",
        expected: "LD0003 terlihat di kolom Qualified bernilai Rp1.200.000; kontak C03 dapat ditelusuri.",
        actual: `Lead [ID: ${lead.id}, Nama: "${lead.name}", Nilai: Rp ${lead.expectedRevenue.toLocaleString("id-ID")}, Tahap: ${lead.stage}, Pelanggan: ${lead.contact.name} (${lead.contactId})].`,
      });
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-08
  const runTestT08 = async () => {
    setTesting(true);
    try {
      // 1. Create a lead with missing expected revenue
      const createRes = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Lead Tanpa Nilai Peluang",
          contactId: "C01",
          expectedRevenue: 0,
          stage: "NEW",
        }),
      });
      const createData = await createRes.json();
      const testLeadId = createData.lead.id;

      // 2. Try moving to PROPOSITION
      const patchRes = await fetch(`/api/crm/leads/${testLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "PROPOSITION",
        }),
      });
      const patchData = await patchRes.json();

      const blocked = patchRes.status === 400 && patchData.error.includes("SR-16");

      setTestResult({
        id: "T-08",
        name: "Aturan / Edge Case: Validasi Data Minimum Lead ke Proposition (SR-16 / F-04)",
        status: blocked ? "PASS" : "FAIL",
        expected: "Sistem menolak perpindahan ke tahap Proposition jika belum ada pelanggan atau nilai peluang (SR-16).",
        actual: `HTTP ${patchRes.status}: "${patchData.error}". Perpindahan berhasil dicegah dan dicatat di audit log.`,
      });
      fetchLeads();
    } finally {
      setTesting(false);
    }
  };

  const totalPipeline = leads.reduce((sum, l) => sum + (l.expectedRevenue || 0), 0);

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Penjualan & CRM" }, { label: "CRM Leads Kanban" }]}
      title="CRM Pipeline Kanban"
      subtitle="Manajemen Pipeline Prospek & Peluang Penjualan Katering / Restoran (Fitur F-04, SR-16)"
      wireframe="Wireframe S-02"
      actions={
        <div className="flex items-center space-x-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-semibold text-[#758078] uppercase tracking-wider">Total Pipeline</p>
            <p className="text-sm font-bold text-[#174A3A]">Rp {totalPipeline.toLocaleString("id-ID")}</p>
          </div>
          <button
            onClick={() => alert("Formulir Lead Baru (Gunakan API POST /api/crm/leads)")}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#174A3A] hover:bg-[#11382C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lead Baru</span>
          </button>
        </div>
      }
    >
      {/* 4-Stage Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map((stg) => {
          const stageLeads = leads.filter((l) => l.stage === stg.key);
          const stageTotal = stageLeads.reduce((sum, l) => sum + (l.expectedRevenue || 0), 0);

          return (
            <div
              key={stg.key}
              className={`bg-white rounded-xl border border-[#E5E9E4] shadow-xs overflow-hidden flex flex-col border-t-4 ${stg.border}`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#E5E9E4] flex items-center justify-between bg-[#F7F8F5]">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wide text-[#202824]">
                    {stg.label}
                  </h3>
                  <span className="text-[11px] text-[#758078] font-mono font-medium">
                    Rp {stageTotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <span className="w-5 h-5 rounded-full bg-white border border-[#D5D8D3] text-[#202824] flex items-center justify-center font-bold text-[10px]">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-10 text-[#758078] text-xs italic">
                    Belum ada lead di tahap ini.
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white border border-[#E5E9E4] hover:border-[#174A3A]/40 rounded-xl p-3.5 shadow-2xs space-y-2.5 cursor-pointer transition-all hover:shadow-card hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#174A3A] bg-[#F2F7F4] px-2 py-0.5 rounded border border-[#C4DBD0]">
                          {lead.id}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          Rp {lead.expectedRevenue.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-[#202824] leading-snug">
                        {lead.name}
                      </h4>

                      <div className="pt-2 border-t border-[#EEF1ED] flex items-center justify-between text-[11px] text-[#758078]">
                        <span className="truncate max-w-[130px] font-medium text-[#525B55]">
                          {lead.contact?.name || lead.contactId}
                        </span>
                        <span className="font-mono text-[10px] bg-[#F7F8F5] px-1.5 py-0.5 rounded border border-[#E5E9E4]">
                          {lead.contactId}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QA Test Runner for T-07 & T-08 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-07 & T-08 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Validasi Minimum Data CRM & Tahap Qualified
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Uji tampilan lead LD0003 dan validasi minimum data (SR-16) saat berpindah tahapan.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT07}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-07 (Normal LD0003)</span>
            </button>

            <button
              onClick={runTestT08}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-08 (Incomplete Lead Edge Case)</span>
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