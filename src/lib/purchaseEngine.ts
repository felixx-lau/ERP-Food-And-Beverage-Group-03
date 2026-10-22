import { prisma } from "./prisma";
import { OrderStatus, Role } from "@prisma/client";
import { recordAuditLog } from "./audit";
import { getNextSequence } from "./sequences";

export interface PurchaseLineInput {
  productSku: string;
  orderedQty: number;
  unitPrice?: number;
}

export async function createPurchaseQuotation(params: {
  vendorId: string;
  lines: PurchaseLineInput[];
  scheduledDate?: Date;
  actor: { id: string; name: string; role: Role };
}) {
  const { vendorId, lines: lineInputs, actor } = params;

  // Role check: PROCUREMENT or OWNER
  if (actor.role !== Role.PROCUREMENT && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Procurement atau Owner yang dapat membuat RFQ / PO.");
  }

  const vendor = await prisma.contact.findUnique({
    where: { id: vendorId },
  });
  if (!vendor || vendor.type !== "VENDOR") {
    throw new Error(`Vendor ${vendorId} tidak ditemukan.`);
  }

  const skus = lineInputs.map((l) => l.productSku);
  const products = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
  });
  const productMap = new Map(products.map((p) => [p.sku, p]));

  let subtotal = 0;
  const processedLines = lineInputs.map((item) => {
    const prod = productMap.get(item.productSku);
    if (!prod) throw new Error(`Produk ${item.productSku} tidak ditemukan.`);

    // Use vendor price or standard cost as default
    const price = item.unitPrice !== undefined ? item.unitPrice : prod.standardCost;
    const lineSubtotal = item.orderedQty * price;
    subtotal += lineSubtotal;

    return {
      productSku: item.productSku,
      orderedQty: item.orderedQty,
      unitPrice: price,
      subtotal: lineSubtotal,
    };
  });

  // Halaman 7 PDF: Vendor fixture tax 0%
  const taxAmount = 0;
  const total = subtotal + taxAmount;
  const poNumber = await getNextSequence("PO");

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendorId,
      status: OrderStatus.DRAFT,
      scheduledDate: params.scheduledDate || new Date(),
      subtotal,
      taxAmount,
      total,
      lines: {
        create: processedLines.map((l) => ({
          productSku: l.productSku,
          orderedQty: l.orderedQty,
          unitPrice: l.unitPrice,
          subtotal: l.subtotal,
          receivedQty: 0,
          billedQty: 0,
        })),
      },
    },
    include: {
      lines: { include: { product: true } },
      vendor: true,
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CREATE_RFQ",
    documentType: "PO",
    documentId: purchaseOrder.poNumber,
    notes: `RFQ ${purchaseOrder.poNumber} dibuat untuk vendor ${vendor.name}. Total: Rp ${total.toLocaleString("id-ID")}`,
  });

  return purchaseOrder;
}

export async function confirmPurchaseOrder(poId: string, actor: { id: string; name: string; role: Role }) {
  // Role check: PROCUREMENT or OWNER
  if (actor.role !== Role.PROCUREMENT && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Procurement atau Owner yang dapat mengonfirmasi Purchase Order.");
  }

  const po = await prisma.purchaseOrder.findFirst({
    where: { OR: [{ id: poId }, { poNumber: poId }] },
    include: { lines: true, receipts: true },
  });

  if (!po) throw new Error("Purchase Order tidak ditemukan.");

  // Idempotency Check (SR-13 / T-16):
  // If already confirmed, do not create duplicate receipt or commit twice
  if (po.status === OrderStatus.CONFIRMED || po.status === OrderStatus.DONE) {
    return {
      purchaseOrder: po,
      receipt: po.receipts[0] || null,
      message: "Purchase Order sudah dikonfirmasi sebelumnya (idempotent). Tidak ada duplikasi dokumen.",
      alreadyConfirmed: true,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update PO status to CONFIRMED
    const updatedPo = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: OrderStatus.CONFIRMED },
      include: { lines: true, vendor: true },
    });

    // 2. Create GoodsReceipt in DRAFT status
    const receiptNumber = await getNextSequence("RECEIPT");
    const receipt = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        purchaseOrderId: po.id,
        destLocation: "WH-JKT",
        status: "DRAFT",
        lines: {
          create: po.lines.map((l) => ({
            productSku: l.productSku,
            demandQty: l.orderedQty,
            acceptedQty: 0,
            rejectedQty: 0,
          })),
        },
      },
      include: { lines: true },
    });

    return { updatedPo, receipt };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CONFIRM_PO",
    documentType: "PO",
    documentId: po.poNumber,
    afterState: {
      status: "CONFIRMED",
      receiptNumber: result.receipt.receiptNumber,
      total: po.total,
    },
    notes: `Purchase Order ${po.poNumber} dikonfirmasi. Penerimaan barang ${result.receipt.receiptNumber} disiapkan. On-hand stok fisik tidak berubah.`,
  });

  return {
    purchaseOrder: result.updatedPo,
    receipt: result.receipt,
    message: "Purchase Order berhasil dikonfirmasi.",
    alreadyConfirmed: false,
  };
}

export interface ReceiptValidationItem {
  lineId: string;
  productSku: string;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
}

export async function validateGoodsReceipt(params: {
  receiptId: string;
  items: ReceiptValidationItem[];
  actor: { id: string; name: string; role: Role };
}) {
  const { receiptId, items, actor } = params;

  // Role check: WAREHOUSE or OWNER
  if (actor.role !== Role.WAREHOUSE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Warehouse atau Owner yang berwenang memvalidasi penerimaan barang.");
  }

  const receipt = await prisma.goodsReceipt.findFirst({
    where: { OR: [{ id: receiptId }, { receiptNumber: receiptId }] },
    include: {
      lines: { include: { product: true } },
      purchaseOrder: { include: { lines: true } },
    },
  });

  if (!receipt) throw new Error("Goods Receipt tidak ditemukan.");

  // Idempotency check:
  if (receipt.status === "DONE") {
    return { receipt, message: "Goods Receipt sudah berstatus Done (idempotent)." };
  }

  const destLocation = receipt.destLocation || "WH-JKT";

  const result = await prisma.$transaction(async (tx) => {
    let totalValuationAdded = 0;

    for (const item of items) {
      const line = receipt.lines.find((l) => l.id === item.lineId || l.productSku === item.productSku);
      if (!line) throw new Error(`Baris produk ${item.productSku} tidak ditemukan di penerimaan.`);

      const accepted = item.acceptedQty || 0;
      const rejected = item.rejectedQty || 0;

      if (accepted < 0 || rejected < 0) {
        throw new Error("Kuantitas accepted dan rejected tidak boleh negatif.");
      }

      if (accepted + rejected > line.demandQty) {
        throw new Error(
          `Total diterima (${accepted} accepted + ${rejected} rejected = ${accepted + rejected}) melebihi demand (${line.demandQty}).`
        );
      }

      // 1. Update stock level at destination location: ONLY acceptedQty increases on-hand stock! (SR-06 / F-12 / T-17)
      if (accepted > 0) {
        await tx.stockLevel.upsert({
          where: {
            productSku_locationCode: {
              productSku: item.productSku,
              locationCode: destLocation,
            },
          },
          update: {
            onHand: { increment: accepted },
          },
          create: {
            productSku: item.productSku,
            locationCode: destLocation,
            onHand: accepted,
            reserved: 0,
          },
        });

        // 2. Record Stock Move for accepted units
        const unitCost = line.product.standardCost;
        const lineValuation = accepted * unitCost;
        totalValuationAdded += lineValuation;

        await tx.stockMove.create({
          data: {
            moveNumber: `SM/IN/${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productSku: item.productSku,
            sourceLocation: "Vendor/Input",
            destLocation: destLocation,
            quantity: accepted,
            unitCost,
            totalValue: lineValuation,
            documentType: "PO_RECEIPT",
            documentRef: receipt.receiptNumber,
            state: "DONE",
          },
        });
      }

      // 3. Update receipt line
      await tx.goodsReceiptLine.update({
        where: { id: line.id },
        data: {
          acceptedQty: accepted,
          rejectedQty: rejected,
          rejectionReason: item.rejectionReason,
        },
      });

      // 4. Update PO line received quantity
      const poLine = receipt.purchaseOrder.lines.find((pl) => pl.productSku === item.productSku);
      if (poLine) {
        await tx.purchaseOrderLine.update({
          where: { id: poLine.id },
          data: {
            receivedQty: { increment: accepted },
          },
        });
      }
    }

    // 5. Update Goods Receipt status to DONE
    const updatedReceipt = await tx.goodsReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "DONE",
        dateDone: new Date(),
      },
      include: { lines: { include: { product: true } } },
    });

    // 6. Create General Ledger entry (T-17):
    // Dr 1030 Inventory (Rp96.000)
    // Cr 1040 GRNI / Stock Interim (Rp96.000)
    const jeNumber = await getNextSequence("JE");
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: jeNumber,
        sourceDocument: receipt.receiptNumber,
        documentRef: `GR_${receipt.receiptNumber}`,
        journalType: "INVENTORY",
        state: "POSTED",
        notes: `Inventory receipt from ${receipt.purchaseOrder.poNumber}: +${totalValuationAdded} valuation`,
        items: {
          create: [
            {
              accountCode: "1030",
              label: `Inventory Receipt: ${receipt.receiptNumber}`,
              debit: totalValuationAdded,
              credit: 0,
            },
            {
              accountCode: "1040",
              label: `GRNI Interim: ${receipt.receiptNumber}`,
              debit: 0,
              credit: totalValuationAdded,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 7. Update account balances in CoA
    await tx.account.update({
      where: { code: "1030" },
      data: { currentBalance: { increment: totalValuationAdded } },
    });
    await tx.account.update({
      where: { code: "1040" },
      data: { currentBalance: { increment: totalValuationAdded } },
    });

    return { updatedReceipt, journalEntry, totalValuationAdded };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "VALIDATE_RECEIPT",
    documentType: "GOODS_RECEIPT",
    documentId: receipt.receiptNumber,
    afterState: {
      status: "DONE",
      totalValuationAdded: result.totalValuationAdded,
      journalEntry: result.journalEntry.entryNumber,
    },
    notes: `Penerimaan ${receipt.receiptNumber} selesai. Masuk persediaan: Rp ${result.totalValuationAdded.toLocaleString("id-ID")}. Jurnal: ${result.journalEntry.entryNumber}`,
  });

  return result;
}

export interface VendorBillItemInput {
  productSku: string;
  quantity: number;
  unitPrice?: number;
}

export async function createVendorBill(params: {
  purchaseOrderId: string;
  receiptId?: string;
  lines: VendorBillItemInput[];
  actor: { id: string; name: string; role: Role };
}) {
  const { purchaseOrderId, receiptId, lines: lineInputs, actor } = params;

  // Role check: FINANCE or OWNER
  if (actor.role !== Role.FINANCE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Finance atau Owner yang dapat membuat Vendor Bill.");
  }

  const po = await prisma.purchaseOrder.findFirst({
    where: { OR: [{ id: purchaseOrderId }, { poNumber: purchaseOrderId }] },
    include: {
      lines: { include: { product: true } },
      receipts: { include: { lines: true } },
      vendor: true,
      bills: { include: { lines: true } },
    },
  });

  if (!po) throw new Error("Purchase Order tidak ditemukan.");

  // THREE-WAY MATCHING VALIDATION (SR-06 / F-13 / T-18):
  // Check against accepted quantities from DONE receipts
  let subtotalNet = 0;
  const processedLines: Array<{
    productSku: string;
    quantity: number;
    unitPrice: number;
    netPrice: number;
    taxAmount: number;
    totalAmount: number;
  }> = [];

  for (const item of lineInputs) {
    const poLine = po.lines.find((pl) => pl.productSku === item.productSku);
    if (!poLine) throw new Error(`Produk ${item.productSku} tidak ada di PO ${po.poNumber}.`);

    // Sum accepted quantity across all DONE receipts for this PO
    let totalAccepted = 0;
    for (const r of po.receipts) {
      if (r.status === "DONE") {
        const rl = r.lines.find((l) => l.productSku === item.productSku);
        if (rl) totalAccepted += rl.acceptedQty;
      }
    }

    // Sum already billed quantity across all posted bills
    let alreadyBilled = 0;
    for (const b of po.bills) {
      if (b.status === "POSTED") {
        const bl = b.lines.find((l) => l.productSku === item.productSku);
        if (bl) alreadyBilled += bl.quantity;
      }
    }

    const maxBillable = Math.max(0, totalAccepted - alreadyBilled);

    if (item.quantity > maxBillable) {
      throw new Error(
        `Validasi Three-Way Match Gagal (SR-06 / T-18): Kuantitas tagihan (${item.quantity}) melebihi kuantitas penerimaan yang lolos inspeksi (Accepted: ${totalAccepted}, Sudah Ditagih: ${alreadyBilled}, Maksimal Boleh Ditagih: ${maxBillable}). Tagihan terhadap barang ditolak/belum diterima dilarang.`
      );
    }

    const price = item.unitPrice !== undefined ? item.unitPrice : poLine.unitPrice;
    const net = item.quantity * price;
    const tax = 0; // fixture tax 0%
    subtotalNet += net;

    processedLines.push({
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: price,
      netPrice: net,
      taxAmount: tax,
      totalAmount: net + tax,
    });
  }

  const billNumber = await getNextSequence("BILL");
  const vendorBill = await prisma.vendorBill.create({
    data: {
      billNumber,
      purchaseOrderId: po.id,
      receiptId: receiptId || po.receipts[0]?.id || null,
      vendorId: po.vendorId,
      status: "DRAFT",
      subtotalNet,
      taxAmount: 0,
      totalGross: subtotalNet,
      outstandingAmount: subtotalNet,
      paidAmount: 0,
      lines: {
        create: processedLines.map((l) => ({
          productSku: l.productSku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          netPrice: l.netPrice,
          taxAmount: l.taxAmount,
          totalAmount: l.totalAmount,
        })),
      },
    },
    include: {
      lines: { include: { product: true } },
      vendor: true,
      purchaseOrder: true,
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CREATE_VENDOR_BILL",
    documentType: "VENDOR_BILL",
    documentId: vendorBill.billNumber,
    notes: `Draft Vendor Bill ${vendorBill.billNumber} dibuat sebesar Rp ${subtotalNet.toLocaleString("id-ID")} (3-Way Match OK).`,
  });

  return vendorBill;
}

export async function postVendorBill(billId: string, actor: { id: string; name: string; role: Role }) {
  // Role check: FINANCE or OWNER
  if (actor.role !== Role.FINANCE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Finance atau Owner yang berwenang memposting Vendor Bill.");
  }

  const bill = await prisma.vendorBill.findFirst({
    where: { OR: [{ id: billId }, { billNumber: billId }] },
    include: {
      lines: true,
      purchaseOrder: {
        include: {
          lines: true,
          receipts: { include: { lines: true } },
          bills: { include: { lines: true } },
        },
      },
      vendor: true,
    },
  });

  if (!bill) throw new Error("Vendor Bill tidak ditemukan.");

  // Idempotency check (SR-13 / T-22):
  if (bill.status === "POSTED" || bill.isPosted) {
    return {
      vendorBill: bill,
      message: "Vendor Bill sudah diposting sebelumnya (idempotent). Tidak ada duplikasi jurnal.",
      alreadyPosted: true,
    };
  }

  // Duplicate Check against accepted quantities (SR-06 / SR-13 / T-22):
  // Check if posting this bill would exceed accepted quantity
  for (const bl of bill.lines) {
    let totalAccepted = 0;
    for (const r of bill.purchaseOrder.receipts) {
      if (r.status === "DONE") {
        const rl = r.lines.find((l) => l.productSku === bl.productSku);
        if (rl) totalAccepted += rl.acceptedQty;
      }
    }

    let otherPostedBilled = 0;
    for (const b of bill.purchaseOrder.bills) {
      if (b.status === "POSTED" && b.id !== bill.id) {
        const otherBl = b.lines.find((l) => l.productSku === bl.productSku);
        if (otherBl) otherPostedBilled += otherBl.quantity;
      }
    }

    if (otherPostedBilled + bl.quantity > totalAccepted) {
      throw new Error(
        `Validasi Three-Way Match Gagal (SR-06 / SR-13 / T-22): Unit sudah ditagih sebelumnya. Total tagihan (${otherPostedBilled + bl.quantity}) melebihi accepted (${totalAccepted}). Tagihan duplikat dicegah.`
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update bill status to POSTED
    const postedBill = await tx.vendorBill.update({
      where: { id: bill.id },
      data: {
        status: "POSTED",
        isPosted: true,
        postedAt: new Date(),
      },
      include: { lines: true, vendor: true },
    });

    // 2. Update PO line billedQty
    for (const bl of bill.lines) {
      const poLine = bill.purchaseOrder.lines.find((pl) => pl.productSku === bl.productSku);
      if (poLine) {
        await tx.purchaseOrderLine.update({
          where: { id: poLine.id },
          data: { billedQty: { increment: bl.quantity } },
        });
      }
    }

    // 3. Create Balanced General Ledger Entry (T-21):
    // Dr 1040 GRNI / Stock Interim: Rp96.000
    // Cr 2010 Accounts Payable: Rp96.000
    // Total Debit = Total Credit (Balanced!)
    const jeNumber = await getNextSequence("JE");
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber: jeNumber,
        sourceDocument: bill.billNumber,
        documentRef: `BILL_${bill.billNumber}`,
        journalType: "PURCHASE",
        state: "POSTED",
        notes: `Vendor Bill for PO ${bill.purchaseOrder.poNumber}: Clears GRNI interim to Accounts Payable`,
        items: {
          create: [
            {
              accountCode: "1040",
              label: `Vendor Bill GRNI Clearance: ${bill.billNumber}`,
              debit: bill.totalGross,
              credit: 0,
            },
            {
              accountCode: "2010",
              label: `Accounts Payable: ${bill.vendor.name} (${bill.billNumber})`,
              debit: 0,
              credit: bill.totalGross,
              partnerId: bill.vendorId,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 4. Update CoA balances: GRNI drops by bill.totalGross, AP increases by bill.totalGross
    await tx.account.update({
      where: { code: "1040" },
      data: { currentBalance: { decrement: bill.totalGross } },
    });
    await tx.account.update({
      where: { code: "2010" },
      data: { currentBalance: { increment: bill.totalGross } },
    });

    // 5. Update vendor openPayable
    await tx.contact.update({
      where: { id: bill.vendorId },
      data: { openPayable: { increment: bill.totalGross } },
    });

    return { postedBill, journalEntry };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "POST_VENDOR_BILL",
    documentType: "VENDOR_BILL",
    documentId: bill.billNumber,
    afterState: {
      status: "POSTED",
      journalEntry: result.journalEntry.entryNumber,
      totalGross: bill.totalGross,
    },
    notes: `Vendor Bill ${bill.billNumber} diposting. Jurnal ${result.journalEntry.entryNumber}: Dr GRNI Rp ${bill.totalGross.toLocaleString("id-ID")} = Cr A/P Rp ${bill.totalGross.toLocaleString("id-ID")}. GRNI berimbang nol.`,
  });

  return {
    vendorBill: result.postedBill,
    journalEntry: result.journalEntry,
    message: "Vendor Bill berhasil diposting. GRNI dan A/P bergerak seimbang.",
    alreadyPosted: false,
  };
}
