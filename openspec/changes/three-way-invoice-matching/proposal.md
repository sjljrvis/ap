# Proposal

## Why
Accounts Payable teams spend significant manual effort verifying supplier invoices against purchase orders and warehouse goods receipts. Automating 3-way invoice matching (Invoice vs. PO vs. GRN) ensures organizations only pay for items actually ordered and received at agreed-upon prices, preventing overpayment, fraudulent billing, and human error while speeding up invoice processing.

## What Changes
- Introduce SQLite database schema and persistence layer in Node.js for storing Purchase Orders (PO), Goods Receipt Notes (GRN), and Invoices along with their line items.
- Implement an automated 3-way matching engine that reconciles:
  - PO vs. Invoice: Vendor matching, line-item pricing (unit price verification within configurable tolerance), and ordered quantities.
  - GRN vs. Invoice: Billed quantity verification against physically received quantities recorded in GRNs.
  - Overall match verdict (`MATCHED`, `PRICE_MISMATCH`, `QUANTITY_MISMATCH`, `MISSING_GRN`, `MISSING_PO`, `VENDOR_MISMATCH`).
- Provide discrepancy analysis detailing line-by-line differences, tolerance calculations, and total variance.
- Expose Node.js service interfaces and API endpoints to ingest documents, trigger matching runs, and query match results.

## Capabilities

### New Capabilities
- `document-management`: Storage, validation, and retrieval of Purchase Orders, Goods Receipt Notes, and Invoices with line items using SQLite.
- `matching-engine`: 3-way reconciliation engine comparing Invoice, PO, and GRN attributes (vendor, line items, quantities, prices, tolerances) and generating discrepancy reports.

### Modified Capabilities
(none)

## Impact
- New Node.js project dependencies: SQLite driver (e.g. `better-sqlite3` or `sqlite3` / `sqlite`), validation libraries (e.g. `zod`), and testing framework (e.g. `node:test` or `vitest`).
- Data storage: SQLite database file initialized with normalized tables for documents and line items.
- APIs: Service/REST endpoints for document ingestion and match evaluation.
