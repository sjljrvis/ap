const db = require('./db');
const po = require('./po');
const grn = require('./grn');

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
};
