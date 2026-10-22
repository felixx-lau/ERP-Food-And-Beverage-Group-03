import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { recordAuditLog } from "./audit";
import { getNextSequence } from "./sequences";

export interface InvoiceLineInput {
  productSku: string;
  quantity: number;
  unitPrice?: number;
}

export async function createCustomerInvoice(params: {
  salesOrderId: string;
  deliveryOrderId?: string;
  lines: InvoiceLineInput[];
  actor: { id: string; name: string; role: Role };
}) {
  const { salesOrderId, deliveryOrderId, lines: lineInputs, actor } = params;

  // Role check: FINANCE or OWNER (SR-15)
  if (actor.role !== Role.FINANCE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Finance atau Owner yang berwenang membuat Customer Invoice.");
  }

  const order = await prisma.salesOrder.findFirst({
    where: { OR: [{ id: salesOrderId }, { orderNumber: salesOrderId }] },
    include: {
      lines: { include: { product: true } },
      deliveryOrders: { include: { lines: true } },
      invoices: { include: { lines: true } },
      contact: true,
    },
  });

  if (!order) throw new Error("Sales Order tidak ditemukan.");

  // SR-01 vs SR-02 & F-09: DELIVERY-BASED INVOICING VALIDATION (T-19, T-20)
  // Max billable quantity is strictly based on VALIDATED DELIVERED quantity, minus already invoiced
  let subtotalNet = 0;
  let pbjtTax = 0;
  let totalGross = 0;

  const processedLines: Array<{
    productSku: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    netPrice: number;
    pbjtAmount: number;
    totalAmount: number;
  }> = [];

  for (const item of lineInputs) {
    const soLine = order.lines.find((l) => l.productSku === item.productSku);
    if (!soLine) throw new Error(`Produk ${item.productSku} tidak ada di Sales Order ${order.orderNumber}.`);

    // Sum already invoiced quantity across all non-cancelled invoices
    let alreadyInvoiced = 0;
    for (const inv of order.invoices) {
      if (inv.status !== "CANCELLED") {
        const invLine = inv.lines.find((l) => l.productSku === item.productSku);
        if (invLine) alreadyInvoiced += invLine.quantity;
      }
    }

    const deliveredQty = soLine.deliveredQty;
    const maxBillable = Math.max(0, deliveredQty - alreadyInvoiced);

    // SR-02 / T-20: Block attempt to invoice un-delivered units
    if (item.quantity > maxBillable) {
      throw new Error(
        `Validasi Penagihan Gagal (SR-02 / F-09 / T-20): Kuantitas tagihan (${item.quantity}) melebihi kuantitas yang telah dikirim (Delivered: ${deliveredQty}, Sudah Ditagih: ${alreadyInvoiced}, Maksimal Boleh Ditagih: ${maxBillable}). Penagihan barang yang belum dikirim dilarang.`
      );
    }

    const price = item.unitPrice !== undefined ? item.unitPrice : soLine.unitPrice;
    const discount = soLine.discountPercent || 0;
    const net = Math.round(item.quantity * price * (1 - discount / 100));
    const pbjt = Math.round(net * 0.1); // PBJT 10% round half-up per baris
    const lineTotal = net + pbjt;

    subtotalNet += net;
    pbjtTax += pbjt;
    totalGross += lineTotal;

    processedLines.push({
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: price,
      discountPercent: discount,
      netPrice: net,
      pbjtAmount: pbjt,
      totalAmount: lineTotal,
    });
  }

  const invoiceNumber = await getNextSequence("INV");

  const invoice = await prisma.customerInvoice.create({
    data: {
      invoiceNumber,
      salesOrderId: order.id,
      deliveryOrderId: deliveryOrderId || order.deliveryOrders[0]?.id || null,
      customerId: order.contactId,
      status: "DRAFT",
      subtotalNet,
      pbjtTax,
      totalGross,
      outstandingAmount: totalGross,
      paidAmount: 0,
      lines: {
        create: processedLines.map((l) => ({
          productSku: l.productSku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          netPrice: l.netPrice,
          pbjtAmount: l.pbjtAmount,
          totalAmount: l.totalAmount,
        })),
      },
    },
    include: {
      lines: { include: { product: true } },
      customer: true,
      salesOrder: true,
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CREATE_CUSTOMER_INVOICE",
    documentType: "CUSTOMER_INVOICE",
    documentId: invoice.invoiceNumber,
    notes: `Draft Invoice ${invoice.invoiceNumber} dibuat untuk SO ${order.orderNumber} (Gross: Rp ${totalGross.toLocaleString("id-ID")}).`,
  });

  return invoice;
}

export async function postCustomerInvoice(invoiceId: string, actor: { id: string; name: string; role: Role }) {
  // Role check: FINANCE or OWNER (SR-15)
  if (actor.role !== Role.FINANCE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Finance atau Owner yang berwenang memposting Customer Invoice.");
  }

  const invoice = await prisma.customerInvoice.findFirst({
    where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
    include: {
      lines: true,
      salesOrder: {
        include: { lines: true },
      },
      customer: true,
    },
  });

  if (!invoice) throw new Error("Customer Invoice tidak ditemukan.");

  // Idempotency check (SR-13 / T-26):
  if (invoice.status === "POSTED" || invoice.isPosted) {
    return {
      invoice,
      message: "Customer Invoice sudah diposting sebelumnya (idempotent). Tidak ada duplikasi jurnal.",
      alreadyPosted: true,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update invoice status to POSTED
    const postedInvoice = await tx.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "POSTED",
        isPosted: true,
        postedAt: new Date(),
      },
      include: { lines: true, customer: true },
    });

    // 2. Update SO line invoicedQty
    for (const invLine of invoice.lines) {
      const soLine = invoice.salesOrder.lines.find((l) => l.productSku === invLine.productSku);
      if (soLine) {
        await tx.salesOrderLine.update({
          where: { id: soLine.id },
          data: { invoicedQty: { increment: invLine.quantity } },
        });
      }
    }

    // 3. Create Balanced General Ledger Entry (T-19, T-25):
    // Dr 1020 Accounts Receivable: Rp264.000
    // Cr 4010 Sales Revenue: Rp240.000
    // Cr 2020 PBJT Payable: Rp24.000
    // Balanced Dr = Cr = Rp264.000!
    const jeNumber = await getNextSequence("JE");
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: jeNumber,
        sourceDocument: invoice.invoiceNumber,
        documentRef: `INV_${invoice.invoiceNumber}`,
        journalType: "SALES",
        state: "POSTED",
        notes: `Customer Invoice ${invoice.invoiceNumber} for SO ${invoice.salesOrder.orderNumber}`,
        items: {
          create: [
            {
              accountCode: "1020",
              label: `A/R: ${invoice.customer.name} (${invoice.invoiceNumber})`,
              debit: invoice.totalGross,
              credit: 0,
              partnerId: invoice.customerId,
            },
            {
              accountCode: "4010",
              label: `Sales Revenue: ${invoice.invoiceNumber}`,
              debit: 0,
              credit: invoice.subtotalNet,
            },
            {
              accountCode: "2020",
              label: `PBJT F&B 10%: ${invoice.invoiceNumber}`,
              debit: 0,
              credit: invoice.pbjtTax,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 4. Update CoA account balances
    await tx.account.update({
      where: { code: "1020" },
      data: { currentBalance: { increment: invoice.totalGross } },
    });
    await tx.account.update({
      where: { code: "4010" },
      data: { currentBalance: { increment: invoice.subtotalNet } },
    });
    await tx.account.update({
      where: { code: "2020" },
      data: { currentBalance: { increment: invoice.pbjtTax } },
    });

    return { postedInvoice, journalEntry };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "POST_CUSTOMER_INVOICE",
    documentType: "CUSTOMER_INVOICE",
    documentId: invoice.invoiceNumber,
    afterState: {
      status: "POSTED",
      journalEntry: result.journalEntry.entryNumber,
      totalGross: invoice.totalGross,
    },
    notes: `Customer Invoice ${invoice.invoiceNumber} diposting. Jurnal ${result.journalEntry.entryNumber}: Dr A/R Rp ${invoice.totalGross.toLocaleString("id-ID")} = Cr Revenue Rp ${invoice.subtotalNet.toLocaleString("id-ID")} + Cr PBJT Rp ${invoice.pbjtTax.toLocaleString("id-ID")}. Total Dr=Cr seimbang.`,
  });

  return {
    invoice: result.postedInvoice,
    journalEntry: result.journalEntry,
    message: "Customer Invoice berhasil diposting. Jurnal seimbang tercatat.",
    alreadyPosted: false,
  };
}

export async function registerCustomerPayment(params: {
  invoiceId: string;
  paymentMethod: string; // BANK, CASH, QRIS
  amount: number;
  paymentDate?: Date;
  notes?: string;
  actor: { id: string; name: string; role: Role };
}) {
  const { invoiceId, paymentMethod, amount, paymentDate, notes, actor } = params;

  // Role check: FINANCE or OWNER (SR-15)
  if (actor.role !== Role.FINANCE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Finance atau Owner yang berwenang meregister pembayaran.");
  }

  const invoice = await prisma.customerInvoice.findFirst({
    where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
    include: { customer: true },
  });

  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status !== "POSTED") {
    throw new Error("Hanya invoice yang sudah berstatus Posted yang dapat menerima pembayaran.");
  }

  // SR-19 / T-24: OVERPAYMENT PROTECTION GUARD
  // Payments exceeding outstanding MUST be rejected
  if (amount > invoice.outstandingAmount) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "OVERPAYMENT_REJECTED",
      documentType: "CUSTOMER_INVOICE",
      documentId: invoice.invoiceNumber,
      notes: `Percobaan bayar Rp ${amount.toLocaleString("id-ID")} melebihi sisa tagihan Rp ${invoice.outstandingAmount.toLocaleString("id-ID")} ditolak (SR-19).`,
    });

    throw new Error(
      `Validasi Pembayaran Gagal (SR-19 / F-15 / T-24): Jumlah pembayaran (Rp ${amount.toLocaleString("id-ID")}) melebihi sisa tagihan outstanding (Rp ${invoice.outstandingAmount.toLocaleString("id-ID")}). Pembayaran melebihi outstanding ditolak.`
    );
  }

  if (amount <= 0) {
    throw new Error("Jumlah pembayaran harus lebih besar dari Rp 0.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Calculate new paid and outstanding amounts (T-23)
    const newPaidAmount = invoice.paidAmount + amount;
    const newOutstanding = Math.max(0, invoice.outstandingAmount - amount);
    const newStatus = newOutstanding === 0 ? "PAID" : "POSTED";

    const updatedInvoice = await tx.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        status: newStatus,
      },
    });

    // 2. Create Payment Record
    const paymentNumber = `PAY/2026/${Date.now().toString().slice(-4)}`;
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        paymentType: "CUSTOMER_INBOUND",
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentMethod: paymentMethod || "BANK",
        amount,
        paymentDate: paymentDate || new Date(),
        notes: notes || `Payment for Invoice ${invoice.invoiceNumber}`,
      },
    });

    // 3. Create Balanced General Ledger Entry (T-23):
    // Dr 1010 Bank: Rp100.000
    // Cr 1020 Accounts Receivable: Rp100.000
    const jeNumber = await getNextSequence("JE");
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: jeNumber,
        sourceDocument: payment.paymentNumber,
        documentRef: `PAY_${payment.paymentNumber}`,
        journalType: "BANK",
        state: "POSTED",
        notes: `Customer Payment for Invoice ${invoice.invoiceNumber} via ${paymentMethod}`,
        items: {
          create: [
            {
              accountCode: "1010",
              label: `Bank Inbound: ${payment.paymentNumber}`,
              debit: amount,
              credit: 0,
            },
            {
              accountCode: "1020",
              label: `A/R Settlement: ${invoice.customer.name}`,
              debit: 0,
              credit: amount,
              partnerId: invoice.customerId,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 4. Update CoA balances
    await tx.account.update({
      where: { code: "1010" },
      data: { currentBalance: { increment: amount } },
    });
    await tx.account.update({
      where: { code: "1020" },
      data: { currentBalance: { decrement: amount } },
    });

    return { updatedInvoice, payment, journalEntry, newOutstanding };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "REGISTER_PAYMENT",
    documentType: "PAYMENT",
    documentId: result.payment.paymentNumber,
    afterState: {
      amount,
      outstandingRemaining: result.newOutstanding,
      invoiceNumber: invoice.invoiceNumber,
      journalEntry: result.journalEntry.entryNumber,
    },
    notes: `Pembayaran ${result.payment.paymentNumber} sebesar Rp ${amount.toLocaleString("id-ID")} diterima via ${paymentMethod}. Sisa outstanding invoice: Rp ${result.newOutstanding.toLocaleString("id-ID")}.`,
  });

  return result;
}
