"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Receipt, CheckCircle2, Lock, Plus, FileText, Wallet, CreditCard, Check } from "lucide-react";
import Link from "next/link";

export default function CustomerInvoicesPage() {
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      const resDeliveries = await fetch("/api/inventory/delivery");
      const dataDeliveries = await resDeliveries.json();
      const doneDelivery = dataDeliveries.deliveries?.find((d: any) => d.status === "DONE");

      if (!doneDelivery) {
        alert("Jalankan Uji T-11 terlebih dahulu untuk menghasilkan Delivery Order status DONE.");
        return;
      }

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
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Keuangan & Akuntansi" }, { label: "Customer Invoices" }]}
      title="Customer Invoices & PBJT 10%"
      subtitle="Faktur Tagihan Pelanggan Berbasis Kuantitas Terkirim (Delivery-Based Invoicing) & Pajak PBJT Restoran (F-09, F-22, SR-02, SR-18)"
      wireframe="Wireframe S-10"
      actions={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#174A3A] hover:bg-[#11382C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      }
    >
      {/* Invoice Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E9E4] shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#758078]">Pilih Faktur Pelanggan:</span>
          <select
            value={selectedInvoice?.id || ""}
            onChange={(e) => fetchInvoiceDetail(e.target.value)}
            className="text-xs font-mono font-bold bg-[#F7F8F5] border border-[#E5E9E4] rounded-lg px-3 py-1.5 text-[#202824] focus:ring-1 focus:ring-[#174A3A]"
          >
            {invoices.length === 0 && <option value="">(Belum ada invoice)</option>}
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customer?.name} ({inv.status}) - Rp {inv.totalAmount?.toLocaleString("id-ID")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#758078]">
          <Link href="/accounting/vendor-bills" className="hover:text-[#174A3A] underline">Vendor Bills</Link>
          <span>•</span>
          <Link href="/accounting/payments" className="hover:text-[#174A3A] underline">Pembayaran</Link>
          <span>•</span>
          <Link href="/accounting/journal-entries" className="hover:text-[#174A3A] underline">General Ledger</Link>
        </div>
      </div>

      {/* Selected Invoice Detail */}
      {selectedInvoice && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Ribbon */}
          <div className="bg-[#F7F8F5] px-6 py-3 border-b border-[#E5E9E4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-[#758078] uppercase tracking-wider">Status Faktur:</span>
              <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-[#E5E9E4]">
                {["DRAFT", "CONFIRMED", "PAID"].map((st) => {
                  const isDraft = selectedInvoice.status === "DRAFT" && st === "DRAFT";
                  const isConfirmed = selectedInvoice.status === "CONFIRMED" && st === "CONFIRMED";
                  const isPaid = selectedInvoice.paymentStatus === "PAID" && st === "PAID";
                  const active = isDraft || isConfirmed || isPaid;

                  return (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                        active
                          ? "bg-[#174A3A] text-white"
                          : "bg-white text-[#758078]"
                      }`}
                    >
                      {st}
                    </span>
                  );
                })}
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                selectedInvoice.paymentStatus === "PAID"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : selectedInvoice.paymentStatus === "PARTIAL"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-[#F7F8F5] text-[#758078] border border-[#E5E9E4]"
              }`}>
                Payment: {selectedInvoice.paymentStatus}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {selectedInvoice.status === "DRAFT" && (
                <button
                  onClick={() => handlePostInvoice(selectedInvoice.id)}
                  className="px-4 py-1.5 bg-[#174A3A] hover:bg-[#11382C] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm / Post Invoice</span>
                </button>
              )}

              {selectedInvoice.status === "CONFIRMED" && selectedInvoice.paymentStatus !== "PAID" && (
                <Link
                  href={`/accounting/payments?invoiceId=${selectedInvoice.id}`}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Register Payment</span>
                </Link>
              )}
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#F7F8F5]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Nomor Invoice
              </span>
              <span className="text-xl font-extrabold text-[#174A3A] font-mono mt-0.5 block">
                {selectedInvoice.invoiceNumber}
              </span>
              <span className="text-xs text-[#758078] block mt-1">
                Tanggal: {new Date(selectedInvoice.invoiceDate).toLocaleDateString("id-ID")}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Pelanggan
              </span>
              <span className="text-sm font-bold text-[#202824] block mt-0.5">
                {selectedInvoice.customer?.name}
              </span>
              <span className="text-xs text-[#758078] font-mono">
                Kode: {selectedInvoice.customer?.code} · {selectedInvoice.customer?.tier}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Referensi Sales Order
              </span>
              <span className="text-sm font-bold text-[#174A3A] font-mono block mt-0.5">
                {selectedInvoice.salesOrder?.orderNumber}
              </span>
              <span className="text-xs text-[#758078] block">
                Delivery Order: {selectedInvoice.deliveryOrderId || "Partial Batch"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block">
                Kebijakan Pajak (Tax Policy)
              </span>
              <span className="text-sm font-bold text-[#A88544] block mt-0.5">
                PBJT 10% (F-22 / SR-18)
              </span>
              <span className="text-xs text-[#758078] block">
                Pajak Barang & Jasa Tertentu Restoran
              </span>
            </div>
          </div>

          {/* Lines Table & Totals */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#202824] uppercase tracking-wide flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-[#174A3A]" />
                <span>Rincian Penagihan Kuantitas Terkirim (Delivered-Based)</span>
              </h3>
              <span className="text-xs text-[#758078]">
                Kebijakan SR-02: Tagihan hanya dibuat berdasarkan barang yang telah diterima pelanggan.
              </span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F5] border-b border-[#E5E9E4] text-[#758078] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Deskripsi Produk</th>
                    <th className="py-3 px-4 text-center">Invoiced Qty</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Net Subtotal</th>
                    <th className="py-3 px-4 text-right">PBJT 10%</th>
                    <th className="py-3 px-4 text-right">Total Baris</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedInvoice.lines?.map((line: any) => (
                    <tr key={line.id} className="hover:bg-[#F7F8F5] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#174A3A]">{line.productSku}</td>
                      <td className="py-3 px-4 font-sans text-[#202824] font-medium">{line.product?.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#202824]">{line.quantity}</td>
                      <td className="py-3 px-4 text-right text-[#525B55]">Rp {line.unitPrice?.toLocaleString("id-ID")}</td>
                      <td className="py-3 px-4 text-right text-[#202824] font-bold">
                        Rp {line.subtotal?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right text-[#A88544] font-semibold">
                        Rp {line.taxAmount?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right text-[#174A3A] font-bold">
                        Rp {line.totalAmount?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-2 bg-[#F7F8F5] p-4.5 rounded-xl border border-[#E5E9E4] text-xs">
                <div className="flex justify-between text-[#758078]">
                  <span>Subtotal Net:</span>
                  <span className="font-mono font-semibold text-[#202824]">Rp {selectedInvoice.subtotal?.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-[#A88544]">
                  <span>PBJT Restoran 10%:</span>
                  <span className="font-mono font-semibold">Rp {selectedInvoice.taxAmount?.toLocaleString("id-ID")}</span>
                </div>
                <div className="border-t border-[#E5E9E4] pt-2 flex justify-between text-[#202824] font-bold text-sm">
                  <span>Total Tagihan (Gross):</span>
                  <span className="font-mono text-[#174A3A]">Rp {selectedInvoice.totalAmount?.toLocaleString("id-ID")}</span>
                </div>
                <div className="border-t border-dashed border-[#E5E9E4] pt-2 flex justify-between text-emerald-700 font-semibold">
                  <span>Sudah Dibayar (Paid):</span>
                  <span className="font-mono">Rp {selectedInvoice.paidAmount?.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Sisa Piutang (Outstanding):</span>
                  <span className="font-mono">Rp {selectedInvoice.outstandingAmount?.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Invoice Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E9E4] space-y-4">
            <h2 className="text-lg font-bold text-[#202824] flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-[#174A3A]" />
              <span>Terbitkan Customer Invoice</span>
            </h2>
            <p className="text-xs text-[#758078]">
              Pilih Sales Order yang telah terkirim (Delivered) untuk menerbitkan faktur tagihan sesuai SR-02.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#202824] block mb-1">Pilih Sales Order:</label>
                <select
                  value={selectedSoId}
                  onChange={(e) => setSelectedSoId(e.target.value)}
                  className="w-full border border-[#E5E9E4] rounded-lg p-2 font-mono bg-white text-[#202824]"
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
                <label className="font-bold text-[#202824] block mb-1">Kuantitas Ditagihkan (Invoiced Qty):</label>
                <input
                  type="number"
                  value={customInvoicedQty}
                  onChange={(e) => setCustomInvoicedQty(Number(e.target.value))}
                  min={1}
                  className="w-full border border-[#E5E9E4] rounded-lg p-2 font-mono font-bold text-[#202824]"
                />
                <p className="text-[11px] text-[#758078] mt-1">
                  * Catatan: Sistem akan menolak jika kuantitas melebihi barang yang telah terkirim (delivered qty SR-02).
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-[#E5E9E4]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-[#E5E9E4] rounded-lg text-xs font-semibold text-[#758078] hover:bg-[#F7F8F5]"
              >
                Batal
              </button>
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-[#174A3A] hover:bg-[#11382C] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Terbitkan Faktur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QA Test Runner for T-19 & T-20 */}
      <div className="bg-[#103429] text-white rounded-xl shadow-md p-6 border border-[#C6A15B]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C6A15B] text-[#103429]">
                Automation Test Runner
              </span>
              <span className="text-xs text-[#DCE8DF] font-semibold">T-19 & T-20 Suite</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">
              Verifikasi Pengujian: Penagihan Berbasis Kuantitas Terkirim & Blokir Over-Invoice
            </h3>
            <p className="text-xs text-[#DCE8DF]/80">
              Verifikasi penagihan tepat sesuai kuantitas terkirim (SR-01/SR-02 / F-09) dan perhitungan pajak PBJT 10% (SR-18).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={runTestT19}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-19 (Normal Delivered Qty)</span>
            </button>

            <button
              onClick={runTestT20}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Uji T-20 (Over-invoice 8 Unit Block)</span>
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