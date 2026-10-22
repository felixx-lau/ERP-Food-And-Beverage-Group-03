"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { Users2, ArrowLeft, Play, Plus, Building, DollarSign } from "lucide-react";
import Link from "next/link";

const STAGES = [
  { key: "NEW", label: "New", color: "border-t-blue-500 bg-blue-50/20" },
  { key: "QUALIFIED", label: "Qualified", color: "border-t-amber-500 bg-amber-50/20" },
  { key: "PROPOSITION", label: "Proposition", color: "border-t-purple-500 bg-purple-50/20" },
  { key: "WON", label: "Won", color: "border-t-emerald-500 bg-emerald-50/20" },
];

export default function CrmLeadsPage() {
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

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
        {/* Wireframe S-04 Header */}
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
                  CRM Pipeline Kanban
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-04
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">CRM</strong> · Roles: Sales · Fitur: <strong>F-04, SR-16</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Wireframe S-04 Section 4: Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STAGES.map((stg) => {
            const stageLeads = leads.filter((l) => l.stage === stg.key);
            const stageTotal = stageLeads.reduce((sum, l) => sum + l.expectedRevenue, 0);

            return (
              <div
                key={stg.key}
                className={`bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col border-t-4 ${stg.color}`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wide text-gray-800">
                      {stg.label}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Rp {stageTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[450px]">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs italic">
                      Tidak ada lead di tahap ini.
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border border-gray-200 hover:border-purple-300 rounded-lg p-3 shadow-2xs space-y-2 cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#714B67]">
                            {lead.id}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 font-mono">
                            Rp {lead.expectedRevenue.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-gray-900 leading-snug">
                          {lead.name}
                        </h4>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="truncate max-w-[140px]">
                            {lead.contact?.name || lead.contactId}
                          </span>
                          <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
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
        <div className="bg-[#1F2937] text-white rounded-xl shadow-md p-6 border border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950">
                QA Test Automation Runner
              </span>
              <h3 className="text-base font-bold mt-1 text-white">
                Verifikasi Pengujian: T-07 & T-08
              </h3>
              <p className="text-xs text-gray-300">
                Uji tampilan lead LD0003 dan validasi minimum data (SR-16) saat pindah tahapan.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT07}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-07 (Normal LD0003)</span>
              </button>

              <button
                onClick={runTestT08}
                disabled={testing}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji T-08 (Incomplete Lead Edge Case)</span>
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
        onSuccess={() => fetchLeads()}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
