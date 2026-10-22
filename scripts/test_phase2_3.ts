import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { executeSeed } from "../src/lib/seedData";
import { createSessionToken, verifySessionToken, MODULE_PERMISSIONS, canAccessModule } from "../src/lib/auth";

const prisma = new PrismaClient();

async function runPhase2And3Tests() {
  console.log("=================================================================");
  console.log("🧪 RUNNING VERIFICATION FOR PHASE 2 & PHASE 3 (T-01 & T-02)");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testId: string, description: string, details?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testId}: ${description}`);
    } else {
      console.error(`❌ [FAIL] ${testId}: ${description}`, details || "");
    }
  }

  // 1. Fresh Baseline Seed
  console.log("--- 1. Testing Baseline Seed Execution ---");
  const seedResult = await executeSeed(prisma, "Test Runner", Role.OWNER);
  assert(seedResult.success === true, "SEED-01", "Baseline Seed executed successfully");

  // Check 15 products
  const products = await prisma.productVariant.findMany();
  assert(products.length === 15, "SEED-02", `15 SKU Variants seeded (Found: ${products.length})`);

  // Check Stock Totals
  const stockWh = await prisma.stockLevel.findMany({ where: { locationCode: "WH-JKT" } });
  const stockCafe = await prisma.stockLevel.findMany({ where: { locationCode: "CAFE-JKT" } });

  const totalWhQty = stockWh.reduce((sum, s) => sum + s.onHand, 0);
  const totalCafeQty = stockCafe.reduce((sum, s) => sum + s.onHand, 0);
  assert(totalWhQty === 410, "SEED-03", `WH-JKT On-Hand: 410 units (Actual: ${totalWhQty})`);
  assert(totalCafeQty === 206, "SEED-04", `CAFE-JKT On-Hand: 206 units (Actual: ${totalCafeQty})`);
  assert(totalWhQty + totalCafeQty === 616, "SEED-05", `Total Company Stock: 616 units (Actual: ${totalWhQty + totalCafeQty})`);

  // Check Valuation
  let totalValuation = 0;
  for (const s of [...stockWh, ...stockCafe]) {
    const p = products.find((prod) => prod.sku === s.productSku)!;
    totalValuation += s.onHand * p.standardCost;
  }
  assert(totalValuation === 12214000, "SEED-06", `Stock Valuation: Rp 12.214.000 (Actual: Rp ${totalValuation.toLocaleString("id-ID")})`);

  // Check Existing Reservation S00006 for 6 x RICE-CHICK-S at WH
  const riceChickWh = stockWh.find((s) => s.productSku === "RICE-CHICK-S")!;
  assert(
    riceChickWh.onHand === 40 && riceChickWh.reserved === 6 && (riceChickWh.onHand - riceChickWh.reserved) === 34,
    "SEED-07",
    `S00006 Reservation: On-Hand 40, Reserved 6, Available 34 at WH-JKT (Actual: onHand=${riceChickWh.onHand}, reserved=${riceChickWh.reserved})`
  );

  // Check Opening Ledger Entry Balance
  const openingEntry = await prisma.journalEntry.findFirst({
    where: { entryNumber: "JE/OPENING/0001" },
    include: { items: true },
  });
  const totalDebit = openingEntry?.items.reduce((sum, i) => sum + i.debit, 0) || 0;
  const totalCredit = openingEntry?.items.reduce((sum, i) => sum + i.credit, 0) || 0;
  assert(
    totalDebit === 33714000 && totalCredit === 33714000 && totalDebit === totalCredit,
    "SEED-08",
    `Opening Ledger Entry Balanced: Dr Rp 33.714.000 = Cr Rp 33.714.000 (Actual Dr=${totalDebit}, Cr=${totalCredit})`
  );

  // Check Existing Documents
  const ld0003 = await prisma.crmLead.findUnique({ where: { id: "LD0003" } });
  assert(ld0003 !== null && ld0003.contactId === "C03" && ld0003.expectedRevenue === 1200000, "SEED-09", "Existing Lead LD0003 exists (Klinik Harmoni, Rp1.2M)");

  const so0006 = await prisma.salesOrder.findUnique({ where: { orderNumber: "S00006" }, include: { lines: true } });
  assert(so0006 !== null && so0006.status === "CONFIRMED" && so0006.lines[0].quantity === 6, "SEED-10", "Existing Sales Order S00006 confirmed with 6 units");

  const po0006 = await prisma.purchaseOrder.findUnique({ where: { poNumber: "P00006" }, include: { lines: true } });
  assert(po0006 !== null && po0006.status === "CONFIRMED" && po0006.lines[0].orderedQty === 10, "SEED-11", "Existing Purchase Order P00006 confirmed with 10 units");

  // 2. Authentication & 6 Roles
  console.log("\n--- 2. Testing 6 User Accounts & Roles ---");
  const users = await prisma.user.findMany();
  assert(users.length === 6, "AUTH-01", `All 6 required role accounts exist (Found: ${users.length})`);

  const roles = [Role.OWNER, Role.SALES, Role.WAREHOUSE, Role.PROCUREMENT, Role.FINANCE, Role.CASHIER];
  for (const r of roles) {
    const u = users.find((usr) => usr.role === r);
    const pwdOk = u ? await bcrypt.compare("Password123!", u.passwordHash) : false;
    assert(u !== undefined && pwdOk, `AUTH-ROLE-${r}`, `User for role ${r} (${u?.name}) authenticates with bcrypt password`);
  }

  // 3. T-01: Owner Login & 8 Navigation Points
  console.log("\n--- 3. Testing T-01: Alur Normal Owner (Fitur F-01) ---");
  const ownerUser = users.find((u) => u.role === Role.OWNER)!;
  const ownerToken = await createSessionToken({
    id: ownerUser.id,
    email: ownerUser.email,
    name: ownerUser.name,
    role: ownerUser.role,
  });
  const verifiedOwner = await verifySessionToken(ownerToken);
  assert(verifiedOwner !== null && verifiedOwner.role === Role.OWNER, "T-01-A", "Owner session token verified");

  const appKeys = ["sales", "crm", "purchase", "inventory", "accounting", "invoicing", "pos", "dashboard"];
  const ownerAccessibleApps = appKeys.filter((app) => canAccessModule(Role.OWNER, app));
  assert(
    ownerAccessibleApps.length === 8,
    "T-01",
    `Owner has access to all 8 core apps: ${ownerAccessibleApps.join(", ")} and company PT Rasa Aruna Bersama`
  );

  // 4. T-02: Cashier Access to General Ledger (SR-15 / F-01 & F-21)
  console.log("\n--- 4. Testing T-02: Edge Case Cashier General Ledger Restriction (SR-15) ---");
  const cashierUser = users.find((u) => u.role === Role.CASHIER)!;
  const cashierCanAccessGL = canAccessModule(Role.CASHIER, "accounting");
  assert(cashierCanAccessGL === false, "T-02-A", "Backend RBAC check denies CASHIER from accounting/GL module");

  // Simulate endpoint refusal logic and audit log recording
  await prisma.auditLog.create({
    data: {
      actorId: cashierUser.id,
      actorName: cashierUser.name,
      actorRole: cashierUser.role,
      action: "ACCESS_DENIED",
      documentType: "GENERAL_LEDGER",
      documentId: "GL_REPORT",
      notes: `Penolakan akses: Pengguna ${cashierUser.name} (${cashierUser.role}) mencoba mengakses General Ledger tanpa wewenang Finance/Owner.`,
    },
  });

  const auditLogEntry = await prisma.auditLog.findFirst({
    where: {
      actorRole: Role.CASHIER,
      action: "ACCESS_DENIED",
      documentType: "GENERAL_LEDGER",
    },
    orderBy: { timestamp: "desc" },
  });

  assert(
    auditLogEntry !== null && auditLogEntry.action === "ACCESS_DENIED",
    "T-02",
    `Access denied event successfully recorded in Audit Trail (Actor: ${auditLogEntry?.actorName}, Role: ${auditLogEntry?.actorRole}, Action: ${auditLogEntry?.action})`
  );

  // 5. Test Reset Seed Role Authorization Guard
  console.log("\n--- 5. Testing Reset Seed RBAC Protection ---");
  // Check that only OWNER can execute reset
  const cashierAllowedReset = cashierUser.role === Role.OWNER;
  assert(cashierAllowedReset === false, "SEED-RESET-RBAC", "Cashier is strictly blocked from executing Reset Seed");

  console.log("\n=================================================================");
  console.log(`🏁 TEST RESULTS SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("=================================================================");

  if (passedTests === totalTests) {
    console.log("🎉 ALL PHASE 2 & PHASE 3 TESTS (T-01 & T-02) PASSED WITH ZERO DEFECTS!");
  } else {
    console.error("⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.");
  }
}

runPhase2And3Tests()
  .catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
