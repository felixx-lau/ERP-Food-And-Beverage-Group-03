import { prisma } from "./prisma";

export async function getNextSequence(type: "SO" | "DO" | "PO" | "RECEIPT" | "INV" | "BILL" | "RET" | "RINV" | "LEAD" | "POS" | "JE"): Promise<string> {
  switch (type) {
    case "SO": {
      const last = await prisma.salesOrder.findFirst({
        orderBy: { orderNumber: "desc" },
      });
      if (!last || !last.orderNumber.startsWith("S")) {
        return "S00007";
      }
      const num = parseInt(last.orderNumber.replace(/\D/g, ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `S${nextNum.toString().padStart(5, "0")}`;
    }
    case "DO": {
      const last = await prisma.deliveryOrder.findFirst({
        orderBy: { deliveryNumber: "desc" },
      });
      if (!last || !last.deliveryNumber.startsWith("WH/OUT/")) {
        return "WH/OUT/0007";
      }
      const num = parseInt(last.deliveryNumber.replace("WH/OUT/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `WH/OUT/${nextNum.toString().padStart(4, "0")}`;
    }
    case "LEAD": {
      const last = await prisma.crmLead.findFirst({
        orderBy: { id: "desc" },
      });
      if (!last || !last.id.startsWith("LD")) {
        return "LD0004";
      }
      const num = parseInt(last.id.replace(/\D/g, ""), 10);
      const nextNum = isNaN(num) ? 4 : num + 1;
      return `LD${nextNum.toString().padStart(4, "0")}`;
    }
    case "PO": {
      const last = await prisma.purchaseOrder.findFirst({
        orderBy: { poNumber: "desc" },
      });
      if (!last || !last.poNumber.startsWith("P")) {
        return "P00007";
      }
      const num = parseInt(last.poNumber.replace(/\D/g, ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `P${nextNum.toString().padStart(5, "0")}`;
    }
    case "RECEIPT": {
      const last = await prisma.goodsReceipt.findFirst({
        orderBy: { receiptNumber: "desc" },
      });
      if (!last || !last.receiptNumber.startsWith("WH/IN/")) {
        return "WH/IN/0007";
      }
      const num = parseInt(last.receiptNumber.replace("WH/IN/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `WH/IN/${nextNum.toString().padStart(4, "0")}`;
    }
    case "BILL": {
      const last = await prisma.vendorBill.findFirst({
        orderBy: { billNumber: "desc" },
      });
      if (!last || !last.billNumber.startsWith("BILL/2026/")) {
        return "BILL/2026/0007";
      }
      const num = parseInt(last.billNumber.replace("BILL/2026/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `BILL/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    case "INV": {
      const last = await prisma.customerInvoice.findFirst({
        orderBy: { invoiceNumber: "desc" },
      });
      if (!last || !last.invoiceNumber.startsWith("INV/2026/")) {
        return "INV/2026/0007";
      }
      const num = parseInt(last.invoiceNumber.replace("INV/2026/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `INV/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    case "JE": {
      const last = await prisma.journalEntry.findFirst({
        where: { entryNumber: { startsWith: "JE/2026/" } },
        orderBy: { entryNumber: "desc" },
      });
      if (!last) {
        return "JE/2026/0001";
      }
      const num = parseInt(last.entryNumber.replace("JE/2026/", ""), 10);
      const nextNum = isNaN(num) ? 1 : num + 1;
      return `JE/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    default:
      return `${type}-${Date.now()}`;
  }
}
