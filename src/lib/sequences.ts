import { prisma } from "./prisma";

export async function getNextSequence(
  type: "SO" | "DO" | "PO" | "RECEIPT" | "INV" | "BILL" | "RET" | "RINV" | "LEAD" | "POS" | "JE" | "INT" | "SESSION",
  tx?: any
): Promise<string> {
  const client = tx || prisma;
  switch (type) {
    case "SO": {
      const last = await client.salesOrder.findFirst({
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
      const last = await client.deliveryOrder.findFirst({
        orderBy: { deliveryNumber: "desc" },
      });
      if (!last || !last.deliveryNumber.startsWith("WH/OUT/")) {
        return "WH/OUT/0007";
      }
      const num = parseInt(last.deliveryNumber.replace("WH/OUT/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `WH/OUT/${nextNum.toString().padStart(4, "0")}`;
    }
    case "INT": {
      const last = await client.internalTransfer.findFirst({
        orderBy: { transferNumber: "desc" },
      });
      if (!last || !last.transferNumber.startsWith("WH/INT/")) {
        return "WH/INT/0007";
      }
      const num = parseInt(last.transferNumber.replace("WH/INT/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `WH/INT/${nextNum.toString().padStart(4, "0")}`;
    }
    case "POS": {
      const last = await client.posOrder.findFirst({
        orderBy: { orderNumber: "desc" },
      });
      if (!last || !last.orderNumber.startsWith("POS/2026/")) {
        return "POS/2026/0001";
      }
      const num = parseInt(last.orderNumber.replace("POS/2026/", ""), 10);
      const nextNum = isNaN(num) ? 1 : num + 1;
      return `POS/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    case "SESSION": {
      const last = await client.posSession.findFirst({
        orderBy: { sessionCode: "desc" },
      });
      if (!last || !last.sessionCode.startsWith("POS")) {
        return "POS01";
      }
      const num = parseInt(last.sessionCode.replace("POS", ""), 10);
      const nextNum = isNaN(num) ? 1 : num + 1;
      return `POS${nextNum.toString().padStart(2, "0")}`;
    }
    case "RET": {
      const last = await client.returnRequest.findFirst({
        orderBy: { returnNumber: "desc" },
      });
      if (!last || !last.returnNumber.startsWith("RET/2026/")) {
        return "RET/2026/0007";
      }
      const num = parseInt(last.returnNumber.replace("RET/2026/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `RET/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    case "RINV": {
      const last = await client.creditNote.findFirst({
        orderBy: { creditNoteNumber: "desc" },
      });
      if (!last || !last.creditNoteNumber.startsWith("RINV/2026/")) {
        return "RINV/2026/0007";
      }
      const num = parseInt(last.creditNoteNumber.replace("RINV/2026/", ""), 10);
      const nextNum = isNaN(num) ? 7 : num + 1;
      return `RINV/2026/${nextNum.toString().padStart(4, "0")}`;
    }
    case "LEAD": {
      const last = await client.crmLead.findFirst({
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
      const last = await client.purchaseOrder.findFirst({
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
      const last = await client.goodsReceipt.findFirst({
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
      const last = await client.vendorBill.findFirst({
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
      const last = await client.customerInvoice.findFirst({
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
      const last = await client.journalEntry.findFirst({
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
