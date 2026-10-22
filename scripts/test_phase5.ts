import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import { executeSeed } from "../src/lib/seedData";
import { createPurchaseQuotation, confirmPurchaseOrder, validateGoodsReceipt, createVendorBill, postVendorBill } from "../src/lib/purchaseEngine";

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log("=================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASE 5 (T-15 s.d. T-18, T-21, T-22)");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testId: string, desc: string, details?: any) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testId}: ${desc}`);
    } else {
      console.error(`❌ [FAIL] ${testId}: ${desc}`, details || "");
    }
  }

  // Restore fresh baseline seed before running tests
  console.log("--- 0. Restoring Fresh Baseline Seed ---");
  await executeSeed(prisma, "Test Runner Phase 5", Role.OWNER);

  const ownerUser = (await prisma.user.findFirst({ where: { role: Role.OWNER } }))!;
  const procurementUser = (await prisma.user.findFirst({ where: { role: Role.PROCUREMENT } }))!;
  const whUser = (await prisma.user.findFirst({ where: { role: Role.WAREHOUSE } }))!;
  const financeUser = (await prisma.user.findFirst({ where: { role: Role.FINANCE } }))!;

  const actorOwner = { id: ownerUser.id, name: ownerUser.name, role: Role.OWNER };
  const actorProc = { id: procurementUser.id, name: procurementUser.name, role: Role.PROCUREMENT };
  const actorWH = { id: whUser.id, name: whUser.name, role: Role.WAREHOUSE };
  const actorFin = { id: financeUser.id, name: financeUser.name, role: Role.FINANCE };

  // =================================================================
  // T-15: RFQ to Purchase Order Normal (V03: 10 x COF-LATT-HOT @ Rp12.000)
  // =================================================================
  console.log("\n--- T-15: RFQ and Purchase Order Normal (Fitur F-11) ---");
  const stockBeforeT15 = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  });

  const rfqT15 = await createPurchaseQuotation({
    vendorId: "V03",
    lines: [{ productSku: "COF-LATT-HOT", orderedQty: 10, unitPrice: 12000 }],
    actor: actorProc,
  });

  assert(
    rfqT15.subtotal === 120000 &&
    rfqT15.taxAmount === 0 &&
    rfqT15.total === 120000 &&
    rfqT15.status === OrderStatus.DRAFT,
    "T-15-RFQ",
    `RFQ created: Subtotal Rp120.000, Tax 0%, Total Rp120.000`
  );

  const confirmResT15 = (await confirmPurchaseOrder(rfqT15.id, actorProc)) as any;
  const poT15 = confirmResT15.purchaseOrder;

  const stockAfterT15 = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  });

  assert(
    poT15.status === OrderStatus.CONFIRMED &&
    stockBeforeT15?.onHand === stockAfterT15?.onHand &&
    stockAfterT15?.onHand === 20,
    "T-15",
    `PO ${poT15.poNumber} Confirmed. On-hand remains unchanged at 20 units (procurement commitment recorded, no physical stock change yet).`
  );

  // =================================================================
  // T-16: Re-confirming PO Idempotency Check (SR-13 / Fitur F-11)
  // =================================================================
  console.log("\n--- T-16: Purchase Order Re-confirmation Idempotency (SR-13 / F-11) ---");
  const receiptsBefore = await prisma.goodsReceipt.count({ where: { purchaseOrderId: poT15.id } });

  // Re-confirm the same PO
  const retryConfirm = (await confirmPurchaseOrder(poT15.id, actorProc)) as any;
  const receiptsAfter = await prisma.goodsReceipt.count({ where: { purchaseOrderId: poT15.id } });

  assert(
    retryConfirm.alreadyConfirmed === true &&
    receiptsBefore === 1 &&
    receiptsAfter === 1,
    "T-16",
    `SR-13 verified: Re-confirming PO ${poT15.poNumber} is idempotent. Receipt count remains 1, no duplicate receipt or commitment created.`
  );

  // =================================================================
  // T-17: Goods Receipt Quality Acceptance (10 Demand, 8 Accepted, 2 Rejected)
  // =================================================================
  console.log("\n--- T-17: Receipt and Quality Acceptance Normal (Fitur F-12) ---");
  const receiptT17 = confirmResT15.receipt;
  const stockWhBeforeT17 = (await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  }))!;

  assert(stockWhBeforeT17.onHand === 20, "T-17-INITIAL", "WH on-hand before receipt: 20 units");

  // Validate Receipt: 8 accepted, 2 rejected
  const receiptResult = await validateGoodsReceipt({
    receiptId: receiptT17.id,
    items: [
      {
        lineId: receiptT17.lines[0].id,
        productSku: "COF-LATT-HOT",
        acceptedQty: 8,
        rejectedQty: 2,
        rejectionReason: "Kemasan rusak saat pengiriman",
      },
    ],
    actor: actorWH,
  });

  const stockWhAfterT17 = (await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  }))!;

  // Check inventory increase: only accepted 8 entered inventory!
  // On-hand: 20 -> 28
  const onHandIncrease = stockWhAfterT17.onHand - stockWhBeforeT17.onHand;
  assert(
    stockWhAfterT17.onHand === 28 && onHandIncrease === 8,
    "T-17-STOCK",
    `WH on-hand increased 20 -> 28 (+8 accepted units). 2 rejected units did NOT enter inventory.`
  );

  // Check General Ledger Journal Entry (T-17):
  // Dr 1030 Inventory Rp96.000 = Cr 1040 GRNI Rp96.000 (8 * 12.000)
  const jeT17 = receiptResult.journalEntry;
  const drItem = jeT17.items.find((i) => i.accountCode === "1030");
  const crItem = jeT17.items.find((i) => i.accountCode === "1040");

  assert(
    jeT17.state === "POSTED" &&
    drItem?.debit === 96000 &&
    crItem?.credit === 96000 &&
    drItem?.debit === crItem?.credit,
    "T-17",
    `Journal Entry ${jeT17.entryNumber}: Dr 1030 Inventory Rp96.000 = Cr 1040 GRNI Rp96.000. Balanced Dr=Cr.`
  );

  // =================================================================
  // T-18: Three-Way Match Violation: Attempt to Bill 10 Units when Accepted is 8 (SR-06 / F-12)
  // =================================================================
  console.log("\n--- T-18: Three-Way Match Violation Edge Case (SR-06 / F-12) ---");
  // Try to create Vendor Bill for 10 units (ordered qty) even though accepted is only 8
  let t18Blocked = false;
  try {
    await createVendorBill({
      purchaseOrderId: poT15.id,
      receiptId: receiptT17.id,
      lines: [{ productSku: "COF-LATT-HOT", quantity: 10, unitPrice: 12000 }],
      actor: actorFin,
    });
  } catch (err: any) {
    t18Blocked = true;
    assert(
      err.message.includes("Three-Way Match Gagal") || err.message.includes("SR-06"),
      "T-18",
      `Three-Way Match strictly blocked billing 10 units: "${err.message}"`
    );
  }
  assert(t18Blocked, "T-18-VERIFY", "Attempt to bill rejected units (10 requested vs 8 accepted) successfully blocked");

  // =================================================================
  // T-21: Vendor Bill and Three-Way Match Normal (8 Accepted Units)
  // =================================================================
  console.log("\n--- T-21: Vendor Bill & Three-Way Match Normal (Fitur F-13) ---");
  // Create Vendor Bill for exactly 8 accepted units
  const billT21 = await createVendorBill({
    purchaseOrderId: poT15.id,
    receiptId: receiptT17.id,
    lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
    actor: actorFin,
  });

  assert(
    billT21.subtotalNet === 96000 &&
    billT21.taxAmount === 0 &&
    billT21.totalGross === 96000,
    "T-21-BILL",
    `Draft Vendor Bill ${billT21.billNumber}: Net Rp96.000, Tax 0, Total Rp96.000 (3-Way Match Verified)`
  );

  // Post Vendor Bill
  const postResultT21 = (await postVendorBill(billT21.id, actorFin)) as any;
  const jeBillT21 = postResultT21.journalEntry;

  const drGrni = jeBillT21.items.find((i: any) => i.accountCode === "1040");
  const crAp = jeBillT21.items.find((i: any) => i.accountCode === "2010");

  assert(
    postResultT21.vendorBill.status === "POSTED" &&
    drGrni?.debit === 96000 &&
    crAp?.credit === 96000 &&
    drGrni?.debit === crAp?.credit,
    "T-21",
    `Vendor Bill Posted. Journal ${jeBillT21.entryNumber}: Dr 1040 GRNI Rp96.000 = Cr 2010 A/P Rp96.000. GRNI cleared to 0.`
  );

  // Verify GRNI balance is cleared (Account 1040 balance is 0)
  const grniAccount = await prisma.account.findUnique({ where: { code: "1040" } });
  assert(grniAccount?.currentBalance === 0, "T-21-GRNI-ZERO", `GRNI account balance for this transaction is Rp ${grniAccount?.currentBalance} (cleared to 0)`);

  // =================================================================
  // T-22: Duplicate Vendor Bill Posting Edge Case (SR-06 / SR-13 / F-13)
  // =================================================================
  console.log("\n--- T-22: Duplicate Vendor Bill Posting Edge Case (SR-06 / SR-13) ---");
  // 1. Try to post the SAME bill again -> Idempotent check
  const retryPostBill = (await postVendorBill(billT21.id, actorFin)) as any;
  assert(
    retryPostBill.alreadyPosted === true,
    "T-22-IDEMPOTENT",
    `Re-posting the same Vendor Bill returns alreadyPosted=true without duplicate journal`
  );

  // 2. Try to create/post a SECOND bill for the same 8 units that were already billed
  let t22Blocked = false;
  try {
    await createVendorBill({
      purchaseOrderId: poT15.id,
      receiptId: receiptT17.id,
      lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
      actor: actorFin,
    });
  } catch (err: any) {
    t22Blocked = true;
    assert(
      err.message.includes("Three-Way Match Gagal") || err.message.includes("Sudah Ditagih"),
      "T-22",
      `Creating duplicate bill for already-billed units blocked: "${err.message}"`
    );
  }
  assert(t22Blocked, "T-22-VERIFY", "Duplicate billing strictly prevented by 3-Way Match engine");

  console.log("\n=================================================================");
  console.log(`🏁 PHASE 5 TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================================");

  if (passed === total) {
    console.log("🎉 ALL TESTS T-15, T-16, T-17, T-18, T-21, T-22 COMPLETED WITH 100% SUCCESS AND ZERO DEFECTS!");
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
  }
}

runPhase5Tests()
  .catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
