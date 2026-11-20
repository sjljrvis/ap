# Tasks

## 1. Project Scaffolding & Database Setup

- [ ] 1.1 Initialize Node.js project structure with `package.json`, install `better-sqlite3`, and verify test runner execution
- [ ] 1.2 Implement SQLite schema migration creating tables (`purchase_orders`, `po_line_items`, `goods_receipt_notes`, `grn_line_items`, `invoices`, `invoice_line_items`, `match_results`) and verify database schema creation via integration test

## 2. Document Management Layer

- [ ] 2.1 Implement Purchase Order repository and service with schema validation, and verify PO CRUD operations with unit tests
- [ ] 2.2 Implement Goods Receipt Note repository and service with PO existence check and multi-line item storage, and verify with unit tests
- [ ] 2.3 Implement Invoice repository and service supporting line items and status tracking (`PENDING_MATCH`, `APPROVED_FOR_PAYMENT`, `FLAGGED_FOR_REVIEW`), and verify with unit tests

## 3. 3-Way Matching Engine

- [ ] 3.1 Implement document-level reconciliation checks (PO presence, GRN presence, vendor identity match) and verify error status reporting with unit tests
- [ ] 3.2 Implement line item matching algorithm comparing SKUs, unit prices with price tolerance, and cumulative GRN received quantities with quantity tolerance, and verify with unit tests
- [ ] 3.3 Implement match verdict engine and persistence of discrepancy audit reports in `match_results`, and verify all verdict scenarios (`MATCHED`, `PRICE_MISMATCH`, `QUANTITY_MISMATCH`, `MISSING_PO`, `MISSING_GRN`, `VENDOR_MISMATCH`) with test cases

## 4. API Endpoints & End-to-End Verification

- [ ] 4.1 Implement REST API endpoints (or service facade) for document ingestion (`/api/po`, `/api/grn`, `/api/invoices`) and match execution/reporting (`/api/invoices/:id/match`), and verify with end-to-end tests
- [ ] 4.2 Execute complete end-to-end 3-way matching workflow verifying exact match, price variance, and split-GRN partial delivery scenarios
