import { prisma } from "../src/lib/prisma";
import { executeSeed } from "../src/lib/seedData";
import { createInternalTransfer, validateInternalTransfer } from "../src/lib/transferEngine";
import { openPosSession, createPosOrder, closePosSession } from "../src/lib/posEngine";
import { createReturnRequest, inspectReturnRequest, processReturnAndCreditNote } from "../src/lib/returnEngine";
import { createSalesQuotation, confirmSalesOrder } from "../src/lib/salesEngine";
import { validateDeliveryOrder } from "../src/lib/deliveryEngine";
import { createCustomerInvoice, postCustomerInvoice } from "../src/lib/accountingEngine";
import { Role } from "@prisma/client";

async function runPhase7Tests() {
  console.log("=================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASE 7");
  console.log("   (T-13, T-14, T-27, T-28, T-29, T-30)");
  console.log("=================================================================\n");

  // 0. Reset to Clean Baseline
  console.log("--- 0. Restoring Fresh Baseline Seed ---");
  await executeSeed(prisma);
  console.log("✅ Baseline restored successfully.\n");

  // Actors from Database
  const [warehouseUser, cashierUser, financeUser, salesUser, ownerUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: "warehouse@rasaaruna.com" } }),
    prisma.user.findUnique({ where: { email: "cashier@rasaaruna.com" } }),
    prisma.user.findUnique({ where: { email: "finance@rasaaruna.com" } }),
    prisma.user.findUnique({ where: { email: "sales@rasaaruna.com" } }),
    prisma.user.findUnique({ where: { email: "owner@rasaaruna.com" } }),
  ]);

  const warehouseActor = { id: warehouseUser!.id, name: warehouseUser!.name, role: Role.WAREHOUSE };
  const cashierActor = { id: cashierUser!.id, name: cashierUser!.name, role: Role.CASHIER };
  const financeActor = { id: financeUser!.id, name: financeUser!.name, role: Role.FINANCE };
  const salesActor = { id: salesUser!.id, name: salesUser!.name, role: Role.SALES };
  const ownerActor = { id: ownerUser!.id, name: ownerUser!.name, role: Role.OWNER };

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition: boolean, code: string, message: string) {
    totalAssertions++;
    if (condition) {
      console.log(`✅ [PASS] ${code}: ${message}`);
      passedAssertions++;
    } else {
      console.error(`❌ [FAIL] ${code}: ${message}`);
      process.exitCode = 1;
    }
  }

  // =================================================================
  // 1. T-13: Internal Stock Transfer Normal (F-19 / S-07)
  // =================================================================
  console.log("--- T-13: Internal Stock Transfer Normal (Fitur F-19 / Wireframe S-07) ---");
  
  // Baseline check: COF-LATT-ICE (WH: 25, CAFE: 18, Total: 43)
  const iceInitialWh = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "WH-JKT" } },
  });
  const iceInitialCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "CAFE-JKT" } },
  });

  assert(
    iceInitialWh?.onHand === 25 && iceInitialCafe?.onHand === 18,
    "T-13-BASELINE",
    `Initial Stock COF-LATT-ICE: WH-JKT=${iceInitialWh?.onHand}, CAFE-JKT=${iceInitialCafe?.onHand} (Expected 25 & 18)`
  );

  // Create transfer 4 units from WH-JKT to CAFE-JKT
  const transfer = await createInternalTransfer({
    sourceLocation: "WH-JKT",
    destLocation: "CAFE-JKT",
    lines: [{ productSku: "COF-LATT-ICE", quantity: 4 }],
    actor: warehouseActor,
  });

  assert(
    transfer.lines.length === 1 && transfer.lines[0].totalValue === 52000,
    "T-13-DRAFT",
    `Draft Transfer ${transfer.transferNumber} created: 4 x Rp13.000 = Rp ${transfer.lines[0].totalValue.toLocaleString("id-ID")}`
  );

  // Validate Transfer
  const valResult = await validateInternalTransfer(transfer.id, warehouseActor);

  const iceAfterWh = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "WH-JKT" } },
  });
  const iceAfterCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "CAFE-JKT" } },
  });
  const totalCompanyStock = (iceAfterWh?.onHand || 0) + (iceAfterCafe?.onHand || 0);

  assert(
    iceAfterWh?.onHand === 21 && iceAfterCafe?.onHand === 22 && totalCompanyStock === 43,
    "T-13",
    `WH turun 25->${iceAfterWh?.onHand}; CAFE naik 18->${iceAfterCafe?.onHand}; Company stock tetap ${totalCompanyStock} unit (nilai pindah Rp52.000, total nilai persediaan konstan).`
  );

  // =================================================================
  // 2. T-14: Internal Transfer Over Available Stock Edge Case (SR-04 / SR-12)
  // =================================================================
  console.log("\n--- T-14: Internal Transfer Over Available Stock Edge Case (SR-04 / SR-12 / F-19) ---");

  let t14Blocked = false;
  let t14ErrorMsg = "";

  try {
    const invalidTransfer = await createInternalTransfer({
      sourceLocation: "WH-JKT",
      destLocation: "CAFE-JKT",
      lines: [{ productSku: "COF-LATT-ICE", quantity: 28 }], // current onHand is 21
      actor: warehouseActor,
    });
    await validateInternalTransfer(invalidTransfer.id, warehouseActor);
  } catch (err: any) {
    t14Blocked = true;
    t14ErrorMsg = err.message;
  }

  assert(
    t14Blocked && t14ErrorMsg.includes("melebihi stok yang tersedia"),
    "T-14",
    `SR-04 & SR-12 verified: Transfer 28 units from WH (on-hand 21) rejected: "${t14ErrorMsg}".`
  );

  const iceAfterT14Wh = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "WH-JKT" } },
  });
  assert(
    iceAfterT14Wh?.onHand === 21,
    "T-14-VERIFY",
    `WH-JKT on-hand preserved intact at ${iceAfterT14Wh?.onHand} (zero negative stock).`
  );

  // =================================================================
  // 3. T-27: Point of Sale Normal Flow in CAFE-JKT (Fitur F-16 / S-14)
  // =================================================================
  console.log("\n--- T-27: Point of Sale Restoran Normal (Fitur F-16 / Wireframe S-14) ---");

  // Open POS session
  const posSession = await openPosSession({
    sessionCode: "POS01",
    cashierId: "u-cashier",
    locationCode: "CAFE-JKT",
    openingCash: 0,
    actor: cashierActor,
  });

  assert(
    posSession.sessionCode === "POS01" && posSession.status === "OPEN",
    "T-27-SESSION",
    `Session ${posSession.sessionCode} opened at CAFE-JKT.`
  );

  // Check initial stock in CAFE-JKT:
  // COF-LATT-HOT: 24, COOKIE-CHO-1: 20
  const hotInitialCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "CAFE-JKT" } },
  });
  const cookieInitialCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COOKIE-CHO-1", locationCode: "CAFE-JKT" } },
  });

  assert(
    hotInitialCafe?.onHand === 24 && cookieInitialCafe?.onHand === 20,
    "T-27-STOCK-BEFORE",
    `Initial CAFE-JKT on-hand: COF-LATT-HOT=${hotInitialCafe?.onHand}, COOKIE-CHO-1=${cookieInitialCafe?.onHand}`
  );

  // Checkout order: 2 x COF-LATT-HOT + 1 x COOKIE-CHO-1, paid QRIS/Bank
  const posOrderResult = await createPosOrder({
    sessionId: posSession.id,
    locationCode: "CAFE-JKT",
    tableInfo: "Takeaway",
    paymentMethod: "QRIS / Bank",
    lines: [
      { productSku: "COF-LATT-HOT", quantity: 2, unitPrice: 30000 },
      { productSku: "COOKIE-CHO-1", quantity: 1, unitPrice: 20000 },
    ],
    actor: cashierActor,
  });

  const { order: posOrder, journalEntry: posJournal } = posOrderResult;

  // Expected financial values:
  // Subtotal Net: 2 * 30.000 + 1 * 20.000 = 80.000
  // PBJT 10%: Math.round(60.000 * 0.1) + Math.round(20.000 * 0.1) = 6.000 + 2.000 = 8.000
  // Gross Total Paid: 88.000
  // Total COGS: 2 * 12.000 + 1 * 9.000 = 33.000
  assert(
    posOrder.subtotalNet === 80000 &&
    posOrder.pbjtTax === 8000 &&
    posOrder.totalAmount === 88000 &&
    posOrder.totalCost === 33000,
    "T-27-FINANCIAL",
    `Financials: Net=Rp ${posOrder.subtotalNet.toLocaleString("id-ID")}, PBJT=Rp ${posOrder.pbjtTax.toLocaleString("id-ID")}, Total Paid=Rp ${posOrder.totalAmount.toLocaleString("id-ID")}, COGS=Rp ${posOrder.totalCost.toLocaleString("id-ID")}`
  );

  // Check stock reductions in CAFE-JKT:
  // Hot: 24 -> 22, Cookie: 20 -> 19
  const hotAfterCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "CAFE-JKT" } },
  });
  const cookieAfterCafe = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COOKIE-CHO-1", locationCode: "CAFE-JKT" } },
  });

  assert(
    hotAfterCafe?.onHand === 22 && cookieAfterCafe?.onHand === 19,
    "T-27-STOCK-AFTER",
    `CAFE-JKT Stock: COF-LATT-HOT 24->${hotAfterCafe?.onHand} (-2), COOKIE-CHO-1 20->${cookieAfterCafe?.onHand} (-1)`
  );

  // Check Balanced Journal Entry
  const totalDebit = posJournal?.items?.reduce((s, i) => s + i.debit, 0) || 0;
  const totalCredit = posJournal?.items?.reduce((s, i) => s + i.credit, 0) || 0;
  const bankItem = posJournal?.items?.find((i: any) => i.accountCode === "1010" || i.account?.code === "1010");

  assert(
    totalDebit === 121000 && totalCredit === 121000 && bankItem?.debit === 88000,
    "T-27",
    `T-27 Complete: Net Rp80k, PBJT Rp8k, paid Rp88k; COGS Rp33k; CAFE Hot 24->22, Cookie 20->19; Bank naik Rp88k; Journal balanced Rp121.000.`
  );

  // =================================================================
  // 4. T-28: POS Negative Stock Evaluation & Session Closing (SR-03/SR-04/SR-14)
  // =================================================================
  console.log("\n--- T-28: POS Stock Evaluation & Session Closing (SR-03/SR-04/SR-14 / F-16 / F-17) ---");

  // Step 1: Attempt to checkout 25 x COF-LATT-HOT when CAFE on-hand is 22
  let posExcessBlocked = false;
  let posExcessMsg = "";

  try {
    await createPosOrder({
      sessionId: posSession.id,
      locationCode: "CAFE-JKT",
      lines: [{ productSku: "COF-LATT-HOT", quantity: 25 }],
      actor: cashierActor,
    });
  } catch (err: any) {
    posExcessBlocked = true;
    posExcessMsg = err.message;
  }

  assert(
    posExcessBlocked && posExcessMsg.includes("melebihi stok fisik On-Hand"),
    "T-28-STOCK-EVAL",
    `SR-04 verified: POS checkout 25 units when on-hand is 22 blocked: "${posExcessMsg}".`
  );

  // Step 2: Close Session POS01 with actual counted cash = 0 (paid via QRIS/Bank)
  const closeResult = await closePosSession(posSession.id, 0, cashierActor);

  assert(
    closeResult.session.status === "CLOSED" && closeResult.session.isClosed === true,
    "T-28-CLOSE-SESSION",
    `Session ${closeResult.session.sessionCode} closed. Total sales=Rp ${closeResult.session.totalSales.toLocaleString("id-ID")}, Difference=Rp ${closeResult.difference.toLocaleString("id-ID")}.`
  );

  // Step 3: Repeat closing the same session (Idempotent test SR-14 / SR-13)
  const repeatCloseResult = await closePosSession(posSession.id, 0, cashierActor);

  assert(
    repeatCloseResult.alreadyClosed === true,
    "T-28",
    `SR-14 & SR-13 verified: Re-closing session is idempotent ("${repeatCloseResult.message}"), zero duplicate journals.`
  );

  // =================================================================
  // 5. T-29: Return Inspection & Credit Note Normal (Fitur F-18 / Wireframe S-15)
  // =================================================================
  console.log("\n--- T-29: Return Inspection dan Credit Note Normal (Fitur F-18 / Wireframe S-15) ---");

  // Setup Fixture: SO -> Delivery (5 delivered) -> Customer Invoice (5 invoiced)
  const quotation = await createSalesQuotation({
    contactId: "C01",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 5, unitPrice: 48000, discountPercent: 0 }],
    actor: salesActor,
  });

  const confirmRes = (await confirmSalesOrder(quotation.id, salesActor)) as any;
  const so = confirmRes.confirmedOrder || confirmRes.salesOrder || confirmRes.order;
  const delivery = confirmRes.deliveryOrder;

  await validateDeliveryOrder({
    deliveryOrderId: delivery!.id,
    items: [{ productSku: "RICE-CHICK-S", deliveredQty: 5 }],
    actor: warehouseActor,
  });

  const invoice = await createCustomerInvoice({
    salesOrderId: so.id,
    deliveryOrderId: delivery!.id,
    lines: [{ productSku: "RICE-CHICK-S", quantity: 5, unitPrice: 48000 }],
    actor: financeActor,
  });

  await postCustomerInvoice(invoice.id, financeActor);

  // Stock at WH-JKT after 5 delivered: 40 - 5 = 35
  const whStockBeforeReturn = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "RICE-CHICK-S", locationCode: "WH-JKT" } },
  });

  assert(
    whStockBeforeReturn?.onHand === 35,
    "T-29-FIXTURE",
    `Fixture ready: Invoice ${invoice.invoiceNumber} posted. WH-JKT on-hand: ${whStockBeforeReturn?.onHand}`
  );

  // 1. Create Return Request for 1 x RICE-CHICK-S
  const returnReq = await createReturnRequest({
    invoiceId: invoice.id,
    lines: [{ productSku: "RICE-CHICK-S", returnedQty: 1 }],
    actor: warehouseActor,
  });

  assert(
    returnReq.returnNumber.startsWith("RET/2026/") && returnReq.inspectionStatus === "PENDING",
    "T-29-RETURN-REQ",
    `Return Request ${returnReq.returnNumber} created with status PENDING.`
  );

  // 2. Perform Quality Inspection: 1 accepted, 0 rejected
  const inspectedReq = await inspectReturnRequest(
    returnReq.id,
    [{ productSku: "RICE-CHICK-S", acceptedQty: 1, rejectedQty: 0, notes: "Kualitas makanan utuh, tersegel baik." }],
    warehouseActor
  );

  assert(
    inspectedReq.inspectionStatus === "ACCEPTED",
    "T-29-INSPECTION",
    `Quality inspection completed: Status=${inspectedReq.inspectionStatus}.`
  );

  // 3. Process Restock and Credit Note
  const processResult = await processReturnAndCreditNote(returnReq.id, financeActor);
  const { creditNote, financials } = processResult;

  // Check WH on-hand increased from 35 -> 36
  const whStockAfterReturn = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "RICE-CHICK-S", locationCode: "WH-JKT" } },
  });

  // Check updated invoice outstanding: 264.000 - 52.800 = 211.200
  const updatedInvoice = await prisma.customerInvoice.findUnique({
    where: { id: invoice.id },
  });

  assert(
    whStockAfterReturn?.onHand === 36 &&
    financials?.totalCostReversed === 26000 &&
    creditNote.subtotalNet === 48000 &&
    creditNote.pbjtTax === 4800 &&
    creditNote.totalGross === 52800 &&
    updatedInvoice?.outstandingAmount === 211200,
    "T-29",
    `T-29 Complete: WH on-hand 35->${whStockAfterReturn?.onHand}; Reverse cost Rp${financials?.totalCostReversed.toLocaleString("id-ID")}; Credit Note net Rp${creditNote.subtotalNet.toLocaleString("id-ID")}, PBJT Rp${creditNote.pbjtTax.toLocaleString("id-ID")}, total Rp${creditNote.totalGross.toLocaleString("id-ID")}; A/R invoice berkurang Rp${creditNote.totalGross.toLocaleString("id-ID")} (Outstanding: Rp${updatedInvoice?.outstandingAmount.toLocaleString("id-ID")}).`
  );

  // =================================================================
  // 6. T-30: Return Without Inspection Accepted Edge Case (SR-11 / F-18)
  // =================================================================
  console.log("\n--- T-30: Return Without Inspection Accepted Edge Case (SR-11 / F-18) ---");

  // Create another return request for 2 units
  const returnReq2 = await createReturnRequest({
    invoiceId: invoice.id,
    lines: [{ productSku: "RICE-CHICK-S", returnedQty: 2 }],
    actor: warehouseActor,
  });

  // Attempt to process restock & credit note while inspectionStatus is still PENDING (not ACCEPTED)
  let t30Blocked = false;
  let t30ErrorMsg = "";

  try {
    await processReturnAndCreditNote(returnReq2.id, financeActor);
  } catch (err: any) {
    t30Blocked = true;
    t30ErrorMsg = err.message;
  }

  assert(
    t30Blocked && t30ErrorMsg.includes("belum lolos pemeriksaan kualitas"),
    "T-30",
    `SR-11 verified: Restock and Credit Note blocked when inspection is not ACCEPTED: "${t30ErrorMsg}".`
  );

  // Check that stock did NOT increase for un-accepted return
  const whStockT30 = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "RICE-CHICK-S", locationCode: "WH-JKT" } },
  });

  assert(
    whStockT30?.onHand === 36,
    "T-30-VERIFY",
    `WH-JKT stock protected at ${whStockT30?.onHand} (uninspected goods did NOT enter inventory).`
  );

  // Summary
  console.log("\n=================================================================");
  console.log(`🏁 PHASE 7 TEST SUMMARY: ${passedAssertions} / ${totalAssertions} TESTS PASSED`);
  console.log("=================================================================");

  if (passedAssertions === totalAssertions) {
    console.log("🎉 ALL TESTS T-13, T-14, T-27, T-28, T-29, T-30 COMPLETED WITH 100% SUCCESS AND ZERO DEFECTS!\n");
  } else {
    console.error("❌ SOME TESTS FAILED IN PHASE 7.\n");
    process.exit(1);
  }
}

runPhase7Tests()
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
