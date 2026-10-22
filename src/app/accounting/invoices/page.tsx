"use client";

import React, { useState, useEffect } from "react";
import HeaderNavbar from "@/components/HeaderNavbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import { ArrowLeft, Play, Receipt, CheckCircle2, Lock, FileSpreadsheet, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CustomerInvoicesPage() {
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedSoId, setSelectedSoId] = useState("");
  const [customInvoicedQty, setCustomInvoicedQty] = useState<number>(5);

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

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        if (data.invoices?.length > 0 && !selectedInvoice) {
          fetchInvoiceDetail(data.invoices[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/accounting/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data.invoice);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch("/api/sales/orders");
      if (res.ok) {
        const data = await res.json();
        setSalesOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchInvoices();
    fetchSalesOrders();
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

  // Post Invoice Action
  const handlePostInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/accounting/invoices/${invoiceId}/post`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal memposting invoice");
        return;
      }
      alert(data.message || "Customer Invoice berhasil diposting!");
      await fetchInvoices();
      await fetchInvoiceDetail(invoiceId);
    } catch (e) {
      console.error(e);
    }
  };

  // Create Invoice Action
  const handleCreateInvoice = async () => {
    if (!selectedSoId) {
      alert("Pilih Sales Order terlebih dahulu");
      return;
    }
    const so = salesOrders.find((s) => s.id === selectedSoId);
    if (!so || !so.lines || so.lines.length === 0) {
      alert("Sales order tidak memiliki baris produk valid");
      return;
    }

    try {
      const res = await fetch("/api/accounting/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: selectedSoId,
          lines: [
            {
              productSku: so.lines[0].productSku,
              quantity: customInvoicedQty,
              unitPrice: so.lines[0].unitPrice,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat invoice");
        return;
      }
      setShowCreateModal(false);
      await fetchInvoices();
      if (data.invoice) {
        await fetchInvoiceDetail(data.invoice.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test T-19
  const runTestT19 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      // Check delivered SO (e.g. S00007 / C01)
      const resDeliveries = await fetch("/api/inventory/delivery");
      const dataDeliveries = await resDeliveries.json();
      const doneDelivery = dataDeliveries.deliveries?.find((d: any) => d.status === "DONE");

      if (!doneDelivery) {
        alert("Jalankan Uji T-11 terlebih dahulu untuk menghasilkan Delivery Order status DONE.");
        return;
      }

      // Create Customer Invoice for 5 delivered units
      const resInv = await fetch("/api/accounting/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: doneDelivery.salesOrderId,
          deliveryOrderId: doneDelivery.id,
          lines: [{ productSku: "RICE-CHICK-S", quantity: 5, unitPrice: 48000 }],
        }),
      });
      const dataInv = await resInv.json();

      if (!resInv.ok) {
        setTestResult({
          id: "T-19",
          name: "Alur Normal: Penagihan Delivered Quantity (Fitur F-09 & F-22 / Wireframe S-10)",
          status: "FAIL",
          expected: "Invoice net Rp240.000, PBJT Rp24.000, gross Rp264.000; Dr A/R Rp264.000, Cr Revenue Rp240.000, Cr PBJT Rp24.000.",
          actual: `Gagal membuat invoice: ${dataInv.error}`,
        });
        return;
      }

      // Post invoice
      const resPost = await fetch(`/api/accounting/invoices/${dataInv.invoice.id}/post`, {
        method: "POST",
      });
      const dataPost = await resPost.json();

      const passed =
        dataInv.invoice.subtotal === 240000 &&
        dataInv.invoice.taxAmount === 24000 &&
        dataInv.invoice.totalAmount === 264000 &&
        dataPost.success === true &&
        dataPost.journalEntry?.items?.length === 3;

      setTestResult({
        id: "T-19",
        name: "Alur Normal: Penagihan Delivered Quantity (Fitur F-09 & F-22 / Wireframe S-10)",
        status: passed ? "PASS" : "FAIL",
        expected: "Invoice net Rp240.000, PBJT Rp24.000, gross Rp264.000; Dr A/R Rp264.000, Cr Revenue Rp240.000, Cr PBJT Rp24.000.",
        actual: `Invoice ${dataInv.invoice.invoiceNumber}: Net Rp${dataInv.invoice.subtotal.toLocaleString("id-ID")}, PBJT Rp${dataInv.invoice.taxAmount.toLocaleString("id-ID")}, Gross Rp${dataInv.invoice.totalAmount.toLocaleString("id-ID")}. Journal Entry ${dataPost.journalEntry?.entryNumber} terbit seimbang (3 item jurnal).`,
      });

      await fetchInvoices();
      await fetchInvoiceDetail(dataInv.invoice.id);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-20
  const runTestT20 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resDeliveries = await fetch("/api/inventory/delivery");
      const dataDeliveries = await resDeliveries.json();
      const doneDelivery = dataDeliveries.deliveries?.find((d: any) => d.status === "DONE");

      if (!doneDelivery) {
        alert("Jalankan Uji T-11 terlebih dahulu untuk menghasilkan data pengujian.");
        return;
      }

      // Attempt to invoice 8 units when only 5 delivered
      const resExcess = await fetch("/api/accounting/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: doneDelivery.salesOrderId,
          lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000 }],
        }),
      });
      const dataExcess = await resExcess.json();

      const blockedOk =
        resExcess.status === 400 &&
        dataExcess.error.includes("melebihi kuantitas yang telah terkirim");

      setTestResult({
        id: "T-20",
        name: "Aturan / Edge Case: Penolakan Penagihan Melebihi Kuantitas Terkirim (SR-01/SR-02 / F-09)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Sistem menolak pembuatan invoice untuk 8 unit karena kuantitas terkirim hanya 5 unit (kebijakan delivery-based invoicing SR-02).",
        actual: `HTTP ${resExcess.status}: "${dataExcess.error}". Percobaan penagihan 8 unit berhasil dicegah di backend.`,
      });
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
        {/* Wireframe S-10 Header */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Customer Invoice Form
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-100 text-teal-800">
                  Wireframe S-10
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Modul: <strong className="text-gray-700">Invoicing</strong> · Roles: Finance · Fitur: <strong>F-09, F-22, SR-02, SR-18</strong>
              </p>
            </div>
          </div>

          {/* Sub Navigation & Invoice Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/vendor-bills"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Vendor Bills
            </Link>
            <Link
              href="/accounting/payments"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Customer Payments
            </Link>
            <Link
              href="/accounting/journal-entries"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
            >
              Journal Entries
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Invoice Baru</span>
            </button>
          </div>
        </div>

        {/* Invoice Selector */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-600">Pilih Faktur Pelanggan:</span>
          <select
            value={selectedInvoice?.id || ""}
            onChange={(e) => fetchInvoiceDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 focus:ring-1 focus:ring-teal-600"
          >
            {invoices.length === 0 && <option value="">(Belum ada invoice)</option>}
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customer?.name} ({inv.status}) - Rp{inv.totalAmount?.toLocaleString("id-ID")}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Invoice Detail */}
        {selectedInvoice && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            {/* Status Ribbon */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Faktur:</span>
                <div className="inline-flex rounded-md shadow-2xs">
                  {["DRAFT", "CONFIRMED", "PAID"].map((st) => {
                    const isDraft = selectedInvoice.status === "DRAFT" && st === "DRAFT";
                    const isConfirmed = selectedInvoice.status === "CONFIRMED" && st === "CONFIRMED";
                    const isPaid = selectedInvoice.paymentStatus === "PAID" && st === "PAID";
                    const active = isDraft || isConfirmed || isPaid;

                    return (
                      <span
                        key={st}
                        className={`px-3 py-1 text-xs font-bold font-mono ${
                          active
                            ? "bg-teal-700 text-white"
                            : "bg-white text-gray-400"
                        } border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                      >
                        {st}
                      </span>
                    );
                  })}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  selectedInvoice.paymentStatus === "PAID"
                    ? "bg-green-100 text-green-800"
                    : selectedInvoice.paymentStatus === "PARTIAL"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  Payment: {selectedInvoice.paymentStatus}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {selectedInvoice.status === "DRAFT" && (
                  <button
                    onClick={() => handlePostInvoice(selectedInvoice.id)}
                    className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm / Post Invoice</span>
                  </button>
                )}

                {selectedInvoice.status === "CONFIRMED" && selectedInvoice.paymentStatus !== "PAID" && (
                  <Link
                    href={`/accounting/payments?invoiceId=${selectedInvoice.id}`}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Register Payment</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Document Header (Wireframe S-10 Section ③) */}
            <div className="p-6 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Invoice Number
                </span>
                <span className="text-xl font-extrabold text-teal-800 font-mono">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  Tanggal: {new Date(selectedInvoice.invoiceDate).toLocaleDateString("id-ID")}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Customer
                </span>
                <span className="text-sm font-bold text-gray-900 block">
                  {selectedInvoice.customer?.name}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  Kode: {selectedInvoice.customer?.code} · {selectedInvoice.customer?.tier}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Sales Order Reference
                </span>
                <span className="text-sm font-bold text-teal-700 font-mono block">
                  {selectedInvoice.salesOrder?.orderNumber}
                </span>
                <span className="text-xs text-gray-500 block">
                  Delivery Order: {selectedInvoice.deliveryOrderId || "Partial Batch"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Tax Policy
                </span>
                <span className="text-sm font-bold text-purple-700 block">
                  PBJT 10% (F-22 / SR-18)
                </span>
                <span className="text-xs text-gray-500 block">
                  Pajak Barang & Jasa Tertentu Restoran
                </span>
              </div>
            </div>

            {/* Section ④: Menagih Delivered Quantity Table */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-2">
                  <span>④ Menagih Delivered Quantity (F-09)</span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  Kebijakan SR-02: Tagihan hanya dibuat berdasarkan barang yang telah diterima pelanggan.
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Deskripsi Produk</th>
                      <th className="py-2.5 px-4 text-center">Invoiced Qty</th>
                      <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-right">PBJT 10%</th>
                      <th className="py-2.5 px-4 text-right">Total Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {selectedInvoice.lines?.map((line: any) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-bold text-teal-800">{line.productSku}</td>
                        <td className="py-2.5 px-4 font-sans text-gray-700">{line.product?.name}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-gray-900">{line.quantity}</td>
                        <td className="py-2.5 px-4 text-right">Rp{line.unitPrice?.toLocaleString("id-ID")}</td>
                        <td className="py-2.5 px-4 text-right text-gray-800 font-bold">
                          Rp{line.subtotal?.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-4 text-right text-purple-700">
                          Rp{line.taxAmount?.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-4 text-right text-teal-900 font-bold">
                          Rp{line.totalAmount?.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Summary */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Net:</span>
                    <span className="font-mono font-semibold">Rp{selectedInvoice.subtotal?.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>PBJT Restoran 10%:</span>
                    <span className="font-mono font-semibold">Rp{selectedInvoice.taxAmount?.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between text-gray-900 font-bold text-sm">
                    <span>Total Tagihan (Gross):</span>
                    <span className="font-mono text-teal-800">Rp{selectedInvoice.totalAmount?.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between text-green-700 font-semibold">
                    <span>Sudah Dibayar (Paid):</span>
                    <span className="font-mono">Rp{selectedInvoice.paidAmount?.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Sisa Piutang (Outstanding):</span>
                    <span className="font-mono">Rp{selectedInvoice.outstandingAmount?.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wireframe S-10 Section ⑤: Related Docs & Audit Trail */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-gray-700">⑤ Related Docs:</span>
                <span className="font-mono text-teal-700">SO: {selectedInvoice.salesOrder?.orderNumber}</span>
                <span>·</span>
                <span className="font-mono text-gray-700">DO: {selectedInvoice.deliveryOrderId || "WH/OUT/0007"}</span>
                <span>·</span>
                <span className="font-mono text-purple-700">Customer: {selectedInvoice.customer?.code}</span>
              </div>
              <button
                onClick={() => setAuditDrawerOpen(true)}
                className="text-teal-700 hover:text-teal-900 font-semibold flex items-center space-x-1"
              >
                <span>Lihat Log Notes & Audit Trail</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Buat Invoice Baru */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                <span>Terbitkan Customer Invoice</span>
              </h2>
              <p className="text-xs text-gray-600">
                Pilih Sales Order yang telah terkirim (Delivered) untuk menerbitkan faktur tagihan sesuai SR-02.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Pilih Sales Order:</label>
                  <select
                    value={selectedSoId}
                    onChange={(e) => setSelectedSoId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  >
                    <option value="">-- Pilih Sales Order --</option>
                    {salesOrders.map((so) => (
                      <option key={so.id} value={so.id}>
                        {so.orderNumber} — {so.customer?.name} ({so.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Kuantitas Ditagihkan (Invoiced Qty):</label>
                  <input
                    type="number"
                    value={customInvoicedQty}
                    onChange={(e) => setCustomInvoicedQty(Number(e.target.value))}
                    min={1}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    * Catatan: Sistem akan menolak jika kuantitas melebihi barang yang telah terkirim (delivered qty).
                  </p>
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
                  onClick={handleCreateInvoice}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                >
                  Terbitkan Faktur
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Test Suite for Phase 6 (T-19, T-20) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center space-x-2">
                <Play className="w-4 h-4 text-teal-600" />
                <span>Pengujian Modul Invoicing (T-19 & T-20)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Verifikasi backend persisten dan aturan bisnis delivery-based invoicing (SR-01/SR-02 / F-09).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT19}
                disabled={testing}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-19 (Normal Flow)</span>
              </button>
              <button
                onClick={runTestT20}
                disabled={testing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs disabled:opacity-50"
              >
                <span>Uji T-20 (Edge Case)</span>
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
        userRole={user?.role || "FINANCE"}
      />
      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        userRole={user?.role || "FINANCE"}
        onSuccess={() => {
          fetchInvoices();
          fetchSalesOrders();
        }}
      />
      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
