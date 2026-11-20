const db = require('./db');
const po = require('./po');
const grn = require('./grn');
const invoice = require('./invoice');

module.exports = {
  // Database utilities
  ...db,

  // Purchase Order service and methods
  ...po,
  poService: po.poService,
  PurchaseOrderService: po.PurchaseOrderService,

  // Goods Receipt Note service and methods
  ...grn,
  grnService: grn.grnService,
  GoodsReceiptNoteService: grn.GoodsReceiptNoteService,

  // Invoice service and methods
  ...invoice,
  invoiceService: invoice.invoiceService,
  InvoiceService: invoice.InvoiceService,
};
