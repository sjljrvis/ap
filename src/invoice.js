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
 * Create a new Invoice along with its line items.
 * @param {object} invoiceData
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object} The created invoice with line items
 */
function createInvoice(invoiceData, database) {
  const db = database || getDb();

  if (!invoiceData || typeof invoiceData !== 'object') {
    throw new ValidationError('Invoice payload must be an object');
  }

  const {
    invoice_number,
    po_number,
    vendor_id,
    invoice_date,
    due_date = null,
    total_amount,
    currency = 'USD',
    status = 'PENDING_MATCH',
  } = invoiceData;

  const rawLines =
    invoiceData.line_items ||
    invoiceData.lineItems ||
    invoiceData.lines ||
    invoiceData.items ||
    [];

  if (!invoice_number || typeof invoice_number !== 'string' || invoice_number.trim() === '') {
    throw new ValidationError('invoice_number is required and must be a non-empty string');
  }
  if (!po_number || typeof po_number !== 'string' || po_number.trim() === '') {
    throw new ValidationError('po_number is required and must be a non-empty string');
  }
  if (!vendor_id || typeof vendor_id !== 'string' || vendor_id.trim() === '') {
    throw new ValidationError('vendor_id is required and must be a non-empty string');
  }
  if (!invoice_date) {
    throw new ValidationError('invoice_date is required');
  }
  if (total_amount === undefined || total_amount === null || isNaN(Number(total_amount))) {
    throw new ValidationError('total_amount is required and must be a number');
  }

  // Check for duplicate invoice_number for the same vendor_id
  const existing = db
    .prepare('SELECT id FROM invoices WHERE invoice_number = ? AND vendor_id = ?')
    .get(invoice_number, vendor_id);
  if (existing) {
    throw new ConflictError(
      `Invoice with invoice_number "${invoice_number}" already exists for vendor "${vendor_id}"`
    );
  }

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (invoice_number, po_number, vendor_id, invoice_date, due_date, total_amount, currency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLine = db.prepare(`
    INSERT INTO invoice_line_items (invoice_id, line_number, item_sku, quantity_billed, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const executeTransaction = db.transaction(() => {
    let invResult;
    try {
      invResult = insertInvoice.run(
        invoice_number,
        po_number,
        vendor_id,
        invoice_date,
        due_date,
        Number(total_amount),
        currency,
        status
      );
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError(
          `Invoice with invoice_number "${invoice_number}" already exists for vendor "${vendor_id}"`
        );
      }
      throw err;
    }

    const invoiceId = invResult.lastInsertRowid;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const lineNumber =
        line.line_number !== undefined
          ? line.line_number
          : line.lineNumber !== undefined
          ? line.lineNumber
          : i + 1;
      const sku = line.item_sku || line.itemSku || line.sku;
      const qtyBilled = Number(
        line.quantity_billed !== undefined
          ? line.quantity_billed
          : line.quantityBilled !== undefined
          ? line.quantityBilled
          : line.quantity !== undefined
          ? line.quantity
          : 0
      );
      const unitPrice = Number(
        line.unit_price !== undefined
          ? line.unit_price
          : line.unitPrice !== undefined
          ? line.unitPrice
          : 0
      );
      const lineTotal = Number(
        line.line_total !== undefined
          ? line.line_total
          : line.lineTotal !== undefined
          ? line.lineTotal
          : qtyBilled * unitPrice
      );

      insertLine.run(invoiceId, lineNumber, sku, qtyBilled, unitPrice, lineTotal);
    }

    return invoiceId;
  });

  const invoiceId = executeTransaction();
  return getInvoiceById(invoiceId, db);
}

/**
 * Retrieve an Invoice specifically by id.
 * @param {number} id
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getInvoiceById(id, database) {
  const db = database || getDb();
  const invRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invRow) return null;

  const lines = db
    .prepare(
      `
    SELECT id, invoice_id, line_number, item_sku, quantity_billed, unit_price, line_total, created_at
    FROM invoice_line_items
    WHERE invoice_id = ?
    ORDER BY line_number ASC
  `
    )
    .all(invRow.id);

  return {
    ...invRow,
    line_items: lines,
    lineItems: lines,
    lines,
    items: lines,
  };
}

/**
 * Retrieve an Invoice by its invoice_number or id, with optional vendor_id.
 * @param {string|number} invoiceNumberOrId
 * @param {string|import('better-sqlite3').Database} [vendorIdOrDatabase]
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object|null}
 */
function getInvoice(invoiceNumberOrId, vendorIdOrDatabase, database) {
  let vendorId = null;
  let db = null;

  if (typeof vendorIdOrDatabase === 'string') {
    vendorId = vendorIdOrDatabase;
    db = database || getDb();
  } else if (vendorIdOrDatabase && typeof vendorIdOrDatabase.prepare === 'function') {
    db = vendorIdOrDatabase;
  } else {
    db = database || getDb();
  }

  let invRow = null;

  // 1. If it's a number, try fetching by primary key id first
  if (typeof invoiceNumberOrId === 'number') {
    invRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceNumberOrId);
  }

  // 2. If vendorId is specified, query by invoice_number and vendor_id
  if (!invRow && vendorId) {
    invRow = db
      .prepare('SELECT * FROM invoices WHERE invoice_number = ? AND vendor_id = ?')
      .get(invoiceNumberOrId, vendorId);
  }

  // 3. Try fetching by invoice_number
  if (!invRow) {
    invRow = db
      .prepare('SELECT * FROM invoices WHERE invoice_number = ? ORDER BY id DESC LIMIT 1')
      .get(invoiceNumberOrId);
  }

  // 4. If still not found and input is numeric string, try fetching by id
  if (!invRow && !isNaN(invoiceNumberOrId) && !String(invoiceNumberOrId).startsWith('INV-')) {
    invRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(invoiceNumberOrId));
  }

  if (!invRow) {
    return null;
  }

  const lines = db
    .prepare(
      `
    SELECT id, invoice_id, line_number, item_sku, quantity_billed, unit_price, line_total, created_at
    FROM invoice_line_items
    WHERE invoice_id = ?
    ORDER BY line_number ASC
  `
    )
    .all(invRow.id);

  return {
    ...invRow,
    line_items: lines,
    lineItems: lines,
    lines,
    items: lines,
  };
}

/**
 * Retrieve all Invoices referencing a specific PO number.
 * @param {string} poNumber
 * @param {import('better-sqlite3').Database} [database]
 * @returns {Array<object>}
 */
function getInvoicesByPONumber(poNumber, database) {
  const db = database || getDb();
  const rows = db
    .prepare('SELECT * FROM invoices WHERE po_number = ? ORDER BY id ASC')
    .all(poNumber);

  return rows.map((inv) => {
    const lines = db
      .prepare(
        `
      SELECT id, invoice_id, line_number, item_sku, quantity_billed, unit_price, line_total, created_at
      FROM invoice_line_items
      WHERE invoice_id = ?
      ORDER BY line_number ASC
    `
      )
      .all(inv.id);

    return {
      ...inv,
      line_items: lines,
      lineItems: lines,
      lines,
      items: lines,
    };
  });
}

/**
 * Update invoice status.
 * @param {string|number} idOrInvoiceNumber
 * @param {string} status
 * @param {string|import('better-sqlite3').Database} [vendorIdOrDatabase]
 * @param {import('better-sqlite3').Database} [database]
 * @returns {object} Updated invoice
 */
function updateInvoiceStatus(idOrInvoiceNumber, status, vendorIdOrDatabase, database) {
  const invoice = getInvoice(idOrInvoiceNumber, vendorIdOrDatabase, database);
  if (!invoice) {
    throw new NotFoundError(`Invoice "${idOrInvoiceNumber}" not found`);
  }

  let db;
  if (vendorIdOrDatabase && typeof vendorIdOrDatabase.prepare === 'function') {
    db = vendorIdOrDatabase;
  } else if (database && typeof database.prepare === 'function') {
    db = database;
  } else {
    db = getDb();
  }

  db.prepare(
    `
    UPDATE invoices
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(status, invoice.id);

  return getInvoiceById(invoice.id, db);
}

/**
 * List all Invoices with pagination.
 * @param {object} [options]
 * @param {import('better-sqlite3').Database} [database]
 * @returns {Array<object>}
 */
function listInvoices(options = {}, database) {
  const db = database || getDb();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = db
    .prepare('SELECT * FROM invoices ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset);

  return rows.map((inv) => {
    const lines = db
      .prepare(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY line_number ASC'
      )
      .all(inv.id);
    return {
      ...inv,
      line_items: lines,
      lineItems: lines,
      lines,
      items: lines,
    };
  });
}

class InvoiceService {
  constructor(db) {
    this.db = db;
  }

  getDatabase() {
    return this.db || getDb();
  }

  async createInvoice(invoiceData) {
    return createInvoice(invoiceData, this.getDatabase());
  }

  async create(invoiceData) {
    return this.createInvoice(invoiceData);
  }

  async getInvoice(invoiceNumberOrId, vendorId) {
    return getInvoice(invoiceNumberOrId, vendorId, this.getDatabase());
  }

  async getInvoiceByNumber(invoiceNumber, vendorId) {
    return getInvoice(invoiceNumber, vendorId, this.getDatabase());
  }

  async getByInvoiceNumber(invoiceNumber, vendorId) {
    return getInvoice(invoiceNumber, vendorId, this.getDatabase());
  }

  async get(invoiceNumberOrId, vendorId) {
    return getInvoice(invoiceNumberOrId, vendorId, this.getDatabase());
  }

  async getById(id) {
    return getInvoiceById(id, this.getDatabase());
  }

  async getByPoNumber(poNumber) {
    return getInvoicesByPONumber(poNumber, this.getDatabase());
  }

  async getByPONumber(poNumber) {
    return getInvoicesByPONumber(poNumber, this.getDatabase());
  }

  async updateStatus(idOrInvoiceNumber, status, vendorId) {
    return updateInvoiceStatus(idOrInvoiceNumber, status, vendorId, this.getDatabase());
  }

  async list(options) {
    return listInvoices(options, this.getDatabase());
  }
}

module.exports = {
  createInvoice,
  create: createInvoice,
  getInvoice,
  getInvoiceByNumber: getInvoice,
  getByInvoiceNumber: getInvoice,
  get: getInvoice,
  getInvoiceById,
  getInvoicesByPONumber,
  getInvoicesByPoNumber: getInvoicesByPONumber,
  updateInvoiceStatus,
  listInvoices,
  InvoiceService,
  invoiceService: new InvoiceService(),
  ConflictError,
  ValidationError,
  NotFoundError,
};
