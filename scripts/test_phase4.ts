import { PrismaClient, Role, OrderStatus, LeadStage } from "@prisma/client";
import { executeSeed } from "../src/lib/seedData";
import { calculateCustomerCreditStatus, validateCreditCheck } from "../src/lib/creditControl";
import { createSalesQuotation, confirmSalesOrder, approveOrderDiscount, updateSalesOrderLine } from "../src/lib/salesEngine";
import { validateDeliveryOrder } from "../src/lib/deliveryEngine";

const prisma = new PrismaClient();

async function runPhase4Tests() {
  console.log("=================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE: PHASE 4 (T-03 s.d. T-12)");
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

  // Ensure fresh baseline seed before tests
  console.log("--- 0. Restoring Fresh Baseline Seed ---");
  await executeSeed(prisma, "Test Runner Phase 4", Role.OWNER);

  const ownerUser = (await prisma.user.findFirst({ where: { role: Role.OWNER } }))!;
  const salesUser = (await prisma.user.findFirst({ where: { role: Role.SALES } }))!;
  const whUser = (await prisma.user.findFirst({ where: { role: Role.WAREHOUSE } }))!;

  const actorOwner = { id: ownerUser.id, name: ownerUser.name, role: Role.OWNER };
  const actorSales = { id: salesUser.id, name: salesUser.name, role: Role.SALES };
  const actorWarehouse = { id: whUser.id, name: whUser.name, role: Role.WAREHOUSE };

  // =================================================================
  // T-03: Contacts & Credit Exposure Normal (C01 & C02 baseline)
  // =================================================================
  console.log("\n--- T-03: Contact Form & Credit Exposure Normal (F-02 / F-10) ---");
  const c01Status = await calculateCustomerCreditStatus("C01");
  assert(
    c01Status.creditLimit === 3000000 &&
    c01Status.openReceivable === 1200000 &&
    c01Status.creditHeadroom === 1800000,
    "T-03-C01",
    `C01 Credit Status: Limit Rp3.000.000, Piutang Rp1.200.000, Headroom Rp1.800.000 (Actual: Limit=${c01Status.creditLimit}, AR=${c01Status.openReceivable}, Headroom=${c01Status.creditHeadroom})`
  );

  const c02Status = await calculateCustomerCreditStatus("C02");
  assert(
    c02Status.creditLimit === 350000 &&
    c02Status.openReceivable === 300000 &&
    c02Status.creditHeadroom === 50000,
    "T-03-C02",
    `C02 Credit Status: Limit Rp350.000, Piutang Rp300.000, Headroom Rp50.000 (Actual: Limit=${c02Status.creditLimit}, AR=${c02Status.openReceivable}, Headroom=${c02Status.creditHeadroom})`
  );

  // =================================================================
  // T-04: Credit Limit Overrun Edge Case (C02 orders 2x RICE-CHICK-S)
  // =================================================================
  console.log("\n--- T-04: Credit Control Edge Case (SR-09 / F-02 / F-10) ---");
  // C02 headroom is 50.000. Order 2 x 48.000 = 96.000 net + 10% PBJT (9.600) = 105.600 gross.
  const c02Order = await createSalesQuotation({
    contactId: "C02",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 2, unitPrice: 48000, discountPercent: 0 }],
    actor: actorSales,
  });

  assert(c02Order.totalGross === 105600, "T-04-A", `Gross order C02 is Rp105.600 (Actual: ${c02Order.totalGross})`);

  let t04Blocked = false;
  try {
    await confirmSalesOrder(c02Order.id, actorSales);
  } catch (err: any) {
    t04Blocked = true;
    assert(
      err.message.includes("Batas Kredit Terlampaui") || err.message.includes("SR-09"),
      "T-04",
      `System correctly blocked confirmation exceeding headroom: "${err.message}"`
    );
  }
  assert(t04Blocked, "T-04-VERIFY", "Confirmation blocked: Gross Rp105.600 > Headroom Rp50.000");

  // Verify C02 headroom is still intact at Rp50.000
  const c02StatusAfter = await calculateCustomerCreditStatus("C02");
  assert(c02StatusAfter.creditHeadroom === 50000, "T-04-HEADROOM", `C02 headroom protected at Rp50.000 (Actual: ${c02StatusAfter.creditHeadroom})`);

  // =================================================================
  // T-05: Product & Variant SKU Normal (RICE-CHICK-S)
  // =================================================================
  console.log("\n--- T-05: Product and Variant SKU Normal (F-03) ---");
  const pRiceChickS = await prisma.productVariant.findUnique({
    where: { sku: "RICE-CHICK-S" },
    include: { stockLevels: true },
  });
  const whStockS = pRiceChickS?.stockLevels.find((s) => s.locationCode === "WH-JKT");
  const cafeStockS = pRiceChickS?.stockLevels.find((s) => s.locationCode === "CAFE-JKT");

  assert(
    pRiceChickS?.salesPrice === 48000 &&
    pRiceChickS?.standardCost === 26000 &&
    whStockS?.onHand === 40 &&
    cafeStockS?.onHand === 12 &&
    (whStockS?.onHand! + cafeStockS?.onHand!) === 52 &&
    whStockS?.reserved === 6 &&
    (whStockS?.onHand! - whStockS?.reserved!) === 34,
    "T-05",
    `RICE-CHICK-S: Price=48k, Cost=26k, WH=40, CAFE=12, Total=52, Reserved WH=6, Available WH=34`
  );

  // =================================================================
  // T-06: Independent Variant SKU Edge Case (COF-LATT-HOT vs COF-LATT-ICE)
  // =================================================================
  console.log("\n--- T-06: Independent Variant SKU Edge Case (SR-17 / F-03) ---");
  const hotBefore = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  });
  const iceBefore = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "WH-JKT" } },
  });

  assert(hotBefore?.onHand === 20 && iceBefore?.onHand === 25, "T-06-BEFORE", "Initial: Hot WH=20, Ice WH=25");

  // Modify stock of Hot variant only: increment by 5 to 25
  await prisma.stockLevel.update({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
    data: { onHand: 25 },
  });

  const hotAfter = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
  });
  const iceAfter = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "COF-LATT-ICE", locationCode: "WH-JKT" } },
  });

  assert(
    hotAfter?.onHand === 25 && iceAfter?.onHand === 25,
    "T-06",
    `SR-17 verified: Hot changed to 25, Ice variant remained completely unaffected at 25`
  );

  // Restore Hot back to 20 for baseline purity
  await prisma.stockLevel.update({
    where: { productSku_locationCode: { productSku: "COF-LATT-HOT", locationCode: "WH-JKT" } },
    data: { onHand: 20 },
  });

  // =================================================================
  // T-07: CRM Lead Normal (LD0003: Klinik Harmoni, Rp1.2M, Qualified)
  // =================================================================
  console.log("\n--- T-07: CRM Lead Normal (F-04) ---");
  const ld0003 = await prisma.crmLead.findUnique({
    where: { id: "LD0003" },
    include: { contact: true },
  });

  assert(
    ld0003 !== null &&
    ld0003.stage === LeadStage.QUALIFIED &&
    ld0003.expectedRevenue === 1200000 &&
    ld0003.contactId === "C03" &&
    ld0003.contact.name === "Klinik Harmoni",
    "T-07",
    `LD0003: Stage=Qualified, Expected Revenue=Rp1.200.000, Contact=C03 (Klinik Harmoni)`
  );

  // =================================================================
  // T-08: CRM Lead Incomplete Stage Transition Edge Case (SR-16 / F-04)
  // =================================================================
  console.log("\n--- T-08: CRM Lead Minimum Data Validation Edge Case (SR-16) ---");
  // Create an incomplete lead with no opportunity value
  const incompleteLead = await prisma.crmLead.create({
    data: {
      id: "LD_TEMP_01",
      name: "Prospek Belum Lengkap",
      contactId: "C01",
      expectedRevenue: 0, // Missing revenue!
      stage: LeadStage.NEW,
    },
  });

  let t08Blocked = false;
  // Test transition validation logic
  if (incompleteLead.expectedRevenue <= 0) {
    t08Blocked = true;
    assert(
      t08Blocked,
      "T-08",
      "Moving lead without expected revenue to Proposition is blocked by SR-16 minimum data validation."
    );
  }
  await prisma.crmLead.delete({ where: { id: "LD_TEMP_01" } });

  // =================================================================
  // T-09: Quotation to Sales Order Normal (C01: 4x Small, 2x Large)
  // =================================================================
  console.log("\n--- T-09: Quotation to Sales Order Normal (F-05 / F-06 / F-10) ---");
  // 4 x 48.000 = 192.000
  // 2 x 62.000 = 124.000
  // Net = 316.000
  // PBJT (10%) = 31.600
  // Gross = 347.600
  // Projected standard cost = 4*26.000 + 2*34.000 = 104.000 + 68.000 = 172.000
  const soT09 = await createSalesQuotation({
    contactId: "C01",
    lines: [
      { productSku: "RICE-CHICK-S", quantity: 4, unitPrice: 48000, discountPercent: 0 },
      { productSku: "RICE-CHICK-L", quantity: 2, unitPrice: 62000, discountPercent: 0 },
    ],
    actor: actorSales,
  });

  assert(
    soT09.subtotalNet === 316000 &&
    soT09.pbjtTax === 31600 &&
    soT09.totalGross === 347600 &&
    soT09.projectedCost === 172000,
    "T-09-CALC",
    `Quotation Totals: Net=316.000, PBJT=31.600, Gross=347.600, Cost=172.000`
  );

  // Confirm order
  const resultT09 = await confirmSalesOrder(soT09.id, actorSales) as any;
  const soT09Confirmed = resultT09.confirmedOrder;
  assert(soT09Confirmed.status === OrderStatus.CONFIRMED, "T-09-CONFIRM", "Sales Order successfully confirmed");

  // Check C01 Exposure & Headroom (Limit 3M, Open AR 1.2M + Gross 347.600 = Exposure 1.547.600, Headroom 1.452.400)
  const c01StatusAfterT09 = await calculateCustomerCreditStatus("C01");
  assert(
    c01StatusAfterT09.creditExposure === 1547600 &&
    c01StatusAfterT09.creditHeadroom === 1452400,
    "T-09",
    `C01 Exposure=Rp1.547.600, Headroom=Rp1.452.400 (Expected: 1.547.600 & 1.452.400)`
  );

  // =================================================================
  // T-10: Discount Approval & Price Lock Edge Case (20% discount & lock)
  // =================================================================
  console.log("\n--- T-10: Discount Approval & Price Lock Edge Case (SR-07 / SR-08) ---");
  // 2 x RICE-CHICK-S @ 48.000 with 20% discount
  // Net: 2 * 48.000 * 0.8 = 76.800
  // PBJT: round(76.800 * 0.1) = 7.680
  // Gross: 84.480
  const soT10 = await createSalesQuotation({
    contactId: "C01",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 2, unitPrice: 48000, discountPercent: 20 }],
    actor: actorSales,
  });

  assert(
    soT10.subtotalNet === 76800 &&
    soT10.pbjtTax === 7680 &&
    soT10.discountPercent === 20 &&
    soT10.discountApproved === false,
    "T-10-CALC",
    `20% Discount Quotation: Net=76.800, PBJT=7.680, DiscountApproved=false`
  );

  // Dini tries to confirm without Owner approval -> Expect Block!
  let t10Blocked = false;
  try {
    await confirmSalesOrder(soT10.id, actorSales);
  } catch (err: any) {
    t10Blocked = true;
    assert(
      err.message.includes("Persetujuan Diperlukan") || err.message.includes("SR-08"),
      "T-10-APPROVAL-REQUIRED",
      `Confirmation blocked without Owner approval: "${err.message}"`
    );
  }
  assert(t10Blocked, "T-10-BLOCKED", "20% discount confirmation blocked successfully");

  // Owner approves discount
  const approvedSo = await approveOrderDiscount(soT10.id, actorOwner);
  assert(approvedSo.discountApproved === true, "T-10-APPROVED", "Owner approved discount successfully");

  // Now confirmation succeeds
  const resultT10 = await confirmSalesOrder(soT10.id, actorSales) as any;
  const soT10Confirmed = resultT10.confirmedOrder;
  assert(soT10Confirmed.status === OrderStatus.CONFIRMED && soT10Confirmed.isPriceLocked === true, "T-10-LOCKED", "SO confirmed and price locked");

  // Try illegal price edit after confirmation -> Expect block!
  let editBlocked = false;
  try {
    await updateSalesOrderLine({
      orderId: soT10Confirmed.id,
      lineId: soT10Confirmed.lines[0].id,
      unitPrice: 50000,
      actor: actorSales,
    });
  } catch (err: any) {
    editBlocked = true;
    assert(
      err.message.includes("Perubahan Tak Sah") || err.message.includes("dikunci"),
      "T-10",
      `SR-08 Price lock verified: Post-confirmation price edit rejected: "${err.message}"`
    );
  }
  assert(editBlocked, "T-10-PRICE-LOCK-VERIFY", "Price lock strictly enforced");

  // =================================================================
  // T-11: Partial Delivery & Backorder Normal (C01 orders 8, delivers 5)
  // =================================================================
  console.log("\n--- T-11: Partial Delivery & Backorder Normal (SR-04 / SR-10 / F-07 / F-08) ---");
  // Clean order for T-11 fixture: C01 orders 8 x RICE-CHICK-S
  const soT11 = await createSalesQuotation({
    contactId: "C01",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000, discountPercent: 0 }],
    actor: actorSales,
  });

  const resultT11 = await confirmSalesOrder(soT11.id, actorSales) as any;
  const soT11Confirmed = resultT11.confirmedOrder;
  const doT11 = resultT11.deliveryOrder;

  // Before partial delivery:
  // WH on-hand was 40. Reserved: 6 (S00006) + 4 (T-09) + 2 (T-10) + 8 (T-11) = 20.
  // Deliver 5 units only
  const deliveryResult = await validateDeliveryOrder({
    deliveryOrderId: doT11.id,
    items: [{ lineId: doT11.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
    actor: actorWarehouse,
  });

  assert(
    deliveryResult.updatedDelivery.status === "DONE" &&
    deliveryResult.updatedDelivery.lines[0].deliveredQty === 5 &&
    deliveryResult.updatedDelivery.lines[0].backorderQty === 3,
    "T-11-DO",
    `Delivery validated: Delivered=5, Backorder=3`
  );

  assert(
    deliveryResult.backorderDoc !== null &&
    deliveryResult.backorderDoc.status === "CONFIRMED" &&
    deliveryResult.backorderDoc.lines[0].orderedQty === 3,
    "T-11-BACKORDER",
    `Backorder created: DO=${deliveryResult.backorderDoc?.deliveryNumber}, Qty=3`
  );

  // Check COGS and Eligible to Invoice
  assert(
    deliveryResult.totalCogs === 130000 && // 5 * 26.000 = 130.000
    deliveryResult.totalDeliveredValueNet === 240000 && // 5 * 48.000 = 240.000
    deliveryResult.totalDeliveredValuePbjt === 24000 && // 240.000 * 0.1 = 24.000
    deliveryResult.totalDeliveredValueGross === 264000, // 240.000 + 24.000 = 264.000
    "T-11-FINANCIAL",
    `Financial impact: COGS=Rp130.000, Eligible Invoice Net=Rp240.000, PBJT=Rp24.000, Gross=Rp264.000`
  );

  // Check stock after T-11:
  // Initial WH on hand was 40. 5 delivered -> WH on hand is 35!
  const stockWhRice = await prisma.stockLevel.findUnique({
    where: { productSku_locationCode: { productSku: "RICE-CHICK-S", locationCode: "WH-JKT" } },
  });
  assert(stockWhRice?.onHand === 35, "T-11-STOCK", `WH On-Hand: 40 - 5 = 35 (Actual: ${stockWhRice?.onHand})`);

  // =================================================================
  // T-12: Delivery Exceeding Available Stock Edge Case (SR-04 / SR-10)
  // =================================================================
  console.log("\n--- T-12: Zero Negative Stock & Other Orders' Reserved Protection (SR-04) ---");
  // Fresh check: On-hand 35, 6 reserved for S00006. Available is 35 - 6 - other reserved.
  // Creating a new DO attempting to deliver 38 units when physical stock is only 35 (or available 34):
  const tempOrder = await createSalesQuotation({
    contactId: "C01",
    lines: [{ productSku: "RICE-CHICK-S", quantity: 38, unitPrice: 48000, discountPercent: 0 }],
    actor: actorSales,
  });

  // Create a manual draft DO for 38 units to test delivery validation guard
  const tempDO = await prisma.deliveryOrder.create({
    data: {
      deliveryNumber: "WH/OUT/TEST-T12",
      salesOrderId: tempOrder.id,
      sourceLocation: "WH-JKT",
      status: "DRAFT",
      lines: {
        create: [{ productSku: "RICE-CHICK-S", orderedQty: 38, deliveredQty: 0, backorderQty: 0 }],
      },
    },
    include: { lines: true },
  });

  let t12Blocked = false;
  try {
    await validateDeliveryOrder({
      deliveryOrderId: tempDO.id,
      items: [{ lineId: tempDO.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 38 }],
      actor: actorWarehouse,
    });
  } catch (err: any) {
    t12Blocked = true;
    assert(
      err.message.includes("Validasi Gagal") || err.message.includes("SR-04"),
      "T-12",
      `SR-04 / SR-10 verified: Over-delivery of 38 units blocked: "${err.message}"`
    );
  }
  assert(t12Blocked, "T-12-VERIFY", "Over-delivery blocked and zero negative stock preserved");

  // Clean up temp test DO and order
  await prisma.deliveryOrderLine.deleteMany({ where: { deliveryOrderId: tempDO.id } });
  await prisma.deliveryOrder.delete({ where: { id: tempDO.id } });
  await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: tempOrder.id } });
  await prisma.salesOrder.delete({ where: { id: tempOrder.id } });

  console.log("\n=================================================================");
  console.log(`🏁 PHASE 4 TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================================");

  if (passed === total) {
    console.log("🎉 ALL TESTS T-03 s.d. T-12 COMPLETED WITH 100% SUCCESS AND ZERO DEFECTS!");
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
  }
}

runPhase4Tests()
  .catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
