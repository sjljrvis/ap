# Design

## Context
Accounts payable requires reconciling invoices with purchase orders and goods receipt notes before authorizing disbursement. See `proposal.md` and spec deltas for detailed requirements. The implementation is in Node.js using SQLite as the relational storage engine.

## Goals / Non-Goals

**Goals:**
- Provide a robust, clean relational schema in SQLite representing Purchase Orders, Goods Receipt Notes, and Invoices with respective line items.
- Implement a deterministic 3-way matching algorithm that matches line items by SKU (with fallback to line number), verifies vendor consistency, and checks prices and cumulative received quantities against configurable tolerance thresholds.
- Return structured verdicts (`MATCHED`, `PRICE_MISMATCH`, `QUANTITY_MISMATCH`, `MISSING_PO`, `MISSING_GRN`, `VENDOR_MISMATCH`) alongside comprehensive line-by-line discrepancy details.
- Provide a clear service interface and RESTful HTTP API for document submission, match execution, and result retrieval.
- Comprehensive automated test coverage (unit and integration tests).

**Non-Goals:**
- Optical Character Recognition (OCR) or PDF parsing (documents are assumed to be submitted as structured JSON payloads).
- Direct ERP integration (e.g., SAP, NetSuite, Oracle) or payment gateway execution.
- Complex tax engine calculations (tax reconciliation is decoupled from the base 3-way matching rule).

## Decisions

### 1. Database Driver: `better-sqlite3`
- **Choice**: Use `better-sqlite3` for synchronous, performant, and reliable SQLite operations with complete transaction and prepared statement support.
- **Alternatives Considered**:
  - `sqlite3` (callback/async wrapper): Slower, more verbose error-handling boilerplate.
  - `node:sqlite` (Node.js built-in): Still experimental in Node 22 and requires experimental flags.
  - In-memory mock: Lacks relational integrity checks and foreign key constraints.

### 2. Multi-GRN Cumulative Quantity Aggregation
- **Choice**: Aggregate received quantities across all Goods Receipt Notes referencing the target PO for a given item SKU.
- **Rationale**: Real-world supply chains frequently deliver orders in split or partial shipments across multiple receipts. Comparing invoice line items against the sum of received quantities for that SKU accurately supports partial and multi-receipt fulfillment.
- **Alternatives Considered**:
  - 1:1 Invoice-to-GRN mapping: Inflexible and fails for split deliveries.

### 3. Matching Order & Priority of Verdicts
- **Choice**: Sequential validation pipeline:
  1. Header validations (PO existence, GRN existence, Vendor ID equality).
  2. Line item pairing (matching by `item_sku`).
  3. Price tolerance evaluation against PO line unit price.
  4. Quantity tolerance evaluation against PO ordered quantity and GRN cumulative received quantity.
  If any step fails, the verdict reflects the primary failure reason while still returning all granular line discrepancies in the result payload.

### 4. Tolerances Handling
- **Choice**: Configurable percentage thresholds for price tolerance (e.g., `priceTolerancePercent = 0.0` default, allows up to specified % variance) and quantity tolerance (`quantityTolerancePercent = 0.0` default).
- **Rationale**: Accommodates standard business tolerance rules without hardcoding arbitrary currency thresholds.

### 5. Schema & Foreign Keys
- Enable `PRAGMA foreign_keys = ON;` in SQLite.
- Normalized tables: `purchase_orders`, `po_line_items`, `goods_receipt_notes`, `grn_line_items`, `invoices`, `invoice_line_items`, and `match_results`.

## Risks / Trade-offs

- [Risk] Unmatched SKUs across documents (e.g., invoice uses vendor SKU while PO uses internal catalog SKU).
  → *Mitigation*: Support SKU matching with line-number fallback or alias mapping in line matching strategy.
- [Risk] Double billing across multiple invoices against the same PO/GRN.
  → *Mitigation*: Track previously matched and billed quantities per PO line item across all historical approved invoices, preventing cumulative overbilling.
- [Risk] Floating point rounding errors in price/total calculations.
  → *Mitigation*: Perform monetary comparisons with fixed cents/precision calculations (or integer amounts in cents) and explicit tolerance delta comparisons.
