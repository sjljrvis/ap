const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function getPoService() {
  const modulePaths = [
    '../src/services/poService',
    '../src/services/po',
    '../src/services/purchaseOrderService',
    '../src/poService',
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

describe('R1: Purchase Order Storage and Retrieval', () => {
  it('Successfully create and retrieve a Purchase Order', async () => {
    const { createPO, getPO } = getPoService();

    const poPayload = {
      po_number: `PO-${Date.now()}-001`,
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

    const storedPO = await createPO(poPayload);

    // Stored document must have generated identifier and timestamp
    assert.ok(storedPO, 'Stored PO must be returned');
    assert.ok(storedPO.id !== undefined || storedPO.po_id !== undefined, 'Stored PO must include a generated identifier (id)');
    const createdAt = storedPO.created_at || storedPO.createdAt;
    assert.ok(createdAt, 'Stored PO must include a timestamp (created_at)');

    // Retrieve the persisted PO
    const retrievedPO = await getPO(poPayload.po_number);
    assert.ok(retrievedPO, 'Retrieved PO must not be null');
    assert.strictEqual(retrievedPO.po_number, poPayload.po_number);
    assert.strictEqual(retrievedPO.vendor_id, poPayload.vendor_id);
    assert.strictEqual(retrievedPO.issue_date, poPayload.issue_date);
    assert.strictEqual(retrievedPO.status, poPayload.status);
    assert.strictEqual(Number(retrievedPO.total_amount), poPayload.total_amount);
    assert.strictEqual(retrievedPO.currency, poPayload.currency);

    const lineItems =
      retrievedPO.line_items ||
      retrievedPO.lineItems ||
      retrievedPO.lines ||
      retrievedPO.items;
    assert.ok(Array.isArray(lineItems), 'PO must have line items array');
    assert.strictEqual(lineItems.length, 2, 'PO must have 2 line items');

    const item1 = lineItems.find((l) => (l.line_number || l.lineNumber) === 1);
    assert.ok(item1, 'Line item 1 must be present');
    assert.strictEqual(item1.item_sku || item1.itemSku || item1.sku, 'SKU-001');
    assert.strictEqual(item1.description, 'Office Chair');
    assert.strictEqual(Number(item1.quantity), 5);
    assert.strictEqual(Number(item1.unit_price || item1.unitPrice), 50.0);
    assert.strictEqual(Number(item1.line_total || item1.lineTotal), 250.0);

    const item2 = lineItems.find((l) => (l.line_number || l.lineNumber) === 2);
    assert.ok(item2, 'Line item 2 must be present');
    assert.strictEqual(item2.item_sku || item2.itemSku || item2.sku, 'SKU-002');
    assert.strictEqual(item2.description, 'Desk Lamp');
    assert.strictEqual(Number(item2.quantity), 10);
    assert.strictEqual(Number(item2.unit_price || item2.unitPrice), 25.0);
    assert.strictEqual(Number(item2.line_total || item2.lineTotal), 250.0);
  });

  it('Reject duplicate Purchase Order number', async () => {
    const { createPO } = getPoService();

    const poNumber = `PO-DUP-${Date.now()}`;
    const initialPayload = {
      po_number: poNumber,
      vendor_id: 'VENDOR-001',
      issue_date: '2025-01-15',
      status: 'OPEN',
      total_amount: 100.0,
      currency: 'USD',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          description: 'Office Chair',
          quantity: 2,
          unit_price: 50.0,
          line_total: 100.0,
        },
      ],
    };

    // First submission succeeds
    await createPO(initialPayload);

    // Duplicate submission with the same po_number must be rejected
    const duplicatePayload = {
      ...initialPayload,
      vendor_id: 'VENDOR-002',
      total_amount: 200.0,
    };

    let rejected = false;
    try {
      const result = await createPO(duplicatePayload);
      if (
        result &&
        (result.error ||
          result.status === 409 ||
          result.statusCode === 409 ||
          result.success === false)
      ) {
        rejected = true;
      }
    } catch (err) {
      rejected = true;
      const isExpectedError =
        err.status === 409 ||
        err.statusCode === 409 ||
        /duplicate|conflict|already exists|unique constraint/i.test(err.message) ||
        err.code === 'SQLITE_CONSTRAINT' ||
        err.code === 'SQLITE_CONSTRAINT_UNIQUE';
      assert.ok(
        isExpectedError,
        `Expected 409 Conflict, validation error, or duplicate error, got: ${err.message}`
      );
    }

    assert.strictEqual(
      rejected,
      true,
      'System must reject submission of duplicate po_number with 409 Conflict or validation error'
    );
  });
});
