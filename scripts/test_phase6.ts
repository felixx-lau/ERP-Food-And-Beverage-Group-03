import { PrismaClient, Role, OrderStatus } from "@prisma/client";
import { executeSeed } from "../src/lib/seedData";
import { createSalesQuotation, confirmSalesOrder } from "../src/lib/salesEngine";
import { validateDeliveryOrder } from "../src/lib/deliveryEngine";
import { createCustomerInvoice, postCustomerInvoice, registerCustomerPayment } from "../src/lib/accountingEngine";

const prisma = new PrismaClient();

async function runPhase6Tests() {
  console.log("=================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASE 6 (T-19, T-20, T-23 s.d. T-26)");
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
  await executeSeed(prisma, "Test Runner Phase 6", Role.OWNER);

  const ownerUser = (await prisma.user.findFirst({ where: { role: Role.OWNER } }))!;
  const salesUser = (await prisma.user.findFirst({ where: { role: Role.SALES } }))!;
  const whUser = (await prisma.user.findFirst({ where: { role: Role.WAREHOUSE } }))!;
  const financeUser = (await prisma.user.findFirst({ where: { role: Role.FINANCE } }))!;

  const actorOwner = { id: ownerUser.id, name: ownerUser.name, role: Role.OWNER };
  const actorSales = { id: salesUser.id, name: salesUser.name, role: Role.SALES };
  const actorWH = { id: whUser.id, name: whUser.name, role: Role.WAREHOUSE };
  const actorFin = { id: financeUser.id, name: financeUser.name, role: Role.FINANCE };

  // =================================================================
  // Setup Fixture T-11: C01 order 8 x RICE-CHICK-S, deliver 5 units
  // =================================================================
  console.log("\n--- Setting up Fixture T-11 (8 Ordered, 5 Delivered) ---");
  const soT11 = await createSalesQuotation({
    contactId: "C01",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000, discountPercent: 0 }],
    actor: actorSales,
  });

  const confirmRes = (await confirmSalesOrder(soT11.id, actorSales)) as any;
  const doT11 = confirmRes.deliveryOrder;

  const deliveryRes = await validateDeliveryOrder({
    deliveryOrderId: doT11.id,
    items: [{ lineId: doT11.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
    actor: actorWH,
  });

  assert(
    deliveryRes.updatedDelivery.lines[0].deliveredQty === 5,
    "FIXTURE-T11",
    "T-11 Fixture ready: 5 units of RICE-CHICK-S delivered, 3 units backorder"
  );

  // =================================================================
  // T-20: Invoicing Policy Edge Case: Try to invoice 8 when delivered only 5 (SR-01 vs SR-02)
  // =================================================================
  console.log("\n--- T-20: Invoicing Policy Edge Case (SR-01 / SR-02 / F-09) ---");
  let t20Blocked = false;
  try {
    // Attempt to bill 8 units (ordered qty)
    await createCustomerInvoice({
      salesOrderId: soT11.id,
      deliveryOrderId: doT11.id,
      lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000 }],
      actor: actorFin,
    });
  } catch (err: any) {
    t20Blocked = true;
    assert(
      err.message.includes("Validasi Penagihan Gagal") || err.message.includes("SR-02"),
      "T-20",
      `SR-02 delivery-based invoicing enforced: Invoicing 8 units blocked when only 5 delivered: "${err.message}"`
    );
  }
  assert(t20Blocked, "T-20-VERIFY", "Attempt to invoice un-delivered units (8 requested vs 5 delivered) blocked");

  // =================================================================
  // T-19: Customer Invoice Normal (5 delivered RICE-CHICK-S, PBJT 10%)
  // =================================================================
  console.log("\n--- T-19: Customer Invoice Normal & PBJT 10% (Fitur F-09 / F-22) ---");
  const invoiceT19 = await createCustomerInvoice({
    salesOrderId: soT11.id,
    deliveryOrderId: doT11.id,
    lines: [{ productSku: "RICE-CHICK-S", quantity: 5, unitPrice: 48000 }],
    actor: actorFin,
  });

  assert(
    invoiceT19.subtotalNet === 240000 &&
    invoiceT19.pbjtTax === 24000 &&
    invoiceT19.totalGross === 264000,
    "T-19-CALC",
    `Invoice calculations: Net Rp240.000, PBJT 10% Rp24.000, Gross Rp264.000`
  );

  // Post Customer Invoice
  const postResT19 = (await postCustomerInvoice(invoiceT19.id, actorFin)) as any;
  const jeInvoice = postResT19.journalEntry;

  const drAr = jeInvoice.items.find((i: any) => i.accountCode === "1020");
  const crRevenue = jeInvoice.items.find((i: any) => i.accountCode === "4010");
  const crPbjt = jeInvoice.items.find((i: any) => i.accountCode === "2020");

  assert(
    postResT19.invoice.status === "POSTED" &&
    drAr?.debit === 264000 &&
    crRevenue?.credit === 240000 &&
    crPbjt?.credit === 24000 &&
    drAr?.debit === (crRevenue?.credit + crPbjt?.credit),
    "T-19",
    `Journal ${jeInvoice.entryNumber}: Dr 1020 A/R Rp264.000 = Cr 4010 Revenue Rp240.000 + Cr 2020 PBJT Rp24.000. Balanced Dr=Cr.`
  );

  // =================================================================
  // T-24: Overpayment Guard Edge Case: Try to pay Rp300.000 on outstanding Rp264.000 (SR-19)
  // =================================================================
  console.log("\n--- T-24: Overpayment Guard Edge Case (SR-19 / F-15) ---");
  let t24Blocked = false;
  try {
    await registerCustomerPayment({
      invoiceId: invoiceT19.id,
      paymentMethod: "BANK",
      amount: 300000, // Exceeds outstanding 264.000!
      actor: actorFin,
    });
  } catch (err: any) {
    t24Blocked = true;
    assert(
      err.message.includes("Validasi Pembayaran Gagal") || err.message.includes("SR-19"),
      "T-24",
      `SR-19 verified: Overpayment of Rp300.000 on outstanding Rp264.000 rejected: "${err.message}"`
    );
  }
  assert(t24Blocked, "T-24-VERIFY", "Overpayment strictly blocked");

  // =================================================================
  // T-23: Partial Payment Normal (Pay Rp100.000 via Bank)
  // =================================================================
  console.log("\n--- T-23: Partial Payment Normal (Fitur F-15) ---");
  const bankBefore = (await prisma.account.findUnique({ where: { code: "1010" } }))!.currentBalance;
  const arBefore = (await prisma.account.findUnique({ where: { code: "1020" } }))!.currentBalance;

  const paymentRes = await registerCustomerPayment({
    invoiceId: invoiceT19.id,
    paymentMethod: "BANK",
    amount: 100000, // Partial payment
    actor: actorFin,
  });

  const bankAfter = (await prisma.account.findUnique({ where: { code: "1010" } }))!.currentBalance;
  const arAfter = (await prisma.account.findUnique({ where: { code: "1020" } }))!.currentBalance;

  const jePayment = paymentRes.journalEntry;
  const drBank = jePayment.items.find((i: any) => i.accountCode === "1010");
  const crArPay = jePayment.items.find((i: any) => i.accountCode === "1020");

  assert(
    paymentRes.updatedInvoice.paidAmount === 100000 &&
    paymentRes.updatedInvoice.outstandingAmount === 164000 &&
    paymentRes.updatedInvoice.status === "POSTED" &&
    bankAfter - bankBefore === 100000 &&
    arBefore - arAfter === 100000 &&
    drBank?.debit === 100000 &&
    crArPay?.credit === 100000,
    "T-23",
    `Payment registered: Gross Rp264.000, Paid Rp100.000, Outstanding Rp164.000. Bank +Rp100.000, A/R -Rp100.000. Journal: Dr Bank Rp100.000 = Cr A/R Rp100.000.`
  );

  // =================================================================
  // T-25: General Ledger Delivery + Invoice Journal Verification (Fitur F-14)
  // =================================================================
  console.log("\n--- T-25: Ledger and COGS Journal Normal (Fitur F-14) ---");
  // Delivery Journal: Dr 5010 COGS Rp130.000 = Cr 1030 Inventory Rp130.000
  const jeDelivery = await prisma.journalEntry.findFirst({
    where: { sourceDocument: doT11.deliveryNumber },
    include: { items: true },
  });
  const drCogs = jeDelivery?.items.find((i) => i.accountCode === "5010");
  const crInv = jeDelivery?.items.find((i) => i.accountCode === "1030");

  assert(
    jeDelivery !== null &&
    drCogs?.debit === 130000 &&
    crInv?.credit === 130000,
    "T-25-DELIVERY-JOURNAL",
    `Delivery Journal: Dr 5010 COGS Rp130.000 = Cr 1030 Inventory Rp130.000`
  );

  // Invoice Journal: Dr 1020 A/R Rp264.000 = Cr 4010 Revenue Rp240.000 + Cr 2020 PBJT Rp24.000
  const jeInvCheck = await prisma.journalEntry.findFirst({
    where: { sourceDocument: invoiceT19.invoiceNumber },
    include: { items: true },
  });
  const drArCheck = jeInvCheck?.items.find((i) => i.accountCode === "1020");
  const crRevCheck = jeInvCheck?.items.find((i) => i.accountCode === "4010");
  const crPbjtCheck = jeInvCheck?.items.find((i) => i.accountCode === "2020");

  assert(
    jeInvCheck !== null &&
    drArCheck?.debit === 264000 &&
    crRevCheck?.credit === 240000 &&
    crPbjtCheck?.credit === 24000,
    "T-25-INVOICE-JOURNAL",
    `Invoice Journal: Dr 1020 A/R Rp264.000 = Cr Revenue Rp240.000 + Cr PBJT Rp24.000`
  );

  // Combined total debit and credit check: Rp130.000 + Rp264.000 = Rp394.000
  const totalDrCombined = (drCogs?.debit || 0) + (drArCheck?.debit || 0);
  const totalCrCombined = (crInv?.credit || 0) + (crRevCheck?.credit || 0) + (crPbjtCheck?.credit || 0);

  assert(
    totalDrCombined === 394000 && totalCrCombined === 394000 && totalDrCombined === totalCrCombined,
    "T-25",
    `Total Combined Debit = Credit = Rp394.000 (Dr Rp394.000 = Cr Rp394.000). Double-entry balanced perfectly.`
  );

  // =================================================================
  // T-26: Re-posting Delivery / Invoice Idempotency Check (SR-13 / F-14)
  // =================================================================
  console.log("\n--- T-26: Document Re-posting Idempotency (SR-13 / F-14) ---");
  const journalCountBefore = await prisma.journalEntry.count();
  const cogsAccountBefore = (await prisma.account.findUnique({ where: { code: "5010" } }))!.currentBalance;

  // 1. Retry validate already DONE delivery
  const retryDelivery = await validateDeliveryOrder({
    deliveryOrderId: doT11.id,
    items: [{ lineId: doT11.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
    actor: actorWH,
  });

  // 2. Retry post already POSTED invoice
  const retryInvoice = (await postCustomerInvoice(invoiceT19.id, actorFin)) as any;

  const journalCountAfter = await prisma.journalEntry.count();
  const cogsAccountAfter = (await prisma.account.findUnique({ where: { code: "5010" } }))!.currentBalance;

  assert(
    retryInvoice.alreadyPosted === true &&
    journalCountBefore === journalCountAfter &&
    cogsAccountBefore === cogsAccountAfter,
    "T-26",
    `SR-13 verified: Re-posting delivery/invoice is idempotent. Journal count remains ${journalCountAfter}, COGS balance intact at Rp ${cogsAccountAfter.toLocaleString("id-ID")} (zero duplicate journals).`
  );

  console.log("\n=================================================================");
  console.log(`🏁 PHASE 6 TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================================");

  if (passed === total) {
    console.log("🎉 ALL TESTS T-19, T-20, T-23, T-24, T-25, T-26 COMPLETED WITH 100% SUCCESS AND ZERO DEFECTS!");
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
  }
}

runPhase6Tests()
  .catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
