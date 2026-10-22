import { prisma } from "./prisma";
import { OrderStatus } from "@prisma/client";

export interface CustomerCreditStatus {
  customerId: string;
  customerName: string;
  creditLimit: number;
  openReceivable: number;
  grossConfirmedUninvoiced: number;
  creditExposure: number;
  creditHeadroom: number;
}

export async function calculateCustomerCreditStatus(customerId: string): Promise<CustomerCreditStatus> {
  const customer = await prisma.contact.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }

  // 1. Calculate Open Receivables (A/R)
  // Base opening receivable + (posted invoices - completed customer payments)
  let openReceivable = customer.openReceivable;

  // Add any posted customer invoices for this customer
  const postedInvoices = await prisma.customerInvoice.findMany({
    where: {
      customerId: customerId,
      status: "POSTED",
    },
  });

  for (const inv of postedInvoices) {
    openReceivable += inv.outstandingAmount;
  }

  // 2. Calculate Gross Confirmed-Uninvoiced Orders (SR-09)
  // Exclude draft, cancelled, or orders already fully invoiced
  const confirmedOrders = await prisma.salesOrder.findMany({
    where: {
      contactId: customerId,
      status: OrderStatus.CONFIRMED,
    },
    include: {
      lines: true,
      invoices: true,
    },
  });

  let grossConfirmedUninvoiced = 0;
  for (const order of confirmedOrders) {
    // Check how much of this order has already been invoiced
    const invoicedGross = order.invoices
      .filter((inv) => inv.status !== "CANCELLED")
      .reduce((sum, inv) => sum + inv.totalGross, 0);

    const uninvoicedAmount = Math.max(0, order.totalGross - invoicedGross);
    grossConfirmedUninvoiced += uninvoicedAmount;
  }

  // 3. Formula SR-09:
  // Credit Exposure = Open Receivable + Gross Confirmed Uninvoiced Orders
  const creditExposure = openReceivable + grossConfirmedUninvoiced;
  const creditHeadroom = customer.creditLimit - creditExposure;

  return {
    customerId: customer.id,
    customerName: customer.name,
    creditLimit: customer.creditLimit,
    openReceivable,
    grossConfirmedUninvoiced,
    creditExposure,
    creditHeadroom,
  };
}

export async function validateCreditCheck(
  customerId: string,
  newOrderGross: number
): Promise<{
  allowed: boolean;
  creditStatus: CustomerCreditStatus;
  projectedExposure: number;
  projectedHeadroom: number;
  exceededAmount: number;
  reason?: string;
}> {
  const creditStatus = await calculateCustomerCreditStatus(customerId);
  const projectedExposure = creditStatus.creditExposure + newOrderGross;
  const projectedHeadroom = creditStatus.creditLimit - projectedExposure;
  const exceededAmount = Math.max(0, newOrderGross - creditStatus.creditHeadroom);

  if (projectedHeadroom < 0) {
    return {
      allowed: false,
      creditStatus,
      projectedExposure,
      projectedHeadroom,
      exceededAmount,
      reason: `Pesanan baru senilai Rp ${newOrderGross.toLocaleString("id-ID")} melebihi sisa credit headroom Rp ${creditStatus.creditHeadroom.toLocaleString("id-ID")} (Defisit Rp ${exceededAmount.toLocaleString("id-ID")}).`,
    };
  }

  return {
    allowed: true,
    creditStatus,
    projectedExposure,
    projectedHeadroom,
    exceededAmount: 0,
  };
}
