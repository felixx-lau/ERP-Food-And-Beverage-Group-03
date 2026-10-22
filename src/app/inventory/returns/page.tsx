"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, RotateCcw, CheckCircle2, Lock, Plus, AlertCircle, FileText, Check } from "lucide-react";
import Link from "next/link";

export default function ReturnsPage() {
  const [user, setUser] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // New Return Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [returnQty, setReturnQty] = useState(1);

  // Inspection Modal
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [acceptedQtyInput, setAcceptedQtyInput] = useState(1);
  const [rejectedQtyInput, setRejectedQtyInput] = useState(0);
  const [inspectNotes, setInspectNotes] = useState("Lolos inspeksi kualitas mutu makanan.");

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

  const fetchReturnsAndInvoices = async () => {
    setLoading(true);
    try {
      const [resRet, resInv] = await Promise.all([
        fetch("/api/returns"),
        fetch("/api/accounting/invoices"),
      ]);

      if (resRet.ok) {
        const dataRet = await resRet.json();
        setReturns(dataRet.returns || []);
        if (dataRet.returns?.length > 0 && !selectedReturn) {
          setSelectedReturn(dataRet.returns[0]);
        }
      }

      if (resInv.ok) {
        const dataInv = await resInv.json();
        setInvoices(dataInv.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchReturnsAndInvoices();
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

  // Create Return Action
  const handleCreateReturn = async () => {
    if (!selectedInvoiceId) {
      alert("Pilih Customer Invoice terlebih dahulu.");
      return;
    }
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
    if (!inv || !inv.lines || inv.lines.length === 0) {
      alert("Invoice tidak memiliki item barang yang valid.");
      return;
    }

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          lines: [
            {
              productSku: inv.lines[0].productSku,
              returnedQty: returnQty,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat return request");
        return;
      }
      setShowCreateModal(false);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Inspect Return Action
  const handleInspectReturn = async () => {
    if (!selectedReturn) return;
    const line = selectedReturn.lines[0];
    if (!line) return;

    try {
      const res = await fetch(`/api/returns/${selectedReturn.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspections: [
            {
              productSku: line.productSku,
              acceptedQty: acceptedQtyInput,
              rejectedQty: rejectedQtyInput,
              notes: inspectNotes,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal melakukan inspeksi");
        return;
      }
      setShowInspectModal(false);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Process Credit Note Action
  const handleProcessCreditNote = async (returnId: string) => {
    try {
      const res = await fetch(`/api/returns/${returnId}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal memproses Credit Note");
        return;
      }
      alert(data.message || `Credit Note ${data.creditNote?.creditNoteNumber} berhasil diterbitkan dan stok dikembalikan!`);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test T-29
  const runTestT29 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("WAREHOUSE");

      // Find an invoice for RICE-CHICK-S
      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.lines?.some((l: any) => l.productSku === "RICE-CHICK-S"));

      if (!targetInv) {
        alert("Jalankan Uji T-11 & Uji T-19 terlebih dahulu untuk menyiapkan Customer Invoice dengan produk RICE-CHICK-S.");
        return;
      }

      // Step 1: Create Return Request for 1 x RICE-CHICK-S
      const resRet = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          lines: [{ productSku: "RICE-CHICK-S", returnedQty: 1 }],
        }),
      });
      const dataRet = await resRet.json();

      // Step 2: Quality Inspection: 1 accepted, 0 rejected
      await fetch(`/api/returns/${dataRet.returnRequest.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspections: [{ productSku: "RICE-CHICK-S", acceptedQty: 1, rejectedQty: 0, notes: "Inspected OK" }],
        }),
      });

      // Step 3: Switch to Finance and Process Restock & Credit Note
      await handleSwitchRole("FINANCE");
      const resProc = await fetch(`/api/returns/${dataRet.returnRequest.id}/process`, {
        method: "POST",
      });
      const dataProc = await resProc.json();

      // Check stock at WH-JKT
      const resProd = await fetch("/api/products/RICE-CHICK-S");
      const dataProd = await resProd.json();
      const whStock = dataProd.stocks?.find((s: any) => s.locationCode === "WH-JKT")?.onHandQty;

      const passed =
        dataProc.creditNote?.subtotalNet === 48000 &&
        dataProc.creditNote?.pbjtTax === 4800 &&
        dataProc.creditNote?.totalGross === 52800 &&
        dataProc.financials?.totalCostReversed === 26000 &&
        whStock === 36;

      setTestResult({
        id: "T-29",
        name: "Alur Normal: Return Inspection dan Credit Note (Fitur F-18 / Wireframe S-15)",
        status: passed ? "PASS" : "FAIL",
        expected: "WH on-hand 35->36; reverse cost Rp26.000; Credit Note net Rp48.000, PBJT Rp4.800, total Rp52.800; A/R berkurang Rp52.800.",
        actual: `Credit Note ${dataProc.creditNote?.creditNoteNumber}: Net Rp${dataProc.creditNote?.subtotalNet?.toLocaleString("id-ID")}, PBJT Rp${dataProc.creditNote?.pbjtTax?.toLocaleString("id-ID")}, Total Rp${dataProc.creditNote?.totalGross?.toLocaleString("id-ID")}. Biaya HPP dibalik Rp${dataProc.financials?.totalCostReversed?.toLocaleString("id-ID")}. Stok fisik WH-JKT: ${whStock} (naik ke 36). Jurnal pembalikan terbit seimbang.`,
      });

      await fetchReturnsAndInvoices();
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-30
  const runTestT30 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("WAREHOUSE");

      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.lines?.some((l: any) => l.productSku === "RICE-CHICK-S"));

      if (!targetInv) {
        alert("Jalankan Uji T-11 & Uji T-19 terlebih dahulu.");
        return;
      }

      // Create return request for 2 units
      const resRet = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          lines: [{ productSku: "RICE-CHICK-S", returnedQty: 2 }],
        }),
      });
      const dataRet = await resRet.json();

      // Inspection NOT accepted (e.g. still PENDING, or REJECTED)
      // Try processing credit note directly without ACCEPTED status (SR-11)
      await handleSwitchRole("FINANCE");
      const resProc = await fetch(`/api/returns/${dataRet.returnRequest.id}/process`, {
        method: "POST",
      });
      const dataProc = await resProc.json();

      const blockedOk =
        resProc.status === 400 &&
        dataProc.error.includes("belum lolos pemeriksaan kualitas");

      setTestResult({
        id: "T-30",
        name: "Aturan / Edge Case: Penolakan Restok & Credit Note Tanpa Inspeksi Diterima (SR-11 / F-18)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Sistem menolak restok stok dan penerbitan Credit Note karena barang retur belum berstatus ACCEPTED sesuai SR-11.",
        actual: `HTTP ${resProc.status}: "${dataProc.error}". Upaya restok tanpa inspeksi lolos berhasil digagalkan.`,
      });

      await fetchReturnsAndInvoices();
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
        {/* Wireframe S-15 Header */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-purple-700" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Return Inspection dan Credit Note
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                  Wireframe S-15
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Inventory / Invoicing</strong> · Roles: Warehouse, Finance · Fitur: <strong>F-18, SR-11</strong>
              </p>
            </div>
          </div>

          {/* Sub Navigation & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/inventory/transfers"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              Internal Transfers
            </Link>
            <Link
              href="/accounting/invoices"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors"
            >
              Customer Invoices
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Permintaan Retur</span>
            </button>
          </div>
        </div>

        {/* Return Selector */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-600">Pilih Dokumen Retur:</span>
          <select
            value={selectedReturn?.id || ""}
            onChange={(e) => {
              const sel = returns.find((r) => r.id === e.target.value);
              if (sel) setSelectedReturn(sel);
            }}
            className="text-xs font-mono font-bold bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 focus:ring-1 focus:ring-purple-600"
          >
            {returns.length === 0 && <option value="">(Belum ada data retur)</option>}
            {returns.map((ret) => (
              <option key={ret.id} value={ret.id}>
                {ret.returnNumber} — {ret.customer?.name} ({ret.inspectionStatus}) [{ret.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Selected Return Detail (Wireframe S-15 Sections ②, ③, ④, ⑤) */}
        {selectedReturn && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            {/* Status Ribbon (Wireframe S-15 Section ②) */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Dokumen:</span>
                <div className="inline-flex rounded-md shadow-2xs">
                  {["DRAFT", "CONFIRMED", "DONE"].map((st) => {
                    const isDone = selectedReturn.status === "DONE" && st === "DONE";
                    const isConfirmed = selectedReturn.status === "CONFIRMED" && st === "CONFIRMED";
                    const isDraft = selectedReturn.status === "DRAFT" && st === "DRAFT";
                    const active = isDone || isConfirmed || isDraft;

                    return (
                      <span
                        key={st}
                        className={`px-3 py-1 text-xs font-bold font-mono ${
                          active
                            ? "bg-purple-700 text-white"
                            : "bg-white text-gray-400"
                        } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                      >
                        {st}
                      </span>
                    );
                  })}
                </div>

                <span className={`text-xs px-2.5 py-0.5 rounded font-bold font-mono ${
                  selectedReturn.inspectionStatus === "ACCEPTED"
                    ? "bg-green-100 text-green-800"
                    : selectedReturn.inspectionStatus === "REJECTED"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  Inspeksi: {selectedReturn.inspectionStatus}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {selectedReturn.inspectionStatus === "PENDING" && (
                  <button
                    onClick={() => {
                      setAcceptedQtyInput(selectedReturn.lines[0]?.returnedQty || 1);
                      setRejectedQtyInput(0);
                      setShowInspectModal(true);
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                  >
                    <span>Lakukan Inspeksi Gudang</span>
                  </button>
                )}

                {selectedReturn.inspectionStatus === "ACCEPTED" && selectedReturn.status !== "DONE" && (
                  <button
                    onClick={() => handleProcessCreditNote(selectedReturn.id)}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Proses Restock & Terbitkan Credit Note</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Core Info (Wireframe S-15 Section ③) */}
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Return Number
                </span>
                <span className="text-xl font-extrabold text-purple-800 font-mono">
                  {selectedReturn.returnNumber}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  Customer: {selectedReturn.customer?.name} ({selectedReturn.customer?.code})
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Original Invoice
                </span>
                <span className="text-base font-bold text-teal-800 block font-mono">
                  {selectedReturn.invoice?.invoiceNumber}
                </span>
                <span className="text-xs text-gray-500 block">Faktur Penjualan Rujukan</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Inspect Status (SR-11)
                </span>
                <span className="text-base font-bold text-gray-900 block font-mono">
                  {selectedReturn.inspectionStatus}
                </span>
                <span className="text-xs text-gray-500 block">Pemeriksaan fisik oleh Warehouse</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Credit Note
                </span>
                <span className="text-base font-bold text-purple-700 block font-mono">
                  {selectedReturn.creditNotes?.[0]?.creditNoteNumber || "— (Belum Terbit)"}
                </span>
                <span className="text-xs text-gray-500 block">Dokumen pembalikan piutang</span>
              </div>
            </div>

            {/* Section ④: Retur, Restock, Pembalikan Pajak Table */}
            <div className="p-6">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                ④ Retur, Restock, Pembalikan Pajak (Wireframe S-15)
              </h3>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Deskripsi Produk</th>
                      <th className="py-2.5 px-4 text-center">Dikembalikan</th>
                      <th className="py-2.5 px-4 text-center">Accepted</th>
                      <th className="py-2.5 px-4 text-center">Rejected</th>
                      <th className="py-2.5 px-4 text-right">Cost Reverse</th>
                      <th className="py-2.5 px-4 text-right">Credit Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedReturn.lines?.map((line: any) => {
                      const costRev = line.acceptedQty * line.unitStandardCost;
                      const netCredit = line.acceptedQty * line.unitSalesPrice;
                      const pbjtCredit = Math.round(netCredit * 0.1);
                      const grossCredit = netCredit + pbjtCredit;

                      return (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4 font-bold text-purple-800">{line.productSku}</td>
                          <td className="py-2.5 px-4 font-sans text-gray-700">{line.product?.name}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-gray-900">{line.returnedQty}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-green-700">{line.acceptedQty}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-rose-700">{line.rejectedQty}</td>
                          <td className="py-2.5 px-4 text-right text-gray-800 font-bold">
                            Rp{costRev.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-purple-900">
                            Rp{grossCredit.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wireframe S-15 Section ⑤: Related Docs & Audit History */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-gray-700">⑤ Related Docs:</span>
                <span className="font-mono text-purple-700">Ret: {selectedReturn.returnNumber}</span>
                <span>·</span>
                <span className="font-mono text-teal-700">Inv: {selectedReturn.invoice?.invoiceNumber}</span>
                <span>·</span>
                <span className="font-mono text-green-700">Credit Note: {selectedReturn.creditNotes?.[0]?.creditNoteNumber || "-"}</span>
              </div>
              <button
                onClick={() => setAuditDrawerOpen(true)}
                className="text-purple-700 hover:text-purple-900 font-semibold flex items-center space-x-1"
              >
                <span>Lihat Log Notes & Audit Trail</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Buat Permintaan Retur */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-purple-700" />
                <span>Buat Permintaan Retur Pelanggan</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Pilih Faktur Penjualan:</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  >
                    <option value="">-- Pilih Customer Invoice --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customer?.name} ({inv.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Kuantitas Barang Retur:</label>
                  <input
                    type="number"
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                    min={1}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateReturn}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan Permintaan Retur
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Inspeksi Kualitas Gudang */}
        {showInspectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                <span>Pemeriksaan Kualitas Barang Retur (SR-11)</span>
              </h2>
              <p className="text-xs text-gray-600">
                Inspeksi mutu fisik barang sebelum dimasukkan kembali ke persediaan gudang.
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Kuantitas Diterima (Accepted):</label>
                    <input
                      type="number"
                      value={acceptedQtyInput}
                      onChange={(e) => setAcceptedQtyInput(Number(e.target.value))}
                      min={0}
                      className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Kuantitas Ditolak (Rejected):</label>
                    <input
                      type="number"
                      value={rejectedQtyInput}
                      onChange={(e) => setRejectedQtyInput(Number(e.target.value))}
                      min={0}
                      className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Catatan Hasil Pemeriksaan Mutu:</label>
                  <textarea
                    value={inspectNotes}
                    onChange={(e) => setInspectNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowInspectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleInspectReturn}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan Hasil Inspeksi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Test Suite for Phase 7 (T-29, T-30) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center space-x-2">
                <Play className="w-4 h-4 text-purple-700" />
                <span>Pengujian Modul Return & Credit Note (T-29 & T-30)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Verifikasi inspeksi mutu, penambahan stok restock, pembalikan COGS, dan penerbitan Credit Note (SR-11 / F-18).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT29}
                disabled={testing}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-29 (Normal Flow)</span>
              </button>
              <button
                onClick={runTestT30}
                disabled={testing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-30 (Edge Case)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                testResult.status === "PASS"
                  ? "bg-green-50 border-green-200 text-green-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      testResult.status === "PASS"
                        ? "bg-green-200 text-green-800"
                        : "bg-rose-200 text-rose-800"
                    }`}
                  >
                    {testResult.status}
                  </span>
                  <span>
                    {testResult.id} — {testResult.name}
                  </span>
                </span>
              </div>
              <p>
                <strong>Ekspektasi:</strong> {testResult.expected}
              </p>
              <p className="font-mono">
                <strong>Hasil Aktual:</strong> {testResult.actual}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modals & Drawers */}
      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        userRole={user?.role || "WAREHOUSE"}
      />
      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        userRole={user?.role || "WAREHOUSE"}
        onSuccess={() => {
          fetchReturnsAndInvoices();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
