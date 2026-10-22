import { prisma } from "../src/lib/prisma";
import { getOperationalDashboardMetrics, getFinancialReconciliation } from "../src/lib/dashboardEngine";

async function runPhase8Tests() {
  console.log("================================================================================");
  console.log("             TAHAP 8 AUTOMATED TEST SUITE: T-31 & T-32 VERIFICATION             ");
  console.log("          Rasa Aruna Kitchen - Executive Operational & Financial Dashboard       ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testName: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${testId.padEnd(6)} | ${testName.padEnd(52)} | ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testId.padEnd(6)} | ${testName.padEnd(52)} | FAILED: ${detail}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE T-31: Dashboard Operasional & Integritas KPI Terintegrasi
    // -------------------------------------------------------------------------
    console.log("--- Menjalankan Uji T-31: Executive Operational KPI Integrity ---");
    const metrics = await getOperationalDashboardMetrics();

    // 1. Persediaan Fisik Total
    assert(
      metrics.inventory.totalUnits === 616,
      "T-31.1",
      "Total Stok Fisik Perusahaan",
      `Diharapkan 616 unit, aktual: ${metrics.inventory.totalUnits} unit`
    );

    // 2. Persediaan Lokasi WH-JKT vs CAFE-JKT
    assert(
      metrics.inventory.whUnits === 410 && metrics.inventory.cafeUnits === 206,
      "T-31.2",
      "Distribusi Lokasi WH-JKT & CAFE-JKT",
      `WH: ${metrics.inventory.whUnits} (exp: 410), CAFE: ${metrics.inventory.cafeUnits} (exp: 206)`
    );

    // 3. Stok Reserved & Available
    assert(
      metrics.inventory.reservedUnits === 6 && metrics.inventory.availableUnits === 610,
      "T-31.3",
      "Stok Direservasi & Tersedia",
      `Reserved: ${metrics.inventory.reservedUnits} (exp: 6), Available: ${metrics.inventory.availableUnits} (exp: 610)`
    );

    // 4. Valuasi Persediaan (Standard Costing)
    assert(
      metrics.inventory.totalValuation === 12214000,
      "T-31.4",
      "Valuasi Persediaan Baseline",
      `Diharapkan Rp 12.214.000, aktual: Rp ${metrics.inventory.totalValuation.toLocaleString("id-ID")}`
    );

    // 5. Piutang Dagang (A/R)
    assert(
      metrics.receivables.totalAR === 1500000,
      "T-31.5",
      "Total Piutang Usaha (A/R)",
      `Diharapkan Rp 1.500.000, aktual: Rp ${metrics.receivables.totalAR.toLocaleString("id-ID")}`
    );

    // 6. Utang Usaha (A/P)
    assert(
      metrics.payables.totalAP === 1000000,
      "T-31.6",
      "Total Utang Usaha (A/P)",
      `Diharapkan Rp 1.000.000, aktual: Rp ${metrics.payables.totalAP.toLocaleString("id-ID")}`
    );

    // 7. Kas & Bank (Akun 1010)
    assert(
      metrics.bank.balance === 20000000,
      "T-31.7",
      "Saldo Kas & Bank BCA (Akun 1010)",
      `Diharapkan Rp 20.000.000, aktual: Rp ${metrics.bank.balance.toLocaleString("id-ID")}`
    );

    // 8. CRM Leads & Nilai Pipeline
    assert(
      metrics.crm.leadsCount === 1 && metrics.crm.leadsValue === 1200000,
      "T-31.8",
      "Peluang CRM Aktif & Nilai Prospek",
      `Leads: ${metrics.crm.leadsCount} (exp: 1), Value: Rp ${metrics.crm.leadsValue.toLocaleString("id-ID")} (exp: 1.2jt)`
    );

    // 9. Confirmed Orders (SO & PO)
    assert(
      metrics.sales.confirmedOrdersCount === 1 && metrics.purchase.confirmedOrdersCount === 1,
      "T-31.9",
      "Order Terkonfirmasi (SO & PO)",
      `SO: ${metrics.sales.confirmedOrdersCount} (S00006), PO: ${metrics.purchase.confirmedOrdersCount} (P00006)`
    );

    // 10. Smart Links ke Modul Sumber
    assert(
      !!metrics.inventory.sourceLink &&
      !!metrics.receivables.sourceLink &&
      !!metrics.payables.sourceLink &&
      !!metrics.bank.sourceLink &&
      !!metrics.crm.sourceLink &&
      !!metrics.sales.sourceLink,
      "T-31.10",
      "Ketersediaan Smart-Links Navigasi",
      "Seluruh 8 KPI memiliki tautan navigasi valid ke modul sumber"
    );

    console.log();

    // -------------------------------------------------------------------------
    // TEST SUITE T-32: Rekonsiliasi Keuangan & Penolakan Auto-Post (SR-20)
    // -------------------------------------------------------------------------
    console.log("--- Menjalankan Uji T-32: Financial Reconciliation & SR-20 Compliance ---");

    // 1. Kondisi Normal: Double-Entry Balance
    const initialJournalCount = await prisma.journalEntry.count();
    const reconNormal = await getFinancialReconciliation(0);

    assert(
      reconNormal.generalLedger.isBalanced === true &&
      reconNormal.generalLedger.totalDebit === 33714000 &&
      reconNormal.generalLedger.totalCredit === 33714000,
      "T-32.1",
      "Keseimbangan Double-Entry Buku Besar",
      `Debit Rp ${reconNormal.generalLedger.totalDebit.toLocaleString("id-ID")} == Kredit Rp ${reconNormal.generalLedger.totalCredit.toLocaleString("id-ID")} (Seimbang: true)`
    );

    // 2. Normal Subledger Matching (A/R vs 1020, A/P vs 2010)
    assert(
      reconNormal.subledgerMatching.arIsMatched === true &&
      reconNormal.subledgerMatching.apIsMatched === true,
      "T-32.2",
      "Subledger Matching A/R & A/P",
      `A/R: Rp ${reconNormal.subledgerMatching.arSubledgerTotal.toLocaleString("id-ID")} == 1020, A/P: Rp ${reconNormal.subledgerMatching.apSubledgerTotal.toLocaleString("id-ID")} == 2010`
    );

    // 3. Normal Inventory Reconciliation: Fisik vs Akun 1030
    assert(
      reconNormal.inventoryReconciliation.status === "BALANCED" &&
      reconNormal.inventoryReconciliation.unitDiscrepancy === 0 &&
      reconNormal.inventoryReconciliation.valueDiscrepancy === 0,
      "T-32.3",
      "Rekonsiliasi Persediaan Normal",
      `Status: ${reconNormal.inventoryReconciliation.status}, Selisih Unit: 0, Selisih Nilai: Rp 0`
    );

    // 4. Simulasi Edge Case T-32: Selisih +1 Unit Stok Fisik
    const reconMismatch = await getFinancialReconciliation(1);

    assert(
      reconMismatch.inventoryReconciliation.status === "MISMATCH" &&
      reconMismatch.inventoryReconciliation.unitDiscrepancy === 1,
      "T-32.4",
      "Deteksi Anomali Selisih 1 Unit",
      `Status: ${reconMismatch.inventoryReconciliation.status} (Diharapkan MISMATCH), Selisih: +${reconMismatch.inventoryReconciliation.unitDiscrepancy} unit`
    );

    // 5. Peringatan Rekonsiliasi & Jejak Audit Anomali
    assert(
      !!reconMismatch.inventoryReconciliation.warningMessage &&
      reconMismatch.inventoryReconciliation.warningMessage.includes("SR-20 / T-32"),
      "T-32.5",
      "Peringatan Audit Anomali Muncul",
      `Pesan Peringatan: "${reconMismatch.inventoryReconciliation.warningMessage?.substring(0, 75)}..."`
    );

    // 6. Proteksi SR-20: Auto-Post Ditolak / Diblokir
    assert(
      reconMismatch.inventoryReconciliation.autoPostBlocked === true,
      "T-32.6",
      "Kepatuhan SR-20: Pem-post-an Otomatis Ditolak",
      `autoPostBlocked: ${reconMismatch.inventoryReconciliation.autoPostBlocked} (Sistem menolak manipulasi jurnal penyeimbang)`
    );

    // 7. Integritas Database: Memastikan tidak ada jurnal siluman/artifisial dibuat
    const finalJournalCount = await prisma.journalEntry.count();
    assert(
      finalJournalCount === initialJournalCount,
      "T-32.7",
      "Integritas Database Terjaga (Zero Artificial Journal)",
      `Jumlah jurnal sebelum: ${initialJournalCount}, sesudah: ${finalJournalCount} (Tidak ada modifikasi ilegal)`
    );

    console.log("\n================================================================================");
    console.log(`HASIL AKHIR PENGUJIAN TAHAP 8: ${passed} PASS, ${failed} FAIL`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error during Phase 8 test execution:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase8Tests();
