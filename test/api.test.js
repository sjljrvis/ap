const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Helper to get the Express app if implemented
function getApp() {
  const modulePaths = [
    '../src/app',
    '../src/server',
    '../src/api',
    '../src/index',
  ];
  let mod = null;
  for (const path of modulePaths) {
    try {
      mod = require(path);
      if (
        mod &&
        (mod.listen ||
          (typeof mod === 'function' && mod.length <= 3 && mod.name !== 'getDb') ||
          mod.app ||
          mod.server ||
          mod.api)
      ) {
        break;
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || !err.message.includes(path.replace('..', ''))) {
        throw err;
      }
    }
  }

  // We explicitly check if it's an express app or something that looks like it.
  // src/index.js exports { getDb, poService... } which are not Express apps.
  let app = mod?.app || mod?.server || mod?.api || mod;
  if (app && typeof app === 'object' && !app.listen && !app.app) {
    app = null;
  }

  assert.ok(
    app && (typeof app === 'function' || typeof app.listen === 'function'),
    'Express API module not found. Expected src/app.js (or src/server.js, src/api.js, src/index.js) exporting an Express app.'
  );

  return app;
}

let serverInstance = null;
let baseUrl = null;

async function request(method, path, body = null) {
  if (!baseUrl) {
    const app = getApp();
    const server = typeof app.listen === 'function' && app.listen.length <= 2 ? app : http.createServer(app);

    await new Promise((resolve, reject) => {
      serverInstance = server.listen(0, '127.0.0.1', () => {
        const address = serverInstance.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
      serverInstance.on('error', reject);
    });
  }

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
}

after(() => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
});

describe('R1: Purchase Order Storage and Retrieval', () => {
  it('Successfully create and retrieve a Purchase Order', async () => {
    const poNumber = `PO-API-${Date.now()}`;
    const payload = {
      po_number: poNumber,
      vendor_id: 'VEND-001',
      issue_date: '2026-01-01',
      total_amount: 1000,
      currency: 'USD',
      line_items: [
        { line_number: 1, item_sku: 'SKU-001', quantity: 10, unit_price: 100, line_total: 1000 }
      ]
    };

    const resPost = await request('POST', '/api/po', payload);
    assert.ok(resPost.status === 200 || resPost.status === 201, 'Expected 200/201 on PO creation');
    assert.ok(resPost.data.id || resPost.data.po_id, 'Response should contain created PO identifier');

    const resGet = await request('GET', `/api/po/${poNumber}`);
    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(resGet.data.po_number, poNumber);
  });

  it('Reject duplicate Purchase Order number', async () => {
    const poNumber = `PO-API-DUP-${Date.now()}`;
    const payload = {
      po_number: poNumber,
      vendor_id: 'VEND-001',
      issue_date: '2026-01-01',
      total_amount: 1000,
      line_items: [{ line_number: 1, item_sku: 'SKU-001', quantity: 10, unit_price: 100, line_total: 1000 }]
    };

    await request('POST', '/api/po', payload);
    const resPostDup = await request('POST', '/api/po', payload);
    
    assert.ok(
      resPostDup.status === 409 || resPostDup.status === 400,
      'Expected 409 Conflict or 400 Bad Request for duplicate PO'
    );
  });
});

describe('R2: Goods Receipt Note Storage and Retrieval', () => {
  it('Successfully create and retrieve a GRN', async () => {
    const poNumber = `PO-GRN-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-002',
      issue_date: '2026-01-01',
      total_amount: 500,
      line_items: [{ line_number: 1, item_sku: 'SKU-002', quantity: 5, unit_price: 100, line_total: 500 }]
    });

    const grnNumber = `GRN-API-${Date.now()}`;
    const grnPayload = {
      grn_number: grnNumber,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'WH-STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-002', quantity_received: 5 }]
    };

    const resPost = await request('POST', '/api/grn', grnPayload);
    assert.ok(resPost.status === 200 || resPost.status === 201, 'Expected 200/201 on GRN creation');

    const resGet = await request('GET', `/api/grn/${grnNumber}`);
    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(resGet.data.grn_number, grnNumber);
  });

  it('Reject GRN referencing non-existent PO', async () => {
    const grnPayload = {
      grn_number: `GRN-API-ERR-${Date.now()}`,
      po_number: `PO-NON-EXISTENT-${Date.now()}`,
      receipt_date: '2026-01-05',
      received_by: 'WH-STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-002', quantity_received: 5 }]
    };

    const resPost = await request('POST', '/api/grn', grnPayload);
    assert.ok(
      resPost.status === 400 || resPost.status === 404,
      'Expected 400 or 404 for GRN with non-existent PO'
    );
  });
});

describe('R3: Invoice Storage and Retrieval', () => {
  it('Successfully create and retrieve an Invoice', async () => {
    const poNumber = `PO-INV-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-003',
      issue_date: '2026-01-01',
      total_amount: 500,
      line_items: [{ line_number: 1, item_sku: 'SKU-003', quantity: 5, unit_price: 100, line_total: 500 }]
    });

    const invNumber = `INV-API-${Date.now()}`;
    const invPayload = {
      invoice_number: invNumber,
      po_number: poNumber,
      vendor_id: 'VEND-003',
      invoice_date: '2026-01-10',
      total_amount: 500,
      line_items: [{ line_number: 1, item_sku: 'SKU-003', quantity_billed: 5, unit_price: 100, line_total: 500 }]
    };

    const resPost = await request('POST', '/api/invoices', invPayload);
    assert.ok(resPost.status === 200 || resPost.status === 201, 'Expected 200/201 on Invoice creation');
    const invoiceId = resPost.data.id || resPost.data.invoice_id;
    assert.ok(invoiceId, 'Invoice ID should be returned');
    assert.strictEqual(resPost.data.status, 'PENDING_MATCH');

    const resGet = await request('GET', `/api/invoices/${invoiceId}`);
    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(resGet.data.invoice_number, invNumber);
  });

  it('Reject duplicate Invoice number for the same vendor', async () => {
    const invNumber = `INV-API-DUP-${Date.now()}`;
    const invPayload = {
      invoice_number: invNumber,
      po_number: 'PO-DUMMY',
      vendor_id: 'VEND-003',
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-003', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    };

    await request('POST', '/api/invoices', invPayload);
    const resPostDup = await request('POST', '/api/invoices', invPayload);
    assert.ok(
      resPostDup.status === 409 || resPostDup.status === 400,
      'Expected 409 Conflict or 400 Bad Request for duplicate invoice'
    );
  });
});

describe('R4: Document Association Verification', () => {
  it('Missing Purchase Order', async () => {
    const invPayload = {
      invoice_number: `INV-MPO-${Date.now()}`,
      po_number: `PO-MPO-${Date.now()}`,
      vendor_id: 'VEND-004',
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-MPO', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    };
    const resInv = await request('POST', '/api/invoices', invPayload);
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'MISSING_PO');
  });

  it('Missing Goods Receipt Note', async () => {
    const poNumber = `PO-MGRN-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-005',
      issue_date: '2026-01-01',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-MGRN', quantity: 1, unit_price: 100, line_total: 100 }]
    });

    const invPayload = {
      invoice_number: `INV-MGRN-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-005',
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-MGRN', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    };
    const resInv = await request('POST', '/api/invoices', invPayload);
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'MISSING_GRN');
  });
});

describe('R5: Vendor Identity Matching', () => {
  it('Vendor match success', async () => {
    const poNumber = `PO-VM-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-VM',
      issue_date: '2026-01-01',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-VM', quantity: 1, unit_price: 100, line_total: 100 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-VM-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-VM', quantity_received: 1 }]
    });

    const invPayload = {
      invoice_number: `INV-VM-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-VM', // Matches PO
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-VM', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    };
    const resInv = await request('POST', '/api/invoices', invPayload);
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'MATCHED');
  });

  it('Vendor mismatch detection', async () => {
    const poNumber = `PO-VMM-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-VMM-1',
      issue_date: '2026-01-01',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-VMM', quantity: 1, unit_price: 100, line_total: 100 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-VMM-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-VMM', quantity_received: 1 }]
    });

    const invPayload = {
      invoice_number: `INV-VMM-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-VMM-2', // Differs from PO
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-VMM', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    };
    const resInv = await request('POST', '/api/invoices', invPayload);
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'VENDOR_MISMATCH');
  });
});

describe('R6: Line Item Price and Quantity Matching with Tolerances', () => {
  it('Exact 3-way match', async () => {
    const poNumber = `PO-EXACT-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-EXACT',
      issue_date: '2026-01-01',
      total_amount: 200,
      line_items: [{ line_number: 1, item_sku: 'SKU-EXACT', quantity: 2, unit_price: 100, line_total: 200 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-EXACT-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-EXACT', quantity_received: 2 }]
    });

    const resInv = await request('POST', '/api/invoices', {
      invoice_number: `INV-EXACT-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-EXACT',
      invoice_date: '2026-01-10',
      total_amount: 200,
      line_items: [{ line_number: 1, item_sku: 'SKU-EXACT', quantity_billed: 2, unit_price: 100, line_total: 200 }]
    });
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'MATCHED');
  });

  it('Unit price mismatch exceeding tolerance', async () => {
    const poNumber = `PO-PM-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-PM',
      issue_date: '2026-01-01',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-PM', quantity: 1, unit_price: 100, line_total: 100 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-PM-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-PM', quantity_received: 1 }]
    });

    const resInv = await request('POST', '/api/invoices', {
      invoice_number: `INV-PM-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-PM',
      invoice_date: '2026-01-10',
      total_amount: 150,
      line_items: [{ line_number: 1, item_sku: 'SKU-PM', quantity_billed: 1, unit_price: 150, line_total: 150 }] // Exceeds tolerance
    });
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'PRICE_MISMATCH');
  });

  it('Billed quantity exceeds received quantity', async () => {
    const poNumber = `PO-QM-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-QM',
      issue_date: '2026-01-01',
      total_amount: 200,
      line_items: [{ line_number: 1, item_sku: 'SKU-QM', quantity: 2, unit_price: 100, line_total: 200 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-QM-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-QM', quantity_received: 1 }] // Only 1 received
    });

    const resInv = await request('POST', '/api/invoices', {
      invoice_number: `INV-QM-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-QM',
      invoice_date: '2026-01-10',
      total_amount: 200,
      line_items: [{ line_number: 1, item_sku: 'SKU-QM', quantity_billed: 2, unit_price: 100, line_total: 200 }] // Billed for 2
    });
    const invId = resInv.data.id || resInv.data.invoice_id;

    const resMatch = await request('POST', `/api/invoices/${invId}/match`);
    assert.strictEqual(resMatch.status, 200);
    assert.strictEqual(resMatch.data.verdict, 'QUANTITY_MISMATCH');
  });
});

describe('R7: Discrepancy Audit and Match History', () => {
  it('Querying match history', async () => {
    const poNumber = `PO-HIST-${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: poNumber,
      vendor_id: 'VEND-HIST',
      issue_date: '2026-01-01',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-HIST', quantity: 1, unit_price: 100, line_total: 100 }]
    });
    await request('POST', '/api/grn', {
      grn_number: `GRN-HIST-${Date.now()}`,
      po_number: poNumber,
      receipt_date: '2026-01-05',
      received_by: 'STAFF',
      line_items: [{ line_number: 1, item_sku: 'SKU-HIST', quantity_received: 1 }]
    });

    const resInv = await request('POST', '/api/invoices', {
      invoice_number: `INV-HIST-${Date.now()}`,
      po_number: poNumber,
      vendor_id: 'VEND-HIST',
      invoice_date: '2026-01-10',
      total_amount: 100,
      line_items: [{ line_number: 1, item_sku: 'SKU-HIST', quantity_billed: 1, unit_price: 100, line_total: 100 }]
    });
    const invId = resInv.data.id || resInv.data.invoice_id;

    await request('POST', `/api/invoices/${invId}/match`);
    
    const resHist = await request('GET', `/api/invoices/${invId}/match`);
    assert.strictEqual(resHist.status, 200);
    assert.ok(resHist.data.latest_run, 'History should include latest_run');
    assert.ok(Array.isArray(resHist.data.attempts), 'History should include attempts array');
    assert.strictEqual(resHist.data.latest_run.verdict, 'MATCHED');
  });
});

describe('Numeric identifier handling in Express routes', () => {
  it('Should fetch the correct PO when po_number is entirely numeric', async () => {
    // create a dummy PO so the id might be small like 1 or 2
    const dummyPO = { po_number: `PO-DUMMY-${Date.now()}`, vendor_id: 'V1', issue_date: '2025-01-15', total_amount: 10, line_items: [{ item_sku: 'S1', quantity: 1, unit_price: 10, description: 'S1' }] };
    await request('POST', '/api/po', dummyPO);

    const numericPoNumber = `${Date.now()}`;
    await request('POST', '/api/po', {
      po_number: numericPoNumber,
      vendor_id: 'V2',
      issue_date: '2025-01-15',
      total_amount: 20,
      line_items: [{ item_sku: 'S2', quantity: 1, unit_price: 20, description: 'S2' }]
    });

    const res = await request('GET', `/api/po/${numericPoNumber}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.po_number, numericPoNumber);
    assert.strictEqual(res.data.vendor_id, 'V2');
  });

  it('Should fetch the correct Invoice when invoice_number is entirely numeric', async () => {
    const dummyInv = { invoice_number: `INV-DUMMY-${Date.now()}`, po_number: 'PO1', vendor_id: 'V1', invoice_date: '2025-01-15', total_amount: 10, line_items: [{ item_sku: 'S1', quantity_billed: 1, unit_price: 10, line_number: 1 }] };
    await request('POST', '/api/invoice', dummyInv);

    const numericInvNumber = `${Date.now()}`;
    await request('POST', '/api/invoice', {
      invoice_number: numericInvNumber,
      po_number: 'PO1',
      vendor_id: 'V2',
      invoice_date: '2025-01-15',
      total_amount: 20,
      line_items: [{ item_sku: 'S2', quantity_billed: 1, unit_price: 20, line_number: 1 }]
    });

    const res = await request('GET', `/api/invoice/${numericInvNumber}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.invoice_number, numericInvNumber);
    assert.strictEqual(res.data.vendor_id, 'V2');
  });
});
