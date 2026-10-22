import { prisma } from "./prisma";
import { getNextSequence } from "./sequences";
import { logAudit } from "./audit";
import { InspectionStatus, Role } from "@prisma/client";

export interface CreateReturnRequestInput {
  invoiceId: string;
  lines: Array<{
    productSku: string;
    returnedQty: number;
  }>;
  actor: {
    id?: string;
    name: string;
    role: Role | string;
  };
}

export interface InspectReturnLineInput {
  productSku: string;
  acceptedQty: number;
  rejectedQty: number;
  notes?: string;
}

/**
 * 1. Buat Permintaan Retur Penjualan (S-15 / F-18)
 */
export async function createReturnRequest(input: CreateReturnRequestInput) {
  const { invoiceId, lines, actor } = input;

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, customer: true },
    });

    if (!invoice) {
      throw new Error(`Customer Invoice dengan ID ${invoiceId} tidak ditemukan.`);
    }

    if (!lines || lines.length === 0) {
      throw new Error("Baris barang retur tidak boleh kosong.");
    }

    const returnNumber = await getNextSequence("RET", tx);
    const returnLinesData = [];

    for (const item of lines) {
      if (item.returnedQty <= 0) {
        throw new Error(`Kuantitas retur SKU ${item.productSku} harus lebih besar dari 0.`);
      }

      const invLine = invoice.lines.find((l) => l.productSku === item.productSku);
      if (!invLine) {
        throw new Error(`SKU ${item.productSku} tidak terdapat pada invoice ${invoice.invoiceNumber}.`);
      }

      if (item.returnedQty > invLine.quantity) {
        throw new Error(
          `Kuantitas retur (${item.returnedQty}) melebihi kuantitas pada faktur (${invLine.quantity}).`
        );
      }

      const product = await tx.productVariant.findUnique({
        where: { sku: item.productSku },
      });

      if (!product) {
        throw new Error(`Produk dengan SKU ${item.productSku} tidak ditemukan.`);
      }

      returnLinesData.push({
        productSku: item.productSku,
        returnedQty: item.returnedQty,
        acceptedQty: 0,
        rejectedQty: 0,
        unitSalesPrice: invLine.unitPrice,
        unitStandardCost: product.standardCost,
      });
    }

    const returnReq = await tx.returnRequest.create({
      data: {
        returnNumber,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        status: "DRAFT",
        inspectionStatus: InspectionStatus.PENDING,
        lines: {
          create: returnLinesData,
        },
      },
      include: {
        lines: { include: { product: true } },
        customer: true,
        invoice: true,
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "CREATE_RETURN_REQUEST",
      documentType: "RETURN_REQUEST",
      documentId: returnReq.id,
      documentNumber: returnReq.returnNumber,
      notes: `Permintaan retur ${returnNumber} dibuat untuk invoice ${invoice.invoiceNumber} (${invoice.customer.name}).`,
      afterData: returnReq,
      tx,
    });

    return returnReq;
  });
}

/**
 * 2. Lakukan Pemeriksaan Kualitas Barang Retur (Warehouse Inspection / SR-11)
 */
export async function inspectReturnRequest(
  returnRequestId: string,
  inspections: InspectReturnLineInput[],
  actor: { id?: string; name: string; role: Role | string }
) {
  return await prisma.$transaction(async (tx) => {
    const returnReq = await tx.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { lines: true },
    });

    if (!returnReq) {
      throw new Error(`Permintaan retur ${returnRequestId} tidak ditemukan.`);
    }

    let allAccepted = true;
    let anyAccepted = false;

    for (const insp of inspections) {
      const line = returnReq.lines.find((l) => l.productSku === insp.productSku);
      if (!line) {
        throw new Error(`Item ${insp.productSku} tidak ada dalam permintaan retur.`);
      }

      if (insp.acceptedQty + insp.rejectedQty !== line.returnedQty) {
        throw new Error(
          `Jumlah diterima (${insp.acceptedQty}) + ditolak (${insp.rejectedQty}) harus sama dengan kuantitas retur (${line.returnedQty}) untuk ${insp.productSku}.`
        );
      }

      await tx.returnRequestLine.update({
        where: { id: line.id },
        data: {
          acceptedQty: insp.acceptedQty,
          rejectedQty: insp.rejectedQty,
          inspectionNotes: insp.notes || null,
        },
      });

      if (insp.acceptedQty > 0) anyAccepted = true;
      if (insp.rejectedQty > 0) allAccepted = false;
    }

    const overallStatus: InspectionStatus = allAccepted && anyAccepted
      ? InspectionStatus.ACCEPTED
      : anyAccepted
      ? InspectionStatus.ACCEPTED // partially accepted treated as accepted for the accepted portion
      : InspectionStatus.REJECTED;

    const updated = await tx.returnRequest.update({
      where: { id: returnReq.id },
      data: {
        inspectionStatus: overallStatus,
        status: overallStatus === InspectionStatus.REJECTED ? "REJECTED" : "CONFIRMED",
      },
      include: {
        lines: { include: { product: true } },
        customer: true,
        invoice: true,
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "INSPECT_RETURN_REQUEST",
      documentType: "RETURN_REQUEST",
      documentId: updated.id,
      documentNumber: updated.returnNumber,
      notes: `Inspeksi kualitas barang retur selesai. Status inspeksi: ${overallStatus}.`,
      beforeData: returnReq,
      afterData: updated,
      tx,
    });

    return updated;
  });
}

/**
 * 3. Eksekusi Restock dan Penerbitan Credit Note (SR-11 / T-29 / T-30)
 */
export async function processReturnAndCreditNote(
  returnRequestId: string,
  actor: { id?: string; name: string; role: Role | string }
) {
  return await prisma.$transaction(async (tx) => {
    const returnReq = await tx.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        lines: { include: { product: true } },
        customer: true,
        invoice: true,
        creditNotes: true,
      },
    });

    if (!returnReq) {
      throw new Error(`Permintaan retur ${returnRequestId} tidak ditemukan.`);
    }

    // SR-13: Idempotensi
    if (returnReq.status === "DONE" && returnReq.creditNotes.length > 0) {
      return {
        success: true,
        alreadyProcessed: true,
        message: `Retur ${returnReq.returnNumber} sudah diproses dan Credit Note ${returnReq.creditNotes[0].creditNoteNumber} sudah terbit.`,
        creditNote: returnReq.creditNotes[0],
      };
    }

    // SR-11 / T-30: Pemeriksaan Kualitas Wajib ACCEPTED
    if (returnReq.inspectionStatus !== InspectionStatus.ACCEPTED) {
      throw new Error(
        `Validasi Retur Gagal (SR-11 / T-30): Barang retur belum lolos pemeriksaan kualitas (Status saat ini: ${returnReq.inspectionStatus}). Restok persediaan dan penerbitan Credit Note diblokir.`
      );
    }

    const acceptedLines = returnReq.lines.filter((l) => l.acceptedQty > 0);
    if (acceptedLines.length === 0) {
      throw new Error("Tidak ada kuantitas barang yang lolos inspeksi penerimaan retur.");
    }

    let totalCreditNet = 0;
    let totalCreditPbjt = 0;
    let totalCreditGross = 0;
    let totalCostReversed = 0;
    const creditNoteLinesData = [];

    // 1. Kembalikan stok ke WH-JKT & hitung nilai pembalikan
    for (const line of acceptedLines) {
      // Tambah stok fisik on-hand di WH-JKT (T-29)
      await tx.stockLevel.update({
        where: {
          productSku_locationCode: {
            productSku: line.productSku,
            locationCode: "WH-JKT",
          },
        },
        data: {
          onHand: { increment: line.acceptedQty },
        },
      });

      const netLine = line.acceptedQty * line.unitSalesPrice;
      const pbjtLine = Math.round(netLine * 0.1); // SR-18
      const grossLine = netLine + pbjtLine;
      const costLine = line.acceptedQty * line.unitStandardCost;

      totalCreditNet += netLine;
      totalCreditPbjt += pbjtLine;
      totalCreditGross += grossLine;
      totalCostReversed += costLine;

      creditNoteLinesData.push({
        productSku: line.productSku,
        quantity: line.acceptedQty,
        unitPrice: line.unitSalesPrice,
        netPrice: netLine,
        pbjtAmount: pbjtLine,
        totalAmount: grossLine,
        standardCost: line.unitStandardCost,
      });
    }

    // 2. Buat Credit Note Document (RINV/2026/0007)
    const creditNoteNumber = await getNextSequence("RINV", tx);
    const creditNote = await tx.creditNote.create({
      data: {
        creditNoteNumber,
        returnRequestId: returnReq.id,
        customerId: returnReq.customerId,
        status: "POSTED",
        subtotalNet: totalCreditNet,
        pbjtTax: totalCreditPbjt,
        totalGross: totalCreditGross,
        isPosted: true,
        lines: {
          create: creditNoteLinesData,
        },
      },
      include: {
        lines: { include: { product: true } },
      },
    });

    // 3. Jurnal Pembalikan Akuntansi Ganda Seimbang (SR-11 / T-29)
    // A. Reversal HPP & Persediaan: Dr 1030 Persediaan Rp26.000 / Cr 5010 HPP Rp26.000
    // B. Reversal Pendapatan & Piutang: Dr 4010 Pendapatan Rp48.000 + Dr 2020 PBJT Rp4.800 = Cr 1020 A/R Rp52.800
    const entryNumStock = await getNextSequence("JE", tx);
    const journalEntryStock = await tx.journalEntry.create({
      data: {
        entryNumber: entryNumStock,
        sourceDocument: returnReq.returnNumber,
        documentRef: `RET_STOCK_${returnReq.returnNumber}`,
        journalType: "INVENTORY",
        state: "POSTED",
        notes: `Pengembalian Persediaan Masuk Retur ${returnReq.returnNumber}`,
        items: {
          create: [
            {
              accountCode: "1030",
              label: `Pengembalian Persediaan Masuk Retur ${returnReq.returnNumber}`,
              debit: totalCostReversed,
              credit: 0,
            },
            {
              accountCode: "5010",
              label: `Pembalikan Beban Pokok Pendapatan (HPP) Retur ${returnReq.returnNumber}`,
              debit: 0,
              credit: totalCostReversed,
            },
          ],
        },
      },
      include: { items: { include: { account: true } } },
    });

    const entryNumCredit = await getNextSequence("JE", tx);
    const journalEntryCredit = await tx.journalEntry.create({
      data: {
        entryNumber: entryNumCredit,
        sourceDocument: creditNote.creditNoteNumber,
        documentRef: `RINV_${creditNote.creditNoteNumber}`,
        journalType: "SALES",
        state: "POSTED",
        notes: `Pembalikan Pendapatan & Piutang Credit Note ${creditNote.creditNoteNumber}`,
        items: {
          create: [
            {
              accountCode: "4010",
              label: `Pembalikan Pendapatan Penjualan Credit Note ${creditNote.creditNoteNumber}`,
              debit: totalCreditNet,
              credit: 0,
            },
            {
              accountCode: "2020",
              label: `Pembalikan Utang Pajak PBJT 10% Credit Note ${creditNote.creditNoteNumber}`,
              debit: totalCreditPbjt,
              credit: 0,
            },
            {
              accountCode: "1020",
              label: `Pengurangan Piutang Dagang (A/R) Credit Note ${creditNote.creditNoteNumber}`,
              debit: 0,
              credit: totalCreditGross,
              partnerId: returnReq.customerId,
            },
          ],
        },
      },
      include: { items: { include: { account: true } } },
    });

    // Update CoA balances
    await tx.account.update({ where: { code: "1030" }, data: { currentBalance: { increment: totalCostReversed } } });
    await tx.account.update({ where: { code: "5010" }, data: { currentBalance: { decrement: totalCostReversed } } });
    await tx.account.update({ where: { code: "4010" }, data: { currentBalance: { decrement: totalCreditNet } } });
    await tx.account.update({ where: { code: "2020" }, data: { currentBalance: { decrement: totalCreditPbjt } } });
    await tx.account.update({ where: { code: "1020" }, data: { currentBalance: { decrement: totalCreditGross } } });

    // 4. Update Outstanding Saldo Invoice Pelanggan
    if (returnReq.invoice) {
      const newOutstanding = Math.max(0, returnReq.invoice.outstandingAmount - totalCreditGross);
      await tx.customerInvoice.update({
        where: { id: returnReq.invoiceId },
        data: {
          outstandingAmount: newOutstanding,
          status: newOutstanding === 0 ? "PAID" : returnReq.invoice.status,
        },
      });
    }

    // 5. Update Status Return Request menjadi DONE
    const updatedReturn = await tx.returnRequest.update({
      where: { id: returnReq.id },
      data: {
        status: "DONE",
      },
      include: {
        lines: { include: { product: true } },
        customer: true,
        invoice: true,
        creditNotes: true,
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "PROCESS_RETURN_AND_CREDIT_NOTE",
      documentType: "CREDIT_NOTE",
      documentId: creditNote.id,
      documentNumber: creditNote.creditNoteNumber,
      notes: `Credit Note ${creditNote.creditNoteNumber} berhasil diterbitkan senilai Rp ${totalCreditGross.toLocaleString("id-ID")}. Stok WH-JKT bertambah dan jurnal pembalikan tercatat.`,
      afterData: creditNote,
      tx,
    });

    return {
      success: true,
      returnRequest: updatedReturn,
      creditNote,
      journalEntryStock,
      journalEntryCredit,
      financials: {
        totalCostReversed,
        totalCreditNet,
        totalCreditPbjt,
        totalCreditGross,
      },
    };
  });
}
