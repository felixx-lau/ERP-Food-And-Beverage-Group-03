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
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="bg-[#714B67] text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">Audit Trail & Security History (SR-15 / F-21)</h3>
              <p className="text-[11px] text-purple-200">
                Pencatatan aktor, role, timestamp, aksi, dan status dokumen
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              title="Refresh Logs"
              className="p-1 hover:bg-[#875A7B] rounded text-purple-200 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#875A7B] rounded text-purple-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              {loading ? "Memuat catatan audit..." : "Belum ada catatan audit."}
            </div>
          ) : (
            logs.map((log) => {
              const isDenied = log.action.includes("DENIED") || log.action.includes("REJECT");
              const isSeed = log.documentType === "SEED";

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-lg p-3.5 border shadow-2xs text-xs space-y-2 transition-all ${
                    isDenied
                      ? "border-rose-300 bg-rose-50/40"
                      : isSeed
                      ? "border-purple-200"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          isDenied
                            ? "bg-rose-100 text-rose-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {log.documentType} / {log.documentId}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-gray-400 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleTimeString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="font-medium text-gray-800">{log.actorName}</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-gray-100 rounded text-[10px] font-mono text-gray-600">
                      {log.actorRole}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 text-[11px] leading-relaxed">
                      {log.notes}
                    </p>
                  )}

                  {log.afterState && (
                    <details className="text-[10px] text-gray-500 cursor-pointer">
                      <summary className="font-mono text-purple-700 hover:underline">
                        Lihat Snapshot State
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-900 text-emerald-400 rounded overflow-x-auto font-mono text-[9px]">
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
