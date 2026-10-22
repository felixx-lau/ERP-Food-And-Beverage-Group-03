import bcrypt from "bcryptjs";
import { PrismaClient, Role, ContactType, CustomerType, PaymentTerms, AccountType, LeadStage, OrderStatus } from "@prisma/client";

export const SEED_USERS = [
  {
    email: "owner@rasaaruna.com",
    name: "Maya Prasetyo",
    role: Role.OWNER,
  },
  {
    email: "sales@rasaaruna.com",
    name: "Dini Anggraini",
    role: Role.SALES,
  },
  {
    email: "warehouse@rasaaruna.com",
    name: "Sinta Maharani",
    role: Role.WAREHOUSE,
  },
  {
    email: "procurement@rasaaruna.com",
    name: "Arief Wicaksono",
    role: Role.PROCUREMENT,
  },
  {
    email: "finance@rasaaruna.com",
    name: "Reza Firdaus",
    role: Role.FINANCE,
  },
  {
    email: "cashier@rasaaruna.com",
    name: "Bagas Putra",
    role: Role.CASHIER,
  },
];

export const SEED_CUSTOMERS = [
  {
    id: "C01",
    name: "PT Saji Kantor Sejahtera",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.COMPANY,
    city: "Jakarta Pusat",
    creditLimit: 3000000,
    paymentTerms: PaymentTerms.NET14,
    openReceivable: 1200000,
    openPayable: 0,
  },
  {
    id: "C02",
    name: "CV Tumbuh Bersama",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.COMPANY,
    city: "Jakarta Selatan",
    creditLimit: 350000,
    paymentTerms: PaymentTerms.NET7,
    openReceivable: 300000,
    openPayable: 0,
  },
  {
    id: "C03",
    name: "Klinik Harmoni",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.COMPANY,
    city: "Jakarta Timur",
    creditLimit: 5000000,
    paymentTerms: PaymentTerms.NET30,
    openReceivable: 0,
    openPayable: 0,
  },
  {
    id: "C04",
    name: "Dewi Kartika",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.INDIVIDUAL,
    city: "Jakarta Selatan",
    creditLimit: 1000000,
    paymentTerms: PaymentTerms.IMMEDIATE,
    openReceivable: 0,
    openPayable: 0,
  },
  {
    id: "C05",
    name: "Rudi Hartono",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.INDIVIDUAL,
    city: "Jakarta Barat",
    creditLimit: 1000000,
    paymentTerms: PaymentTerms.IMMEDIATE,
    openReceivable: 0,
    openPayable: 0,
  },
  {
    id: "C06",
    name: "Studio Loka",
    type: ContactType.CUSTOMER,
    customerType: CustomerType.COMPANY,
    city: "Jakarta Utara",
    creditLimit: 2000000,
    paymentTerms: PaymentTerms.NET14,
    openReceivable: 0,
    openPayable: 0,
  },
];

export const SEED_VENDORS = [
  {
    id: "V01",
    name: "PT Dapur Mitra Nusantara",
    type: ContactType.VENDOR,
    city: "Jakarta Timur",
    paymentTerms: PaymentTerms.NET14,
    openReceivable: 0,
    openPayable: 600000,
  },
  {
    id: "V02",
    name: "CV Sayur Segar Abadi",
    type: ContactType.VENDOR,
    city: "Bogor",
    paymentTerms: PaymentTerms.NET14,
    openReceivable: 0,
    openPayable: 0,
  },
  {
    id: "V03",
    name: "PT Kopi Minum Prima",
    type: ContactType.VENDOR,
    city: "Tangerang",
    paymentTerms: PaymentTerms.NET7,
    openReceivable: 0,
    openPayable: 400000,
  },
  {
    id: "V04",
    name: "CV Kue Harian",
    type: ContactType.VENDOR,
    city: "Jakarta Barat",
    paymentTerms: PaymentTerms.NET14,
    openReceivable: 0,
    openPayable: 0,
  },
];

export const SEED_LOCATIONS = [
  {
    code: "WH-JKT",
    name: "Gudang Pusat Jakarta",
    type: "Internal",
    usage: "Fulfillment B2B dan supply",
  },
  {
    code: "CAFE-JKT",
    name: "Gerai Jakarta",
    type: "Internal",
    usage: "Dine-in, takeaway, Point of Sale",
  },
];

export const SEED_PRODUCTS = [
  { sku: "RICE-CHICK-S", name: "Nasi Ayam Panggang", size: "Small", color: "Original", unit: "box", salesPrice: 48000, cost: 26000, defaultVendorId: "V01", whQty: 40, cafeQty: 12, reservedWh: 6 },
  { sku: "RICE-CHICK-L", name: "Nasi Ayam Panggang", size: "Large", color: "Original", unit: "box", salesPrice: 62000, cost: 34000, defaultVendorId: "V01", whQty: 25, cafeQty: 8, reservedWh: 0 },
  { sku: "RICE-BEEF-S", name: "Nasi Daging Lada", size: "Small", color: "Original", unit: "box", salesPrice: 56000, cost: 31000, defaultVendorId: "V01", whQty: 30, cafeQty: 10, reservedWh: 0 },
  { sku: "RICE-BEEF-L", name: "Nasi Daging Lada", size: "Large", color: "Original", unit: "box", salesPrice: 72000, cost: 42000, defaultVendorId: "V01", whQty: 20, cafeQty: 6, reservedWh: 0 },
  { sku: "NOOD-VEG-S", name: "Mie Sayur", size: "Small", color: "Original", unit: "box", salesPrice: 39000, cost: 19000, defaultVendorId: "V02", whQty: 40, cafeQty: 14, reservedWh: 0 },
  { sku: "NOOD-VEG-L", name: "Mie Sayur", size: "Large", color: "Original", unit: "box", salesPrice: 52000, cost: 27000, defaultVendorId: "V02", whQty: 25, cafeQty: 9, reservedWh: 0 },
  { sku: "SALAD-GRN-S", name: "Salad Hijau", size: "Small", color: "Original", unit: "box", salesPrice: 42000, cost: 21000, defaultVendorId: "V02", whQty: 30, cafeQty: 10, reservedWh: 0 },
  { sku: "SALAD-GRN-L", name: "Salad Hijau", size: "Large", color: "Original", unit: "box", salesPrice: 58000, cost: 30000, defaultVendorId: "V02", whQty: 25, cafeQty: 8, reservedWh: 0 },
  { sku: "COF-LATT-HOT", name: "Latte", size: "Regular", color: "Hot", unit: "cup", salesPrice: 30000, cost: 12000, defaultVendorId: "V03", whQty: 20, cafeQty: 24, reservedWh: 0 },
  { sku: "COF-LATT-ICE", name: "Latte", size: "Regular", color: "Iced", unit: "cup", salesPrice: 33000, cost: 13000, defaultVendorId: "V03", whQty: 25, cafeQty: 18, reservedWh: 0 },
  { sku: "TEA-LEMN-HOT", name: "Lemon Tea", size: "Regular", color: "Hot", unit: "cup", salesPrice: 26000, cost: 8000, defaultVendorId: "V03", whQty: 30, cafeQty: 24, reservedWh: 0 },
  { sku: "TEA-LEMN-ICE", name: "Lemon Tea", size: "Regular", color: "Iced", unit: "cup", salesPrice: 28000, cost: 9000, defaultVendorId: "V03", whQty: 30, cafeQty: 20, reservedWh: 0 },
  { sku: "COOKIE-CHO-1", name: "Cookie Cokelat", size: "Single", color: "Cokelat", unit: "pack", salesPrice: 20000, cost: 9000, defaultVendorId: "V04", whQty: 30, cafeQty: 20, reservedWh: 0 },
  { sku: "COOKIE-CHO-3", name: "Cookie Cokelat", size: "Triple", color: "Cokelat", unit: "pack", salesPrice: 54000, cost: 25000, defaultVendorId: "V04", whQty: 18, cafeQty: 9, reservedWh: 0 },
  { sku: "JUICE-ORN-350", name: "Jus Jeruk", size: "350 ml", color: "Original", unit: "bottle", salesPrice: 35000, cost: 15000, defaultVendorId: "V03", whQty: 22, cafeQty: 14, reservedWh: 0 },
];

export const SEED_ACCOUNTS = [
  { code: "1010", name: "Bank", type: AccountType.ASSET, openingBalance: 20000000 },
  { code: "1020", name: "Accounts Receivable", type: AccountType.ASSET, openingBalance: 1500000 },
  { code: "1030", name: "Inventory", type: AccountType.ASSET, openingBalance: 12214000 },
  { code: "1040", name: "GRNI / Stock Interim", type: AccountType.LIABILITY, openingBalance: 0 },
  { code: "2010", name: "Accounts Payable", type: AccountType.LIABILITY, openingBalance: 1000000 },
  { code: "2020", name: "PBJT Payable", type: AccountType.LIABILITY, openingBalance: 0 },
  { code: "2030", name: "Customer Deposits", type: AccountType.LIABILITY, openingBalance: 0 },
  { code: "3010", name: "Opening Equity", type: AccountType.EQUITY, openingBalance: 32714000 },
  { code: "4010", name: "Sales Revenue", type: AccountType.INCOME, openingBalance: 0 },
  { code: "4020", name: "Sales Returns", type: AccountType.CONTRA_INCOME, openingBalance: 0 },
  { code: "5010", name: "COGS", type: AccountType.EXPENSE, openingBalance: 0 },
  { code: "5020", name: "Purchase Variance", type: AccountType.EXPENSE, openingBalance: 0 },
  { code: "6010", name: "Operating Expense", type: AccountType.EXPENSE, openingBalance: 0 },
  { code: "7010", name: "Cash Clearing", type: AccountType.ASSET, openingBalance: 0 },
  { code: "8010", name: "Inventory Adjustment", type: AccountType.EXPENSE, openingBalance: 0 },
];

export async function executeSeed(prisma: PrismaClient, actorName = "System", actorRole: Role = Role.OWNER) {
  // We execute all cleaning and seeding in a clean transaction or sequence
  // 1. Clean existing transactional and master data
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.internalTransferLine.deleteMany(),
    prisma.internalTransfer.deleteMany(),
    prisma.creditNoteLine.deleteMany(),
    prisma.creditNote.deleteMany(),
    prisma.returnRequestLine.deleteMany(),
    prisma.returnRequest.deleteMany(),
    prisma.posOrderLine.deleteMany(),
    prisma.posOrder.deleteMany(),
    prisma.posSession.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.vendorBillLine.deleteMany(),
    prisma.vendorBill.deleteMany(),
    prisma.customerInvoiceLine.deleteMany(),
    prisma.customerInvoice.deleteMany(),
    prisma.goodsReceiptLine.deleteMany(),
    prisma.goodsReceipt.deleteMany(),
    prisma.purchaseOrderLine.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.deliveryOrderLine.deleteMany(),
    prisma.deliveryOrder.deleteMany(),
    prisma.salesOrderLine.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.crmLead.deleteMany(),
    prisma.journalItem.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.stockMove.deleteMany(),
    prisma.stockLevel.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.warehouseLocation.deleteMany(),
    prisma.account.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // 2. Seed Users with hashed password
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  for (const u of SEED_USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: defaultPasswordHash,
      },
    });
  }

  // 3. Seed Warehouse Locations
  for (const loc of SEED_LOCATIONS) {
    await prisma.warehouseLocation.create({
      data: loc,
    });
  }

  // 4. Seed Contacts (Vendors & Customers)
  for (const v of SEED_VENDORS) {
    await prisma.contact.create({
      data: v,
    });
  }
  for (const c of SEED_CUSTOMERS) {
    await prisma.contact.create({
      data: c,
    });
  }

  // 5. Seed Products & Stock Levels
  for (const p of SEED_PRODUCTS) {
    await prisma.productVariant.create({
      data: {
        sku: p.sku,
        name: p.name,
        size: p.size,
        color: p.color,
        unit: p.unit,
        salesPrice: p.salesPrice,
        standardCost: p.cost,
        defaultVendorId: p.defaultVendorId,
      },
    });

    // Stock for WH-JKT
    await prisma.stockLevel.create({
      data: {
        productSku: p.sku,
        locationCode: "WH-JKT",
        onHand: p.whQty,
        reserved: p.reservedWh,
      },
    });

    // Stock for CAFE-JKT
    await prisma.stockLevel.create({
      data: {
        productSku: p.sku,
        locationCode: "CAFE-JKT",
        onHand: p.cafeQty,
        reserved: 0,
      },
    });
  }

  // 6. Seed Chart of Accounts
  for (const a of SEED_ACCOUNTS) {
    await prisma.account.create({
      data: {
        code: a.code,
        name: a.name,
        type: a.type,
        openingBalance: a.openingBalance,
        currentBalance: a.openingBalance,
      },
    });
  }

  // 7. Seed Opening Ledger Entry (Opening only)
  // Balanced: Dr Bank 20M, Dr AR 1.5M, Dr Inventory 12.214M | Cr AP 1M, Cr Equity 32.714M
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: "JE/OPENING/0001",
      sourceDocument: "BASELINE_MIGRATION",
      documentRef: "BASELINE_OPENING_2026",
      journalType: "GENERAL",
      state: "POSTED",
      isOpening: true,
      notes: "Opening balance migration for PT Rasa Aruna Bersama",
      items: {
        create: [
          { accountCode: "1010", label: "Bank Opening Balance", debit: 20000000, credit: 0 },
          { accountCode: "1020", label: "Accounts Receivable Opening (C01: 1.2M, C02: 300k)", debit: 1500000, credit: 0 },
          { accountCode: "1030", label: "Inventory Opening Valuation (616 units)", debit: 12214000, credit: 0 },
          { accountCode: "2010", label: "Accounts Payable Opening (V01: 600k, V03: 400k)", debit: 0, credit: 1000000 },
          { accountCode: "3010", label: "Opening Equity", debit: 0, credit: 32714000 },
        ],
      },
    },
  });

  // 8. Seed Existing Documents
  // a) CRM Lead LD0003: Klinik Harmoni (C03), Expected Revenue Rp1.200.000, Stage Qualified
  await prisma.crmLead.create({
    data: {
      id: "LD0003",
      name: "Paket Makan Siang Staf Klinik",
      contactId: "C03",
      expectedRevenue: 1200000,
      stage: LeadStage.QUALIFIED,
    },
  });

  // b) Existing Sales Order S00006: C03, 6 x RICE-CHICK-S @ 48.000. Confirmed.
  // Net: 288.000, PBJT: 28.800, Gross: 316.800. Reserved 6 at WH-JKT.
  const so6 = await prisma.salesOrder.create({
    data: {
      orderNumber: "S00006",
      contactId: "C03",
      status: OrderStatus.CONFIRMED,
      pricingOption: "Exclude PBJT",
      paymentTerms: PaymentTerms.NET30,
      discountApproved: true,
      discountPercent: 0,
      subtotalNet: 288000,
      pbjtTax: 28800,
      totalGross: 316800,
      projectedCost: 156000, // 6 * 26000
      isPriceLocked: true,
      lines: {
        create: [
          {
            productSku: "RICE-CHICK-S",
            quantity: 6,
            unitPrice: 48000,
            discountPercent: 0,
            netPrice: 288000,
            pbjtAmount: 28800,
            totalAmount: 316800,
            standardCost: 26000,
            deliveredQty: 0,
            invoicedQty: 0,
          },
        ],
      },
    },
  });

  // c) Existing Purchase Order P00006: V03, 10 x COF-LATT-HOT @ 12.000. Confirmed.
  // Subtotal 120.000, Tax 0, Total 120.000. Receipt 0, bill 0, GRNI 0.
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "P00006",
      vendorId: "V03",
      status: OrderStatus.CONFIRMED,
      subtotal: 120000,
      taxAmount: 0,
      total: 120000,
      lines: {
        create: [
          {
            productSku: "COF-LATT-HOT",
            orderedQty: 10,
            unitPrice: 12000,
            subtotal: 120000,
            receivedQty: 0,
            billedQty: 0,
          },
        ],
      },
    },
  });

  // 9. Record Initial Audit Log
  await prisma.auditLog.create({
    data: {
      actorName: actorName,
      actorRole: actorRole,
      action: "RESET_SEED",
      documentType: "SEED",
      documentId: "BASELINE_SEED_01",
      notes: "Baseline seed successfully initialized for PT Rasa Aruna Bersama.",
      beforeState: JSON.stringify({ note: "Previous database state wiped" }),
      afterState: JSON.stringify({
        totalProducts: SEED_PRODUCTS.length,
        totalCustomers: SEED_CUSTOMERS.length,
        totalVendors: SEED_VENDORS.length,
        totalCompanyStockUnits: 616,
        totalStockValuation: 12214000,
        whStockUnits: 410,
        cafeStockUnits: 206,
        totalOpeningDebit: 33714000,
        totalOpeningCredit: 33714000,
      }),
    },
  });

  return {
    success: true,
    message: "Baseline Seed successfully loaded.",
    stats: {
      products: SEED_PRODUCTS.length,
      customers: SEED_CUSTOMERS.length,
      vendors: SEED_VENDORS.length,
      accounts: SEED_ACCOUNTS.length,
      totalCompanyUnits: 616,
      totalValuation: 12214000,
      whUnits: 410,
      cafeUnits: 206,
      openingJournalBalanced: true,
    },
  };
}
