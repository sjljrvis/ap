const { getDb } = require('./db');
const { getInvoiceById, updateInvoiceStatus } = require('./invoice');
const { getPurchaseOrder } = require('./po');
const { getGRNsByPONumber } = require('./grn');

async function matchInvoice(invoiceId, options = {}) {
  const db = getDb();

  const priceTolerancePercent = options.priceTolerancePercent || 0.0;
  const quantityTolerancePercent = options.quantityTolerancePercent || 0.0;

  const invoice = getInvoiceById(invoiceId, db);
  if (!invoice) throw new Error('Invoice not found');

  const recordResult = (verdict, details, invoiceStatus) => {
    db.prepare(`
      INSERT INTO match_results (invoice_id, verdict, details, price_tolerance_percent, quantity_tolerance_percent)
      VALUES (?, ?, ?, ?, ?)
    `).run(invoiceId, verdict, typeof details === 'string' ? details : JSON.stringify(details), priceTolerancePercent, quantityTolerancePercent);

    if (invoiceStatus) {
      updateInvoiceStatus(invoiceId, invoiceStatus, invoice.vendor_id, db);
    }

    return { verdict, details };
  };

  // 1. Missing Purchase Order
  const po = getPurchaseOrder(invoice.po_number, db);
  if (!po) {
    return recordResult('MISSING_PO', 'Missing Purchase Order', 'FLAGGED_FOR_REVIEW');
  }

  // 2. Missing Goods Receipt Note
  const grns = getGRNsByPONumber(invoice.po_number, db);
  if (!grns || grns.length === 0) {
    return recordResult('MISSING_GRN', 'Missing Goods Receipt Note', 'PENDING_GOODS_RECEIPT');
  }

  // 3. Vendor Identity Matching
  if (invoice.vendor_id !== po.vendor_id) {
    return recordResult('VENDOR_MISMATCH', 'Vendor mismatch', 'FLAGGED_FOR_REVIEW');
  }

  // 4. Line Item Matching
  let hasPriceMismatch = false;
  let hasQuantityMismatch = false;
  let lineDetails = [];

  for (const invLine of invoice.lines) {
    const sku = invLine.item_sku;
    const poLine = po.lines.find((l) => l.item_sku === sku);

    // Cumulative received quantity for this SKU across all GRNs for this PO
    let totalReceived = 0;
    for (const grn of grns) {
      const gLine = grn.lines.find((l) => l.item_sku === sku);
      if (gLine) {
        totalReceived += gLine.quantity_received;
      }
    }

    if (!poLine) {
      lineDetails.push({ sku, error: 'SKU not found in PO' });
      hasPriceMismatch = true; // or just some mismatch
      continue;
    }

    // Price Matching
    const allowedPrice = poLine.unit_price * (1 + priceTolerancePercent / 100);
    if (invLine.unit_price > allowedPrice) {
      hasPriceMismatch = true;
      const variance = invLine.unit_price - poLine.unit_price;
      lineDetails.push({
        sku,
        error: 'PRICE_MISMATCH',
        message: `Price variance of ${variance} (billed: ${invLine.unit_price}, allowed: ${poLine.unit_price}, tolerance: ${priceTolerancePercent}%)`,
      });
    }

    // Quantity Matching
    const allowedQty = totalReceived * (1 + quantityTolerancePercent / 100);
    if (invLine.quantity_billed > allowedQty) {
      hasQuantityMismatch = true;
      const variance = invLine.quantity_billed - totalReceived;
      lineDetails.push({
        sku,
        error: 'QUANTITY_MISMATCH',
        message: `Quantity variance unreceived: ${variance} (billed: ${invLine.quantity_billed}, received: ${totalReceived})`,
      });
    }
  }

  if (hasPriceMismatch) {
    return recordResult('PRICE_MISMATCH', lineDetails, 'FLAGGED_FOR_REVIEW');
  }
  if (hasQuantityMismatch) {
    return recordResult('QUANTITY_MISMATCH', lineDetails, 'FLAGGED_FOR_REVIEW');
  }

  return recordResult('MATCHED', 'Exact 3-way match', 'APPROVED_FOR_PAYMENT');
}

async function getMatchHistory(invoiceId) {
  const db = getDb();

  const results = db
    .prepare('SELECT * FROM match_results WHERE invoice_id = ? ORDER BY matched_at DESC, id DESC')
    .all(invoiceId);

  if (!results || results.length === 0) {
    return { attempts: [] };
  }

  const formattedResults = results.map((r) => ({
    ...r,
    details: r.details && (r.details.startsWith('{') || r.details.startsWith('[')) ? JSON.parse(r.details) : r.details,
  }));

  return {
    latest_run: formattedResults[0],
    attempts: [...formattedResults].reverse(), // chronologically ascending
  };
}

module.exports = {
  matchInvoice,
  getMatchHistory,
};
