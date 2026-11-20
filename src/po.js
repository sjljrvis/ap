const { getDb } = require('./db');

/**
 * Custom error for conflict conditions (e.g. duplicate resources).
 */
class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
    this.statusCode = 409;
    this.code = 'SQLITE_CONSTRAINT_UNIQUE';
  }
}

/**
 * Custom error for validation errors.
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.statusCode = 400;
  }
}

/**
 * Custom error for not found conditions.
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

/**
 * Create a new Purchase Order along with its line items.
 * @param {object} poData
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object} The created purchase order with line items
 */
function createPurchaseOrder(poData, database) {
  const db = database || getDb();

  if (!poData || typeof poData !== 'object') {
    throw new ValidationError('Purchase Order payload must be an object');
  }

  const {
    po_number,
    vendor_id,
    issue_date,
    status = 'OPEN',
    total_amount,
    currency = 'USD',
  } = poData;

  const rawLines = poData.line_items || poData.lineItems || poData.lines || poData.items || [];

  if (!po_number || typeof po_number !== 'string' || po_number.trim() === '') {
    throw new ValidationError('po_number is required and must be a non-empty string');
  }
  if (!vendor_id || typeof vendor_id !== 'string' || vendor_id.trim() === '') {
    throw new ValidationError('vendor_id is required');
  }
  if (!issue_date) {
    throw new ValidationError('issue_date is required');
  }
  if (total_amount === undefined || total_amount === null || isNaN(Number(total_amount))) {
    throw new ValidationError('total_amount is required and must be a number');
  }

  // Check for duplicate po_number
  const existing = db.prepare('SELECT id FROM purchase_orders WHERE po_number = ?').get(po_number);
  if (existing) {
    throw new ConflictError(`Purchase Order with po_number "${po_number}" already exists`);
  }

  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (po_number, vendor_id, issue_date, status, total_amount, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertLine = db.prepare(`
    INSERT INTO po_line_items (po_id, line_number, item_sku, description, quantity, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const executeTransaction = db.transaction(() => {
    let poResult;
    try {
      poResult = insertPO.run(
        po_number,
        vendor_id,
        issue_date,
        status,
        Number(total_amount),
        currency
      );
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError(`Purchase Order with po_number "${po_number}" already exists`);
      }
      throw err;
    }

    const poId = poResult.lastInsertRowid;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const lineNumber = line.line_number !== undefined ? line.line_number : (line.lineNumber !== undefined ? line.lineNumber : i + 1);
      const sku = line.item_sku || line.itemSku || line.sku;
      const desc = line.description || '';
      const qty = Number(line.quantity !== undefined ? line.quantity : 0);
      const unitPrice = Number(line.unit_price !== undefined ? line.unit_price : (line.unitPrice !== undefined ? line.unitPrice : 0));
      const lineTotal = Number(line.line_total !== undefined ? line.line_total : (line.lineTotal !== undefined ? line.lineTotal : qty * unitPrice));

      insertLine.run(poId, lineNumber, sku, desc, qty, unitPrice, lineTotal);
    }

    return poId;
  });

  const poId = executeTransaction();
  return getPurchaseOrderById(poId, db);
}

/**
 * Retrieve a Purchase Order by its po_number or id.
 * @param {string|number} poNumberOrId
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getPurchaseOrder(poNumberOrId, database) {
  const db = database || getDb();

  let poRow;
  if (typeof poNumberOrId === 'number' || (!isNaN(poNumberOrId) && !poNumberOrId.toString().startsWith('PO-'))) {
    poRow = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poNumberOrId);
  }
  if (!poRow) {
    poRow = db.prepare('SELECT * FROM purchase_orders WHERE po_number = ?').get(poNumberOrId);
  }

  if (!poRow) {
    return null;
  }

  const lines = db.prepare(`
    SELECT id, po_id, line_number, item_sku, description, quantity, unit_price, line_total, created_at
    FROM po_line_items
    WHERE po_id = ?
    ORDER BY line_number ASC
  `).all(poRow.id);

  return {
    ...poRow,
    line_items: lines,
    lines,
    items: lines,
  };
}

/**
 * Retrieve a Purchase Order specifically by id.
 * @param {number} id
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getPurchaseOrderById(id, database) {
  const db = database || getDb();
  const poRow = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  if (!poRow) return null;

  const lines = db.prepare(`
    SELECT id, po_id, line_number, item_sku, description, quantity, unit_price, line_total, created_at
    FROM po_line_items
    WHERE po_id = ?
    ORDER BY line_number ASC
  `).all(poRow.id);

  return {
    ...poRow,
    line_items: lines,
    lines,
    items: lines,
  };
}

/**
 * List all Purchase Orders with optional limit and offset.
 * @param {object} [options]
 * @param {import('better-sqlite3').Database} [database]
 * @returns {Array<object>}
 */
function listPurchaseOrders(options = {}, database) {
  const db = database || getDb();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = db.prepare('SELECT * FROM purchase_orders ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
  return rows.map((po) => {
    const lines = db.prepare('SELECT * FROM po_line_items WHERE po_id = ? ORDER BY line_number ASC').all(po.id);
    return {
      ...po,
      line_items: lines,
      lines,
      items: lines,
    };
  });
}

class PurchaseOrderService {
  constructor(db) {
    this.db = db;
  }

  getDatabase() {
    return this.db || getDb();
  }

  async createPurchaseOrder(poData) {
    return createPurchaseOrder(poData, this.getDatabase());
  }

  async createPO(poData) {
    return this.createPurchaseOrder(poData);
  }

  async create(poData) {
    return this.createPurchaseOrder(poData);
  }

  async getPurchaseOrder(poNumberOrId) {
    return getPurchaseOrder(poNumberOrId, this.getDatabase());
  }

  async getPO(poNumberOrId) {
    return this.getPurchaseOrder(poNumberOrId);
  }

  async getByPoNumber(poNumber) {
    return this.getPurchaseOrder(poNumber);
  }

  async get(poNumberOrId) {
    return this.getPurchaseOrder(poNumberOrId);
  }

  async getById(id) {
    return getPurchaseOrderById(id, this.getDatabase());
  }

  async list(options) {
    return listPurchaseOrders(options, this.getDatabase());
  }
}

module.exports = {
  createPurchaseOrder,
  createPO: createPurchaseOrder,
  create: createPurchaseOrder,
  getPurchaseOrder,
  getPO: getPurchaseOrder,
  getByPoNumber: getPurchaseOrder,
  get: getPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  PurchaseOrderService,
  poService: new PurchaseOrderService(),
  ConflictError,
  ValidationError,
  NotFoundError,
};
