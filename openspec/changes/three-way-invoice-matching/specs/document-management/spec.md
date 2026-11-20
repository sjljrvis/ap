# Spec Delta

## Purpose

Provides persistence, retrieval, and validation for accounts payable documents including Purchase Orders, Goods Receipt Notes, and Invoices.

## ADDED Requirements

### Requirement: Purchase Order Storage and Retrieval
The system SHALL store and retrieve Purchase Orders (PO) containing header details (po_number, vendor_id, issue_date, status, total_amount, currency) and line items (line_number, item_sku, description, quantity, unit_price, line_total).

#### Scenario: Successfully create and retrieve a Purchase Order
- **WHEN** a client submits a valid Purchase Order payload with header and line items
- **THEN** the system persists the PO in SQLite and returns the stored document with generated identifiers and timestamps

#### Scenario: Reject duplicate Purchase Order number
- **WHEN** a client submits a Purchase Order with a po_number that already exists
- **THEN** the system rejects the submission with a 409 Conflict or validation error

### Requirement: Goods Receipt Note Storage and Retrieval
The system SHALL store and retrieve Goods Receipt Notes (GRN) containing header details (grn_number, po_number, receipt_date, received_by) and line items (line_number, item_sku, quantity_received).

#### Scenario: Successfully create and retrieve a GRN
- **WHEN** a client submits a valid Goods Receipt Note referencing an existing PO
- **THEN** the system persists the GRN and line items in SQLite and returns the stored record

#### Scenario: Reject GRN referencing non-existent PO
- **WHEN** a client submits a GRN referencing a po_number that does not exist in the database
- **THEN** the system rejects the submission and returns an error indicating the PO was not found

### Requirement: Invoice Storage and Retrieval
The system SHALL store and retrieve supplier Invoices containing header details (invoice_number, po_number, vendor_id, invoice_date, due_date, total_amount, status) and line items (line_number, item_sku, quantity_billed, unit_price, line_total).

#### Scenario: Successfully create and retrieve an Invoice
- **WHEN** a client submits a valid Invoice payload referencing a Purchase Order
- **THEN** the system persists the invoice and line items in SQLite with an initial status of PENDING_MATCH

#### Scenario: Reject duplicate Invoice number for the same vendor
- **WHEN** an invoice with an existing invoice_number for the same vendor_id is submitted
- **THEN** the system rejects the duplicate submission with a validation error
