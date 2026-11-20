const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getDb } = require('../src/db');

function getPoService() {
  const modulePaths = [
    '../src/services/poService',
    '../src/services/po',
    '../src/services/purchaseOrderService',
    '../src/poService',
    '../src/po',
    '../src/index',
  ];
  let mod = null;
  for (const path of modulePaths) {
    try {
      mod = require(path);
      if (mod) break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(path.replace('..', ''))) {
        throw err;
      }
    }
  }

  assert.ok(
    mod,
    'Purchase Order service module not found. Expected src/services/poService.js (or po.js / purchaseOrderService.js) to be implemented.'
  );

  const instance =
    typeof mod === 'function'
      ? new mod()
      : mod.poService || mod.PurchaseOrderService
      ? typeof mod.PurchaseOrderService === 'function'
        ? new mod.PurchaseOrderService()
        : mod.poService
      : mod;

  const createPO =
    instance.createPurchaseOrder ||
    instance.createPO ||
    instance.create ||
    mod.createPurchaseOrder ||
    mod.createPO ||
    mod.create;

  const getPO =
    instance.getPurchaseOrder ||
    instance.getPO ||
    instance.getByPoNumber ||
    instance.get ||
    mod.getPurchaseOrder ||
    mod.getPO ||
    mod.getByPoNumber ||
    mod.get;

  assert.strictEqual(
    typeof createPO,
    'function',
    'Purchase Order service must implement createPurchaseOrder / createPO / create'
  );
  assert.strictEqual(
    typeof getPO,
    'function',
    'Purchase Order service must implement getPurchaseOrder / getPO / getByPoNumber / get'
  );

  return {
    createPO: createPO.bind(instance),
    getPO: getPO.bind(instance),
  };
}

function getGrnService() {
  const modulePaths = [
    '../src/services/grnService',
    '../src/services/grn',
    '../src/services/goodsReceiptNoteService',
    '../src/grnService',
    '../src/grn',
    '../src/index',
  ];
  let mod = null;
  for (const path of modulePaths) {
    try {
      mod = require(path);
      if (mod) break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(path.replace('..', ''))) {
        throw err;
      }
    }
  }

  assert.ok(
    mod,
    'Goods Receipt Note service module not found. Expected src/services/grnService.js (or grn.js / goodsReceiptNoteService.js) to be implemented.'
  );

  const instance =
    typeof mod === 'function'
      ? new mod()
      : mod.grnService || mod.GoodsReceiptNoteService
      ? typeof mod.GoodsReceiptNoteService === 'function'
        ? new mod.GoodsReceiptNoteService()
        : mod.grnService
      : mod;

  const createGRN =
    instance.createGoodsReceiptNote ||
    instance.createGRN ||
    instance.create ||
    mod.createGoodsReceiptNote ||
    mod.createGRN ||
    mod.create;

  const getGRN =
    instance.getGoodsReceiptNote ||
    instance.getGRN ||
    instance.getByGrnNumber ||
    instance.get ||
    mod.getGoodsReceiptNote ||
    mod.getGRN ||
    mod.getByGrnNumber ||
    mod.get;

  assert.strictEqual(
    typeof createGRN,
    'function',
    'GRN service must implement createGoodsReceiptNote / createGRN / create'
  );
  assert.strictEqual(
    typeof getGRN,
    'function',
    'GRN service must implement getGoodsReceiptNote / getGRN / getByGrnNumber / get'
  );

  return {
    createGRN: createGRN.bind(instance),
    getGRN: getGRN.bind(instance),
  };
}

function getInvoiceService() {
  const modulePaths = [
    '../src/services/invoiceService',
    '../src/services/invoice',
    '../src/services/invoices',
    '../src/invoiceService',
    '../src/invoice',
  ];
  let mod = null;
  for (const path of modulePaths) {
    try {
      mod = require(path);
      if (mod) break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(path.replace('..', ''))) {
        throw err;
      }
    }
  }

  if (!mod) {
    try {
      const indexMod = require('../src/index');
      if (
        indexMod &&
        (indexMod.createInvoice ||
          indexMod.invoiceService ||
          indexMod.InvoiceService ||
          indexMod.getInvoice)
      ) {
        mod = indexMod;
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }
    }
  }

  assert.ok(
    mod,
    'Invoice service module not found. Expected src/services/invoiceService.js (or invoice.js / invoiceService.js) to be implemented.'
  );

  const instance =
    typeof mod === 'function'
      ? new mod()
      : mod.invoiceService || mod.InvoiceService
      ? typeof mod.InvoiceService === 'function'
        ? new mod.InvoiceService()
        : mod.invoiceService
      : mod;

  const createInvoice =
    instance.createInvoice ||
    instance.create ||
    mod.createInvoice ||
    mod.create;

  const getInvoice =
    instance.getInvoice ||
    instance.getInvoiceByNumber ||
    instance.getByInvoiceNumber ||
    instance.get ||
    mod.getInvoice ||
    mod.getInvoiceByNumber ||
    mod.getByInvoiceNumber ||
    mod.get;

  assert.strictEqual(
    typeof createInvoice,
    'function',
    'Invoice service must implement createInvoice / create'
  );
  assert.strictEqual(
    typeof getInvoice,
    'function',
    'Invoice service must implement getInvoice / getInvoiceByNumber / getByInvoiceNumber / get'
  );

  return {
    createInvoice: createInvoice.bind(instance),
    getInvoice: getInvoice.bind(instance),
  };
}

function getMatcherService() {
  const modulePaths = [
    '../src/services/matchingService',
    '../src/services/matcherService',
    '../src/services/matcher',
    '../src/services/matchingEngine',
    '../src/matchingService',
    '../src/matcherService',
    '../src/matchingEngine',
    '../src/matcher',
  ];
  let mod = null;
  for (const path of modulePaths) {
    try {
      mod = require(path);
      if (mod) break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(path.replace('..', ''))) {
        throw err;
      }
    }
  }

  if (!mod) {
    try {
      const indexMod = require('../src/index');
      if (
        indexMod &&
        (indexMod.matchInvoice ||
          indexMod.match ||
          indexMod.reconcile ||
          indexMod.matchingService ||
          indexMod.MatchingService ||
          indexMod.matcherService ||
          indexMod.MatcherService ||
          indexMod.matchingEngine ||
          indexMod.MatchingEngine ||
          indexMod.matcher ||
          indexMod.Matcher)
      ) {
        mod = indexMod;
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err;
      }
    }
  }

  assert.ok(
    mod,
    'Matching engine service module not found. Expected src/matcher.js (or matchingEngine.js / matchingService.js) to be implemented.'
  );

  const instance =
    typeof mod === 'function'
      ? new mod()
      : mod.matchingService ||
        mod.MatchingService ||
        mod.matcherService ||
        mod.MatcherService ||
        mod.matchingEngine ||
        mod.MatchingEngine ||
        mod.matcher ||
        mod.Matcher
      ? typeof (mod.MatchingService || mod.MatcherService || mod.MatchingEngine || mod.Matcher) === 'function'
        ? new (mod.MatchingService || mod.MatcherService || mod.MatchingEngine || mod.Matcher)()
        : (mod.matchingService || mod.MatchingService || mod.matcherService || mod.MatcherService || mod.matchingEngine || mod.MatchingEngine || mod.matcher || mod.Matcher)
      : mod;

  const matchInvoice =
    instance.matchInvoice ||
    instance.match ||
    instance.reconcile ||
    instance.runMatch ||
    instance.match3Way ||
    instance.executeMatch ||
    mod.matchInvoice ||
    mod.match ||
    mod.reconcile ||
    mod.runMatch ||
    mod.match3Way ||
    mod.executeMatch;

  const getMatchHistory =
    instance.getMatchHistory ||
    instance.getMatchDetails ||
    instance.getMatchResults ||
    instance.getHistory ||
    instance.getMatchesByInvoice ||
    mod.getMatchHistory ||
    mod.getMatchDetails ||
    mod.getMatchResults ||
    mod.getHistory ||
    mod.getMatchesByInvoice;

  assert.strictEqual(
    typeof matchInvoice,
    'function',
    'Matching engine service must implement matchInvoice / match / reconcile'
  );

  return {
    matchInvoice: matchInvoice.bind(instance),
    getMatchHistory: getMatchHistory ? getMatchHistory.bind(instance) : undefined,
    matcherService: instance,
  };
}

describe('R4: Document Association Verification', () => {
  it('Missing Purchase Order', async () => {
    const { createInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const nonExistentPoNumber = `PO-NONEXISTENT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoicePayload = {
      invoice_number: `INV-MPO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: nonExistentPoNumber,
      vendor_id: 'VENDOR-001',
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 100.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 2,
          unit_price: 50.0,
          line_total: 100.0,
        },
      ],
    };

    const storedInvoice = await createInvoice(invoicePayload);
    assert.ok(storedInvoice, 'Stored invoice must be created');

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'MISSING_PO',
      'Match status must be marked as MISSING_PO when PO does not exist'
    );

    const discrepancies =
      matchResult.discrepancies ||
      matchResult.details ||
      matchResult.line_discrepancies ||
      matchResult.errors;
    assert.ok(discrepancies, 'Missing document discrepancy must be recorded');

    const discrepanciesStr = typeof discrepancies === 'string' ? discrepancies : JSON.stringify(discrepancies);
    assert.ok(
      /missing.*po|missing.*purchase.*order|missing.*document|po.*not.*found|does not exist/i.test(discrepanciesStr),
      'Discrepancy must indicate missing Purchase Order'
    );
  });

  it('Missing Goods Receipt Note', async () => {
    const { createPO } = getPoService();
    const { createInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-MGRN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const poPayload = {
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };

    // PO exists, but no corresponding GRN is created
    await createPO(poPayload);

    const invoicePayload = {
      invoice_number: `INV-MGRN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };

    const storedInvoice = await createInvoice(invoicePayload);
    assert.ok(storedInvoice, 'Stored invoice must be created');

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'MISSING_GRN',
      'Match status must be marked as MISSING_GRN when no GRN exists for the PO'
    );

    const { getInvoice } = getInvoiceService();
    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.notStrictEqual(
      updatedInvoice.status,
      'APPROVED_FOR_PAYMENT',
      'Invoice must not be approved for payment when GRN is missing'
    );
    assert.ok(
      updatedInvoice.status === 'PENDING_GOODS_RECEIPT' ||
        updatedInvoice.status === 'FLAGGED_FOR_REVIEW' ||
        updatedInvoice.status === 'PENDING_MATCH' ||
        updatedInvoice.status === 'MISSING_GRN' ||
        matchResult.status === 'MISSING_GRN' ||
        /pending.*goods.*receipt|missing.*grn/i.test(JSON.stringify(matchResult)),
      'Invoice must be flagged for pending goods receipt'
    );
  });
});

describe('R5: Vendor Identity Matching', () => {
  it('Vendor match success', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice, getInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-VMS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vendorId = 'VENDOR-MATCH-001';

    const poPayload = {
      po_number: poNumber,
      vendor_id: vendorId,
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-VMS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
      ],
    };
    await createGRN(grnPayload);

    // Invoice vendor_id is identical to PO vendor_id
    const invoicePayload = {
      invoice_number: `INV-VMS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'MATCHED',
      'Engine must pass vendor validation and proceed to line matching, resulting in MATCHED'
    );

    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.strictEqual(
      updatedInvoice.status,
      'APPROVED_FOR_PAYMENT',
      'Invoice status must be updated to APPROVED_FOR_PAYMENT upon successful match'
    );
  });

  it('Vendor mismatch detection', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice, getInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-VMD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const poPayload = {
      po_number: poNumber,
      vendor_id: 'VENDOR-ALPHA',
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-VMD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
      ],
    };
    await createGRN(grnPayload);

    // Invoice vendor_id differs from PO vendor_id
    const invoicePayload = {
      invoice_number: `INV-VMD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: 'VENDOR-BETA',
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'VENDOR_MISMATCH',
      'Engine must flag the match with VENDOR_MISMATCH status when invoice vendor differs from PO vendor'
    );

    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.notStrictEqual(
      updatedInvoice.status,
      'APPROVED_FOR_PAYMENT',
      'Engine must reject automatic approval on vendor mismatch'
    );
  });
});

describe('R6: Line Item Price and Quantity Matching with Tolerances', () => {
  it('Exact 3-way match', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice, getInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-EXACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vendorId = 'VENDOR-001';

    const poPayload = {
      po_number: poNumber,
      vendor_id: vendorId,
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 500.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
        {
          line_number: 2,
          item_sku: 'SKU-002',
          description: 'Desk Lamp',
          quantity: 10,
          unit_price: 25.0,
          line_total: 250.0,
        },
      ],
    };
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-EXACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
        {
          line_number: 2,
          item_sku: 'SKU-002',
          quantity_received: 10,
        },
      ],
    };
    await createGRN(grnPayload);

    const invoicePayload = {
      invoice_number: `INV-EXACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 500.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
        {
          line_number: 2,
          item_sku: 'SKU-002',
          quantity_billed: 10,
          unit_price: 25.0,
          line_total: 250.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'MATCHED',
      'Engine must assign status of MATCHED when all line items match prices and received quantities'
    );

    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.strictEqual(
      updatedInvoice.status,
      'APPROVED_FOR_PAYMENT',
      'Engine must update invoice state to APPROVED_FOR_PAYMENT on exact match'
    );
  });

  it('Unit price mismatch exceeding tolerance', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice, getInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-PRICEMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vendorId = 'VENDOR-001';

    const poPayload = {
      po_number: poNumber,
      vendor_id: vendorId,
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-PRICEMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
      ],
    };
    await createGRN(grnPayload);

    // Invoice line item unit price is 65.0 (30% increase over PO price 50.0, exceeding 5% tolerance)
    const invoicePayload = {
      invoice_number: `INV-PRICEMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 325.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 65.0,
          line_total: 325.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    const matchResult = await matchInvoice(storedInvoice.id, { priceTolerancePercent: 5.0 });
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'PRICE_MISMATCH',
      'Engine must mark result as PRICE_MISMATCH when invoice price exceeds tolerance'
    );

    const details =
      matchResult.details ||
      matchResult.discrepancies ||
      matchResult.line_discrepancies ||
      matchResult.lines;
    assert.ok(details, 'Price variance per line must be detailed');
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    assert.ok(
      /price|variance|unit_price|65|50|15/i.test(detailsStr),
      'Details must detail the price variance per line'
    );

    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.strictEqual(
      updatedInvoice.status,
      'FLAGGED_FOR_REVIEW',
      'Engine must flag the invoice as FLAGGED_FOR_REVIEW on price mismatch'
    );
  });

  it('Billed quantity exceeds received quantity', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice, getInvoice } = getInvoiceService();
    const { matchInvoice } = getMatcherService();

    const poNumber = `PO-QTYMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vendorId = 'VENDOR-001';

    const poPayload = {
      po_number: poNumber,
      vendor_id: vendorId,
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 500.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 10,
          unit_price: 50.0,
          line_total: 500.0,
        },
      ],
    };
    await createPO(poPayload);

    // Only 6 units received across GRNs (partial shipment)
    const grnPayload = {
      grn_number: `GRN-QTYMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 6,
        },
      ],
    };
    await createGRN(grnPayload);

    // Invoice bills for 10 units, exceeding received quantity of 6
    const invoicePayload = {
      invoice_number: `INV-QTYMIS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 500.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 10,
          unit_price: 50.0,
          line_total: 500.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    const matchResult = await matchInvoice(storedInvoice.id);
    assert.ok(matchResult, 'Match result must be returned');

    const verdict = matchResult.verdict || matchResult.status || matchResult.match_status;
    assert.strictEqual(
      verdict,
      'QUANTITY_MISMATCH',
      'Engine must mark result as QUANTITY_MISMATCH when billed quantity exceeds received quantity'
    );

    const details =
      matchResult.details ||
      matchResult.discrepancies ||
      matchResult.line_discrepancies ||
      matchResult.lines;
    assert.ok(details, 'Unreceived quantity variance must be recorded');
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    assert.ok(
      /quantity|variance|unreceived|billed|received|10|6|4/i.test(detailsStr),
      'Details must record the unreceived quantity variance'
    );

    const updatedInvoice = await getInvoice(storedInvoice.id);
    assert.notStrictEqual(
      updatedInvoice.status,
      'APPROVED_FOR_PAYMENT',
      'Engine must reject automatic approval on quantity mismatch'
    );
  });
});

describe('R7: Discrepancy Audit and Match History', () => {
  it('Querying match history', async () => {
    const { createPO } = getPoService();
    const { createGRN } = getGrnService();
    const { createInvoice } = getInvoiceService();
    const { matchInvoice, getMatchHistory } = getMatcherService();

    assert.strictEqual(
      typeof getMatchHistory,
      'function',
      'Matching engine service must implement getMatchHistory / getMatchDetails / getMatchResults'
    );

    const poNumber = `PO-HIST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const vendorId = 'VENDOR-001';

    const poPayload = {
      po_number: poNumber,
      vendor_id: vendorId,
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 250.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 5,
          unit_price: 50.0,
          line_total: 250.0,
        },
      ],
    };
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-HIST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      receipt_date: '2025-01-18',
      received_by: 'Warehouse Staff',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
      ],
    };
    await createGRN(grnPayload);

    const invoicePayload = {
      invoice_number: `INV-HIST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 275.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 5,
          unit_price: 55.0,
          line_total: 275.0,
        },
      ],
    };
    const storedInvoice = await createInvoice(invoicePayload);

    // First match run: with 0% tolerance -> PRICE_MISMATCH
    await matchInvoice(storedInvoice.id, { priceTolerancePercent: 0.0 });

    // Second match run: with 15% tolerance -> MATCHED
    await matchInvoice(storedInvoice.id, { priceTolerancePercent: 15.0 });

    // Query match details/history for the specific invoice
    const history = await getMatchHistory(storedInvoice.id);
    assert.ok(history, 'Match history must be returned for the invoice');

    // System returns the latest match run, verdict, and discrepancy breakdown
    const latestVerdict =
      history.latest_run?.verdict ||
      history.latestVerdict ||
      history.verdict ||
      (Array.isArray(history) ? history[history.length - 1]?.verdict : history.latest?.verdict);
    assert.ok(latestVerdict, 'Latest match run verdict must be returned');

    const discrepancies =
      history.discrepancies ||
      history.details ||
      history.line_item_discrepancies ||
      history.latest_run?.details ||
      (Array.isArray(history) ? history[history.length - 1]?.details : history.latest?.details);
    assert.ok(
      discrepancies !== undefined,
      'Line item discrepancy breakdown must be returned with match history'
    );

    // System returns historical match attempts (multiple runs)
    const attempts =
      history.attempts ||
      history.history ||
      history.runs ||
      history.match_attempts ||
      (Array.isArray(history) ? history : null);
    assert.ok(
      Array.isArray(attempts) && attempts.length >= 2,
      'System must return historical match attempts containing at least 2 match runs'
    );

    // Verify match results are recorded in SQLite match_results table
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM match_results WHERE invoice_id = ? ORDER BY id ASC')
      .all(storedInvoice.id);
    assert.ok(
      rows.length >= 2,
      'SQLite match_results table must record every matching execution'
    );
    assert.ok(rows[0].verdict, 'Each recorded match result must have a verdict');
    assert.ok(rows[0].matched_at, 'Each recorded match result must have an execution timestamp');
  });
});

describe('R8: Transactional Matching', () => {
  it('Should rollback match_results insert if updateInvoiceStatus fails', async () => {
    const { createPO } = getPoService();
    const { createInvoice } = getInvoiceService();
    const { matchInvoice, getMatchHistory } = getMatcherService();
    const db = getDb();
    
    const uniqueSuffix = Date.now();

    // Setup PO and Invoice
    await createPO({
      po_number: `PO-TX-TEST-${uniqueSuffix}`,
      vendor_id: 'V-TX-001',
      issue_date: '2023-10-01',
      total_amount: 500.0,
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-TX',
          description: 'Tx Item',
          quantity: 10,
          unit_price: 50.0,
          line_total: 500.0,
        },
      ],
    });

    const storedInvoice = await createInvoice({
      invoice_number: `INV-TX-${uniqueSuffix}`,
      po_number: `PO-TX-TEST-${uniqueSuffix}`,
      vendor_id: 'V-TX-001',
      invoice_date: '2023-10-05',
      total_amount: 500.0,
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-TX',
          quantity_billed: 10,
          unit_price: 50.0,
          line_total: 500.0,
        },
      ],
    });

    // Create a trigger that will raise an error on update of invoices
    db.exec(`
      CREATE TRIGGER fail_update_invoices
      BEFORE UPDATE ON invoices
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'Simulated failure during updateInvoiceStatus');
      END;
    `);

    try {
      await assert.rejects(
        matchInvoice(storedInvoice.id),
        /Simulated failure during updateInvoiceStatus/,
        'Should reject due to simulated DB failure'
      );

      // Verify that the insert to match_results was rolled back
      const history = await getMatchHistory(storedInvoice.id);
      const attempts =
        history.attempts ||
        history.history ||
        history.runs ||
        history.match_attempts ||
        (Array.isArray(history) ? history : []);
        
      assert.equal(attempts.length, 0, 'Match results should be rolled back and thus empty');
    } finally {
      // Clean up trigger
      db.exec('DROP TRIGGER IF EXISTS fail_update_invoices');
    }
  });
});

