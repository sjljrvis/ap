# Spec Delta

## Purpose

Executes 3-way reconciliation comparing Invoices against Purchase Orders and Goods Receipt Notes to detect price, quantity, and vendor discrepancies.

## ADDED Requirements

### Requirement: Document Association Verification
The matching engine SHALL verify that the Invoice references a valid Purchase Order and that at least one associated Goods Receipt Note exists for that Purchase Order before line reconciliation.

#### Scenario: Missing Purchase Order
- **WHEN** an invoice references a po_number that does not exist in the system
- **THEN** the engine marks the match status as MISSING_PO and records a missing document discrepancy

#### Scenario: Missing Goods Receipt Note
- **WHEN** an invoice references a valid PO but no corresponding GRN exists for that PO
- **THEN** the engine marks the match status as MISSING_GRN and flags the invoice for pending goods receipt

### Requirement: Vendor Identity Matching
The matching engine SHALL verify that the vendor_id on the Invoice strictly matches the vendor_id specified on the referenced Purchase Order.

#### Scenario: Vendor match success
- **WHEN** the invoice vendor_id is identical to the purchase order vendor_id
- **THEN** the engine passes vendor validation and proceeds to line item matching

#### Scenario: Vendor mismatch detection
- **WHEN** the invoice vendor_id differs from the purchase order vendor_id
- **THEN** the engine flags the match with VENDOR_MISMATCH status and rejects automatic approval

### Requirement: Line Item Price and Quantity Matching with Tolerances
The matching engine SHALL compare each invoice line item against corresponding PO line items (for unit price and ordered quantity) and GRN line items (for cumulative received quantity) within defined tolerance thresholds.

#### Scenario: Exact 3-way match
- **WHEN** all invoice line items match PO unit prices and have quantities less than or equal to cumulative GRN received quantities
- **THEN** the engine assigns the invoice a status of MATCHED and updates the invoice state to APPROVED_FOR_PAYMENT

#### Scenario: Unit price mismatch exceeding tolerance
- **WHEN** an invoice line item unit price exceeds the PO line item unit price beyond the allowed price tolerance percentage
- **THEN** the engine marks the result as PRICE_MISMATCH, details the price variance per line, and flags the invoice as FLAGGED_FOR_REVIEW

#### Scenario: Billed quantity exceeds received quantity
- **WHEN** an invoice line item billed quantity exceeds the total quantity received across associated GRNs
- **THEN** the engine marks the result as QUANTITY_MISMATCH and records the unreceived quantity variance

### Requirement: Discrepancy Audit and Match History
The matching engine SHALL record every matching execution result in SQLite, detailing the match verdict, individual line item differences, applied tolerances, and execution timestamp.

#### Scenario: Querying match history
- **WHEN** a client requests the match details for a specific invoice
- **THEN** the system returns the latest match run, verdict, line item discrepancy breakdown, and historical match attempts
