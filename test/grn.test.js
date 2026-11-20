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

function getGrnService() {
  const modulePaths = [
    '../src/services/grnService',
    '../src/services/grn',
    '../src/services/goodsReceiptNoteService',
    '../src/grnService',
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

describe('R2: Goods Receipt Note Storage and Retrieval', () => {
  it('Successfully create and retrieve a GRN', async () => {
    const { createPO } = getPoService();
    const { createGRN, getGRN } = getGrnService();

    const poNumber = `PO-GRN-${Date.now()}`;
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

    // Ensure PO exists before GRN references it
    await createPO(poPayload);

    const grnPayload = {
      grn_number: `GRN-${Date.now()}-001`,
      po_number: poNumber,
      receipt_date: '2025-01-20',
      received_by: 'John Warehouse',
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

    const storedGRN = await createGRN(grnPayload);

    assert.ok(storedGRN, 'Stored GRN must be returned');
    assert.ok(
      storedGRN.id !== undefined || storedGRN.grn_id !== undefined,
      'Stored GRN must include a generated identifier (id)'
    );

    // Retrieve the persisted GRN
    const retrievedGRN = await getGRN(grnPayload.grn_number);
    assert.ok(retrievedGRN, 'Retrieved GRN must not be null');
    assert.strictEqual(retrievedGRN.grn_number, grnPayload.grn_number);
    assert.strictEqual(retrievedGRN.po_number, grnPayload.po_number);
    assert.strictEqual(retrievedGRN.receipt_date, grnPayload.receipt_date);
    assert.strictEqual(retrievedGRN.received_by, grnPayload.received_by);

    const lineItems =
      retrievedGRN.line_items ||
      retrievedGRN.lineItems ||
      retrievedGRN.lines ||
      retrievedGRN.items;
    assert.ok(Array.isArray(lineItems), 'GRN must have line items array');
    assert.strictEqual(lineItems.length, 2, 'GRN must have 2 line items');

    const item1 = lineItems.find((l) => (l.line_number || l.lineNumber) === 1);
    assert.ok(item1, 'Line item 1 must be present');
    assert.strictEqual(item1.item_sku || item1.itemSku || item1.sku, 'SKU-001');
    assert.strictEqual(
      Number(item1.quantity_received !== undefined ? item1.quantity_received : item1.quantityReceived),
      5
    );

    const item2 = lineItems.find((l) => (l.line_number || l.lineNumber) === 2);
    assert.ok(item2, 'Line item 2 must be present');
    assert.strictEqual(item2.item_sku || item2.itemSku || item2.sku, 'SKU-002');
    assert.strictEqual(
      Number(item2.quantity_received !== undefined ? item2.quantity_received : item2.quantityReceived),
      10
    );
  });

  it('Reject GRN referencing non-existent PO', async () => {
    const { createGRN } = getGrnService();

    const nonExistentPoNumber = `PO-NONEXISTENT-${Date.now()}`;
    const grnPayload = {
      grn_number: `GRN-ERR-${Date.now()}`,
      po_number: nonExistentPoNumber,
      receipt_date: '2025-01-20',
      received_by: 'John Warehouse',
      line_items: [
        {
          line_number: 1,
          item_sku: 'SKU-001',
          quantity_received: 5,
        },
      ],
    };

    let rejected = false;
    try {
      const result = await createGRN(grnPayload);
      if (
        result &&
        (result.error ||
          result.status === 404 ||
          result.statusCode === 404 ||
          result.success === false)
      ) {
        rejected = true;
      }
    } catch (err) {
      rejected = true;
      const isExpectedError =
        err.status === 404 ||
        err.statusCode === 404 ||
        /not found|does not exist|foreign key constraint|referenced/i.test(err.message) ||
        err.code === 'SQLITE_CONSTRAINT' ||
        err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY';
      assert.ok(
        isExpectedError,
        `Expected error indicating PO was not found, got: ${err.message}`
      );
    }

    assert.strictEqual(
      rejected,
      true,
      'System must reject submission of GRN referencing non-existent PO'
    );
  });
});
