const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

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

describe('R3: Invoice Storage and Retrieval', () => {
  it('Successfully create and retrieve an Invoice', async () => {
    const { createPO } = getPoService();
    const { createInvoice, getInvoice } = getInvoiceService();

    const poNumber = `PO-INV-${Date.now()}`;
    const poPayload = {
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
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

    // Ensure referenced Purchase Order exists
    await createPO(poPayload);

    const invoicePayload = {
      invoice_number: `INV-${Date.now()}-001`,
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
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

    // Stored document must have generated identifier and timestamp
    assert.ok(storedInvoice, 'Stored Invoice must be returned');
    assert.ok(
      storedInvoice.id !== undefined || storedInvoice.invoice_id !== undefined,
      'Stored Invoice must include a generated identifier (id)'
    );
    const createdAt = storedInvoice.created_at || storedInvoice.createdAt;
    assert.ok(createdAt, 'Stored Invoice must include a timestamp (created_at)');

    // Retrieve the persisted invoice
    let retrievedInvoice = await getInvoice(invoicePayload.invoice_number);
    if (!retrievedInvoice) {
      retrievedInvoice = await getInvoice(invoicePayload.invoice_number, invoicePayload.vendor_id);
    }
    if (!retrievedInvoice && storedInvoice && storedInvoice.id) {
      retrievedInvoice = await getInvoice(storedInvoice.id);
    }

    assert.ok(retrievedInvoice, 'Retrieved Invoice must not be null');
    assert.strictEqual(retrievedInvoice.invoice_number, invoicePayload.invoice_number);
    assert.strictEqual(retrievedInvoice.po_number, invoicePayload.po_number);
    assert.strictEqual(retrievedInvoice.vendor_id, invoicePayload.vendor_id);
    assert.strictEqual(retrievedInvoice.invoice_date, invoicePayload.invoice_date);
    assert.strictEqual(retrievedInvoice.due_date, invoicePayload.due_date);
    assert.strictEqual(Number(retrievedInvoice.total_amount), invoicePayload.total_amount);
    assert.strictEqual(
      retrievedInvoice.status,
      'PENDING_MATCH',
      'Initial status of Invoice must be PENDING_MATCH'
    );

    const lineItems =
      retrievedInvoice.line_items ||
      retrievedInvoice.lineItems ||
      retrievedInvoice.lines ||
      retrievedInvoice.items;
    assert.ok(Array.isArray(lineItems), 'Invoice must have line items array');
    assert.strictEqual(lineItems.length, 2, 'Invoice must have 2 line items');

    const item1 = lineItems.find((l) => (l.line_number || l.lineNumber) === 1);
    assert.ok(item1, 'Line item 1 must be present');
    assert.strictEqual(item1.item_sku || item1.itemSku || item1.sku, 'SKU-001');
    assert.strictEqual(
      Number(item1.quantity_billed !== undefined ? item1.quantity_billed : item1.quantityBilled),
      5
    );
    assert.strictEqual(Number(item1.unit_price || item1.unitPrice), 50.0);
    assert.strictEqual(Number(item1.line_total || item1.lineTotal), 250.0);

    const item2 = lineItems.find((l) => (l.line_number || l.lineNumber) === 2);
    assert.ok(item2, 'Line item 2 must be present');
    assert.strictEqual(item2.item_sku || item2.itemSku || item2.sku, 'SKU-002');
    assert.strictEqual(
      Number(item2.quantity_billed !== undefined ? item2.quantity_billed : item2.quantityBilled),
      10
    );
    assert.strictEqual(Number(item2.unit_price || item2.unitPrice), 25.0);
    assert.strictEqual(Number(item2.line_total || item2.lineTotal), 250.0);
  });

  it('Reject duplicate Invoice number for the same vendor', async () => {
    const { createPO } = getPoService();
    const { createInvoice } = getInvoiceService();

    const poNumber = `PO-INV-DUP-${Date.now()}`;
    const poPayload = {
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 300.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 3,
          unit_price: 100.0,
          line_total: 300.0,
        },
      ],
    };

    await createPO(poPayload);

    const invoiceNumber = `INV-DUP-${Date.now()}`;
    const vendorId = 'VENDOR-001';

    const initialPayload = {
      invoice_number: invoiceNumber,
      po_number: poNumber,
      vendor_id: vendorId,
      invoice_date: '2025-01-20',
      due_date: '2025-02-20',
      total_amount: 300.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 3,
          unit_price: 100.0,
          line_total: 300.0,
        },
      ],
    };

    // First submission succeeds
    await createInvoice(initialPayload);

    // Duplicate submission with the same invoice_number for the same vendor_id must be rejected
    const duplicatePayload = {
      ...initialPayload,
      total_amount: 350.0,
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_billed: 3,
          unit_price: 100.0,
          line_total: 300.0,
        },
      ],
    };

    let rejected = false;
    try {
      const result = await createInvoice(duplicatePayload);
      if (
        result &&
        (result.error ||
          result.status === 400 ||
          result.statusCode === 400 ||
          result.status === 409 ||
          result.statusCode === 409 ||
          result.success === false)
      ) {
        rejected = true;
      }
    } catch (err) {
      rejected = true;
      const isExpectedError =
        err.status === 400 ||
        err.statusCode === 400 ||
        err.status === 409 ||
        err.statusCode === 409 ||
        /duplicate|conflict|already exists|unique constraint|validation/i.test(err.message) ||
        err.code === 'SQLITE_CONSTRAINT' ||
        err.code === 'SQLITE_CONSTRAINT_UNIQUE';
      assert.ok(
        isExpectedError,
        `Expected validation error, conflict error, or duplicate error, got: ${err.message}`
      );
    }

    assert.strictEqual(
      rejected,
      true,
      'System must reject duplicate invoice_number for the same vendor with a validation error'
    );
  });
});
