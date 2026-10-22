import { prisma } from "./prisma";
import { getNextSequence } from "./sequences";
import { logAudit } from "./audit";
import { Role } from "@prisma/client";

export interface OpenSessionInput {
  sessionCode?: string;
  cashierId: string;
  locationCode?: string;
  openingCash?: number;
  actor: {
    id?: string;
    name: string;
    role: Role | string;
  };
}

export interface CreatePosOrderInput {
  sessionId: string;
  locationCode?: string;
  tableInfo?: string;
  paymentMethod?: string;
  lines: Array<{
    productSku: string;
    quantity: number;
    unitPrice?: number;
  }>;
  actor: {
    id?: string;
    name: string;
    role: Role | string;
  };
}

/**
 * Buka sesi kasir baru (F-17 / S-14)
 */
export async function openPosSession(input: OpenSessionInput) {
  const { cashierId, locationCode = "CAFE-JKT", openingCash = 0, actor } = input;

  return await prisma.$transaction(async (tx) => {
    // Cek apakah ada sesi kasir yang masih OPEN untuk lokasi ini
    const existingOpen = await tx.posSession.findFirst({
      where: { locationCode, status: "OPEN" },
    });

    if (existingOpen) {
      return existingOpen;
    }

    const sessionCode = input.sessionCode || (await getNextSequence("SESSION", tx));

    // Resolve valid cashier user ID
    let validCashierId = cashierId;
    const userExists = await tx.user.findUnique({ where: { id: cashierId } });
    if (!userExists) {
      const cashierFallback = await tx.user.findFirst({ where: { role: Role.CASHIER } });
      if (cashierFallback) validCashierId = cashierFallback.id;
    }

    const session = await tx.posSession.create({
      data: {
        sessionCode,
        cashierId: validCashierId,
        locationCode,
        status: "OPEN",
        openingCash,
        isClosed: false,
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "OPEN_POS_SESSION",
      documentType: "POS_SESSION",
      documentId: session.id,
      documentNumber: session.sessionCode,
      notes: `Sesi kasir ${sessionCode} dibuka di lokasi ${locationCode} dengan modal awal kas Rp ${openingCash.toLocaleString("id-ID")}.`,
      afterData: session,
      tx,
    });

    return session;
  });
}

/**
 * Transaksi Penjualan Point of Sale Gerai (F-16 / S-14 / T-27 / T-28)
 */
export async function createPosOrder(input: CreatePosOrderInput) {
  const {
    sessionId,
    locationCode = "CAFE-JKT",
    tableInfo = "Takeaway",
    paymentMethod = "QRIS / Bank",
    lines,
    actor,
  } = input;

  if (!lines || lines.length === 0) {
    throw new Error("Keranjang belanja POS tidak boleh kosong.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verifikasi Sesi Aktif
    const session = await tx.posSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== "OPEN" || session.isClosed) {
      throw new Error(`Sesi POS ${sessionId} tidak aktif atau sudah ditutup.`);
    }

    // 2. Evaluasi Stok & Hitung Keuangan (SR-03 vs SR-04 / T-28)
    let totalSubtotalNet = 0;
    let totalPbjt = 0;
    let totalGross = 0;
    let totalCost = 0;
    const orderLinesData = [];
    const stockMovements = [];

    for (const item of lines) {
      if (item.quantity <= 0) {
        throw new Error(`Kuantitas untuk SKU ${item.productSku} harus lebih besar dari 0.`);
      }

      const product = await tx.productVariant.findUnique({
        where: { sku: item.productSku },
      });

      if (!product) {
        throw new Error(`Produk dengan SKU ${item.productSku} tidak ditemukan.`);
      }

      // Validasi Stok On-Hand di CAFE-JKT (SR-04 / T-28)
      const stock = await tx.stockLevel.findUnique({
        where: {
          productSku_locationCode: {
            productSku: item.productSku,
            locationCode,
          },
        },
      });

      const onHand = stock?.onHand || 0;
      if (item.quantity > onHand) {
        throw new Error(
          `Validasi POS Gagal (SR-04 / T-28): Kuantitas pesanan (${item.quantity}) melebihi stok fisik On-Hand (${onHand}) di ${locationCode}. Stok minus dilarang.`
        );
      }

      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.salesPrice;
      const netLine = item.quantity * unitPrice;
      // PBJT 10% round half-up per baris (SR-18)
      const pbjtLine = Math.round(netLine * 0.1);
      const totalLine = netLine + pbjtLine;
      const costLine = item.quantity * product.standardCost;

      totalSubtotalNet += netLine;
      totalPbjt += pbjtLine;
      totalGross += totalLine;
      totalCost += costLine;

      orderLinesData.push({
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice,
        netPrice: netLine,
        pbjtAmount: pbjtLine,
        totalAmount: totalLine,
        standardCost: product.standardCost,
      });

      stockMovements.push({
        sku: item.productSku,
        before: onHand,
        after: onHand - item.quantity,
        qty: item.quantity,
      });
    }

    const orderNumber = await getNextSequence("POS", tx);

    // 3. Simpan Pesanan POS
    const posOrder = await tx.posOrder.create({
      data: {
        orderNumber,
        sessionId: session.id,
        locationCode,
        tableInfo,
        status: "PAID",
        subtotalNet: totalSubtotalNet,
        pbjtTax: totalPbjt,
        totalAmount: totalGross,
        totalCost,
        paymentMethod,
        isPosted: true,
        lines: {
          create: orderLinesData,
        },
      },
      include: {
        lines: { include: { product: true } },
      },
    });

    // 4. Potong Stok Fisik di Lokasi CAFE-JKT
    for (const mov of stockMovements) {
      await tx.stockLevel.update({
        where: {
          productSku_locationCode: {
            productSku: mov.sku,
            locationCode,
          },
        },
        data: {
          onHand: { decrement: mov.qty },
        },
      });
    }

    // 5. Update Akumulasi Sesi POS
    await tx.posSession.update({
      where: { id: session.id },
      data: {
        totalSales: { increment: totalGross },
        totalOrders: { increment: 1 },
      },
    });

    // 6. Buat Jurnal Akuntansi Ganda Seimbang (Double-Entry Balanced / T-27)
    // Debit: 1010 Bank/Kas (Rp88.000) + 5010 HPP (Rp33.000) = Rp121.000
    // Credit: 4010 Pendapatan (Rp80.000) + 2020 PBJT (Rp8.000) + 1030 Persediaan (Rp33.000) = Rp121.000
    const entryNumber = await getNextSequence("JE", tx);
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        sourceDocument: orderNumber,
        documentRef: `POS_${orderNumber}`,
        journalType: "SALES",
        state: "POSTED",
        notes: `Penerimaan & Penjualan POS ${orderNumber} via ${paymentMethod}`,
        items: {
          create: [
            {
              accountCode: "1010",
              label: `Penerimaan POS ${orderNumber} via ${paymentMethod}`,
              debit: totalGross,
              credit: 0,
            },
            {
              accountCode: "5010",
              label: `HPP Penjualan POS ${orderNumber}`,
              debit: totalCost,
              credit: 0,
            },
            {
              accountCode: "4010",
              label: `Pendapatan Penjualan POS ${orderNumber}`,
              debit: 0,
              credit: totalSubtotalNet,
            },
            {
              accountCode: "2020",
              label: `Utang Pajak PBJT 10% Restoran POS ${orderNumber}`,
              debit: 0,
              credit: totalPbjt,
            },
            {
              accountCode: "1030",
              label: `Pengurangan Persediaan Penjualan POS ${orderNumber}`,
              debit: 0,
              credit: totalCost,
            },
          ],
        },
      },
      include: {
        items: { include: { account: true } },
      },
    });

    // Update CoA balances
    await tx.account.update({ where: { code: "1010" }, data: { currentBalance: { increment: totalGross } } });
    await tx.account.update({ where: { code: "5010" }, data: { currentBalance: { increment: totalCost } } });
    await tx.account.update({ where: { code: "4010" }, data: { currentBalance: { increment: totalSubtotalNet } } });
    await tx.account.update({ where: { code: "2020" }, data: { currentBalance: { increment: totalPbjt } } });
    await tx.account.update({ where: { code: "1030" }, data: { currentBalance: { decrement: totalCost } } });

    // 7. Audit Log
    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "CREATE_POS_ORDER",
      documentType: "POS_ORDER",
      documentId: posOrder.id,
      documentNumber: posOrder.orderNumber,
      notes: `Order POS ${orderNumber} berhasil dicatat senilai Rp ${totalGross.toLocaleString("id-ID")} (Net Rp ${totalSubtotalNet.toLocaleString("id-ID")}, PBJT Rp ${totalPbjt.toLocaleString("id-ID")}). Stok berkurang dan jurnal diterbitkan.`,
      afterData: posOrder,
      tx,
    });

    return {
      order: posOrder,
      stockMovements,
      journalEntry,
    };
  });
}

/**
 * Tutup sesi kasir dan hitung selisih kas (F-17 / T-28 / SR-14 / SR-13)
 */
export async function closePosSession(
  sessionId: string,
  closingCash: number,
  actor: { id?: string; name: string; role: Role | string }
) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.posSession.findUnique({
      where: { id: sessionId },
      include: {
        orders: true,
      },
    });

    if (!session) {
      throw new Error(`Sesi POS ${sessionId} tidak ditemukan.`);
    }

    // SR-13 & SR-14: Idempotensi Penutupan Sesi
    if (session.status === "CLOSED" || session.isClosed) {
      return {
        success: true,
        alreadyClosed: true,
        message: `Sesi ${session.sessionCode} sudah ditutup sebelumnya. Penutupan ulang tidak membuat jurnal ganda.`,
        session,
        difference: session.closingCash - (session.openingCash + session.totalSales),
      };
    }

    const cashOrders = session.orders.filter((o) =>
      o.paymentMethod.toLowerCase().includes("cash") || o.paymentMethod.toLowerCase().includes("tunai")
    );
    const cashSales = cashOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const expectedCash = session.openingCash + cashSales;
    const difference = closingCash - expectedCash;

    const closedSession = await tx.posSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        isClosed: true,
        closingCash,
        closedAt: new Date(),
      },
      include: {
        orders: { include: { lines: true } },
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "CLOSE_POS_SESSION",
      documentType: "POS_SESSION",
      documentId: closedSession.id,
      documentNumber: closedSession.sessionCode,
      notes: `Sesi ${closedSession.sessionCode} ditutup. Modal Awal: Rp ${session.openingCash.toLocaleString("id-ID")}, Total Penjualan: Rp ${session.totalSales.toLocaleString("id-ID")}, Kas Fisik Aktual: Rp ${closingCash.toLocaleString("id-ID")}, Selisih Kas: Rp ${difference.toLocaleString("id-ID")}.`,
      beforeData: session,
      afterData: closedSession,
      tx,
    });

    return {
      success: true,
      session: closedSession,
      expectedCash,
      closingCash,
      difference,
    };
  });
}
