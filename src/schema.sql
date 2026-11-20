-- SQLite schema for 3-way invoice matching

PRAGMA foreign_keys = ON;

-- 1. Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  vendor_id TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_vendor_id ON purchase_orders(vendor_id);

-- 2. PO Line Items table
CREATE TABLE IF NOT EXISTS po_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_sku TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(po_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po_id ON po_line_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_sku ON po_line_items(item_sku);

-- 3. Goods Receipt Notes table
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_number TEXT NOT NULL UNIQUE,
  po_number TEXT NOT NULL REFERENCES purchase_orders(po_number) ON DELETE RESTRICT,
  receipt_date TEXT NOT NULL,
  received_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grn_number ON goods_receipt_notes(grn_number);
CREATE INDEX IF NOT EXISTS idx_grn_po_number ON goods_receipt_notes(po_number);

-- 4. GRN Line Items table
CREATE TABLE IF NOT EXISTS grn_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_sku TEXT NOT NULL,
  quantity_received REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(grn_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_grn_lines_grn_id ON grn_line_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_sku ON grn_line_items(item_sku);

-- 5. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL,
  po_number TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'PENDING_MATCH',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(vendor_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_po_number ON invoices(po_number);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id);

-- 6. Invoice Line Items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_sku TEXT NOT NULL,
  quantity_billed REAL NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_sku ON invoice_line_items(item_sku);

-- 7. Match Results table
CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  details TEXT,
  price_tolerance_percent REAL NOT NULL DEFAULT 0.0,
  quantity_tolerance_percent REAL NOT NULL DEFAULT 0.0,
  matched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_match_results_invoice_id ON match_results(invoice_id);
