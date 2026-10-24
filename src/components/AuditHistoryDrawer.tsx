"use client";

import React, { useEffect, useState } from "react";
import { X, Shield, Clock, FileText, RefreshCw, User } from "lucide-react";

interface AuditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  documentType: string;
  documentId: string;
  notes?: string;
  beforeState?: string;
  afterState?: string;
  timestamp: string;
}

export default function AuditHistoryDrawer({ isOpen, onClose }: AuditHistoryDrawerProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-[#E5E9E4]">
        {/* Header */}
        <div className="bg-[#174A3A] text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-5 h-5 text-[#C6A15B]" />
            <div>
              <h3 className="font-bold text-sm text-white">Audit Trail & Security History (SR-15 / F-21)</h3>
              <p className="text-[11px] text-[#DCE8DF]">
                Pencatatan aktor, role, timestamp, aksi, dan status dokumen
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              title="Refresh Logs"
              className="p-1.5 hover:bg-white/10 rounded-lg text-[#DCE8DF] hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-[#DCE8DF] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F8F5]">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-[#758078] text-xs">
              {loading ? "Memuat catatan audit..." : "Belum ada catatan audit."}
            </div>
          ) : (
            logs.map((log) => {
              const isDenied = log.action.includes("DENIED") || log.action.includes("REJECT");
              const isSeed = log.documentType === "SEED";

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-xl p-3.5 border shadow-2xs text-xs space-y-2.5 transition-all ${
                    isDenied
                      ? "border-rose-200 bg-rose-50/40"
                      : isSeed
                      ? "border-aruna-200/80 bg-aruna-50/20"
                      : "border-[#E5E9E4]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                          isDenied
                            ? "bg-rose-100 text-rose-800"
                            : "bg-[#E1EDE6] text-[#174A3A]"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-semibold text-[#202824]">
                        {log.documentType} / {log.documentId}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[#758078] text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleTimeString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[#525B55]">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#758078]" />
                      <span className="font-medium text-[#202824]">{log.actorName}</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#EBECE8] rounded text-[10px] font-mono text-[#525B55]">
                      {log.actorRole}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-[#202824] bg-[#F7F8F5] p-2.5 rounded-lg border border-[#E5E9E4] text-[11px] leading-relaxed">
                      {log.notes}
                    </p>
                  )}

                  {log.afterState && (
                    <details className="text-[10px] text-[#758078] cursor-pointer">
                      <summary className="font-mono text-[#174A3A] font-semibold hover:underline">
                        Lihat Snapshot State
                      </summary>
                      <pre className="mt-1.5 p-2.5 bg-[#151A18] text-[#C4DBD0] rounded-lg overflow-x-auto font-mono text-[9px]">
                        {log.afterState}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
