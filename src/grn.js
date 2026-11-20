const { getDb } = require('./db');

/**
 * Custom error for not found conditions.
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.statusCode = 404;
    this.code = 'PO_NOT_FOUND';
  }
}

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
 * Create a new Goods Receipt Note referencing an existing PO.
 * @param {object} grnData
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object} The created GRN with line items
 */
function createGoodsReceiptNote(grnData, database) {
  const db = database || getDb();

  if (!grnData || typeof grnData !== 'object') {
    throw new ValidationError('Goods Receipt Note payload must be an object');
  }

  const {
    grn_number,
    po_number,
    receipt_date,
    received_by,
  } = grnData;

  const rawLines = grnData.line_items || grnData.lineItems || grnData.lines || grnData.items || [];

  if (!grn_number || typeof grn_number !== 'string' || grn_number.trim() === '') {
    throw new ValidationError('grn_number is required and must be a non-empty string');
  }
  if (!po_number || typeof po_number !== 'string' || po_number.trim() === '') {
    throw new ValidationError('po_number is required and must be a non-empty string');
  }
  if (!receipt_date) {
    throw new ValidationError('receipt_date is required');
  }
  if (!received_by || typeof received_by !== 'string' || received_by.trim() === '') {
    throw new ValidationError('received_by is required');
  }

  // Verify referenced PO exists in the database
  const poExists = db.prepare('SELECT id, po_number FROM purchase_orders WHERE po_number = ?').get(po_number);
  if (!poExists) {
    throw new NotFoundError(`Purchase Order with po_number "${po_number}" does not exist in the database`);
  }

  // Check for duplicate grn_number
  const existingGrn = db.prepare('SELECT id FROM goods_receipt_notes WHERE grn_number = ?').get(grn_number);
  if (existingGrn) {
    throw new ConflictError(`Goods Receipt Note with grn_number "${grn_number}" already exists`);
  }

  const insertGRN = db.prepare(`
    INSERT INTO goods_receipt_notes (grn_number, po_number, receipt_date, received_by)
    VALUES (?, ?, ?, ?)
  `);

  const insertLine = db.prepare(`
    INSERT INTO grn_line_items (grn_id, line_number, item_sku, quantity_received)
    VALUES (?, ?, ?, ?)
  `);

  const executeTransaction = db.transaction(() => {
    let grnResult;
    try {
      grnResult = insertGRN.run(grn_number, po_number, receipt_date, received_by);
    } catch (err) {
      if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        throw new NotFoundError(`Referenced Purchase Order "${po_number}" does not exist`);
      }
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError(`Goods Receipt Note with grn_number "${grn_number}" already exists`);
      }
      throw err;
    }

    const grnId = grnResult.lastInsertRowid;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const lineNumber = line.line_number !== undefined ? line.line_number : (line.lineNumber !== undefined ? line.lineNumber : i + 1);
      const sku = line.item_sku || line.itemSku || line.sku;
      const qtyReceived = Number(line.quantity_received !== undefined ? line.quantity_received : (line.quantityReceived !== undefined ? line.quantityReceived : 0));

      insertLine.run(grnId, lineNumber, sku, qtyReceived);
    }

    return grnId;
  });

  const grnId = executeTransaction();
  return getGoodsReceiptNoteById(grnId, db);
}

/**
 * Retrieve a Goods Receipt Note by its grn_number or id.
 * @param {string|number} grnNumberOrId
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getGoodsReceiptNote(grnNumberOrId, database) {
  const db = database || getDb();

  let grnRow;
  if (typeof grnNumberOrId === 'number' || (!isNaN(grnNumberOrId) && !grnNumberOrId.toString().startsWith('GRN-'))) {
    grnRow = db.prepare('SELECT * FROM goods_receipt_notes WHERE id = ?').get(grnNumberOrId);
  }
  if (!grnRow) {
    grnRow = db.prepare('SELECT * FROM goods_receipt_notes WHERE grn_number = ?').get(grnNumberOrId);
  }

  if (!grnRow) {
    return null;
  }

  const lines = db.prepare(`
    SELECT id, grn_id, line_number, item_sku, quantity_received, created_at
    FROM grn_line_items
    WHERE grn_id = ?
    ORDER BY line_number ASC
  `).all(grnRow.id);

  return {
    ...grnRow,
    line_items: lines,
    lines,
    items: lines,
  };
}

/**
 * Retrieve a Goods Receipt Note specifically by id.
 * @param {number} id
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getGoodsReceiptNoteById(id, database) {
  const db = database || getDb();
  const grnRow = db.prepare('SELECT * FROM goods_receipt_notes WHERE id = ?').get(id);
  if (!grnRow) return null;

  const lines = db.prepare(`
    SELECT id, grn_id, line_number, item_sku, quantity_received, created_at
    FROM grn_line_items
    WHERE grn_id = ?
    ORDER BY line_number ASC
  `).all(grnRow.id);

  return {
    ...grnRow,
    line_items: lines,
    lines,
    items: lines,
  };
}

/**
 * Retrieve all Goods Receipt Notes referencing a specific PO number.
 * @param {string} poNumber
 * @param {import('better-sqlite3').Database} [database]
 * @returns {Array<object>}
 */
function getGRNsByPONumber(poNumber, database) {
  const db = database || getDb();
  const grnRows = db.prepare('SELECT * FROM goods_receipt_notes WHERE po_number = ? ORDER BY id ASC').all(poNumber);

  return grnRows.map((grn) => {
    const lines = db.prepare(`
      SELECT id, grn_id, line_number, item_sku, quantity_received, created_at
      FROM grn_line_items
      WHERE grn_id = ?
      ORDER BY line_number ASC
    `).all(grn.id);

    return {
      ...grn,
      line_items: lines,
      lines,
      items: lines,
    };
  });
}

/**
 * List all Goods Receipt Notes with pagination.
 * @param {object} [options]
 * @param {import('better-sqlite3').Database} [database]
 * @returns {Array<object>}
 */
function listGoodsReceiptNotes(options = {}, database) {
  const db = database || getDb();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = db.prepare('SELECT * FROM goods_receipt_notes ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
  return rows.map((grn) => {
    const lines = db.prepare('SELECT * FROM grn_line_items WHERE grn_id = ? ORDER BY line_number ASC').all(grn.id);
    return {
      ...grn,
      line_items: lines,
      lines,
      items: lines,
    };
  });
}

class GoodsReceiptNoteService {
  constructor(db) {
    this.db = db;
  }

  getDatabase() {
    return this.db || getDb();
  }

  async createGoodsReceiptNote(grnData) {
    return createGoodsReceiptNote(grnData, this.getDatabase());
  }

  async createGRN(grnData) {
    return this.createGoodsReceiptNote(grnData);
  }

  async create(grnData) {
    return this.createGoodsReceiptNote(grnData);
  }

  async getGoodsReceiptNote(grnNumberOrId) {
    return getGoodsReceiptNote(grnNumberOrId, this.getDatabase());
  }

  async getGRN(grnNumberOrId) {
    return this.getGoodsReceiptNote(grnNumberOrId);
  }

  async getByGrnNumber(grnNumber) {
    return this.getGoodsReceiptNote(grnNumber);
  }

  async get(grnNumberOrId) {
    return this.getGoodsReceiptNote(grnNumberOrId);
  }

  async getById(id) {
    return getGoodsReceiptNoteById(id, this.getDatabase());
  }

  async getByPoNumber(poNumber) {
    return getGRNsByPONumber(poNumber, this.getDatabase());
  }

  async getByPONumber(poNumber) {
    return getGRNsByPONumber(poNumber, this.getDatabase());
  }

  async list(options) {
    return listGoodsReceiptNotes(options, this.getDatabase());
  }
}

module.exports = {
  createGoodsReceiptNote,
  createGRN: createGoodsReceiptNote,
  create: createGoodsReceiptNote,
  getGoodsReceiptNote,
  getGRN: getGoodsReceiptNote,
  getByGrnNumber: getGoodsReceiptNote,
  get: getGoodsReceiptNote,
  getGoodsReceiptNoteById,
  getGRNsByPONumber,
  getGRNsByPoNumber: getGRNsByPONumber,
  listGoodsReceiptNotes,
  GoodsReceiptNoteService,
  grnService: new GoodsReceiptNoteService(),
  NotFoundError,
  ConflictError,
  ValidationError,
};
