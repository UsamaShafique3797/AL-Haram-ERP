# 04 — Data Model

High‑level entities and how they relate. This is the conceptual model that drives the database
(EF Core entities + migrations). Every entity also has audit fields: `Id`, `CreatedBy`, `CreatedAt`,
`UpdatedBy`, `UpdatedAt`, `IsDeleted`.

## Entity groups

### Master data
- **Company** — name, logo, address, tax number, default currency & tax %.
- **Godown** — storage location (name, address).
- **User / Role / Permission** — login accounts and access control.
- **Category** — item grouping (Steel Bars, Rings, Cement…).
- **Unit** — kg, ton, piece, bundle, bag, cft… with conversion factors.
- **Item** — product master.
- **ItemUnit** — links an Item to its base/secondary units + conversion factor + standard weight.
- **PriceList / PriceListItem** — retail vs wholesale rates; daily rate updates.
- **Customer** — buyer (credit limit, terms, opening balance).
- **Supplier** — vendor (terms, opening balance).
- **ExpenseCategory** — rent, salary, fuel, labor…
- **PaymentAccount** — Cash, Bank A/C, etc.

### Inventory
- **StockItem** — current quantity & average cost per Item per Godown.
- **StockMovement** — every in/out (purchase, sale, return, adjustment, transfer, production) with qty, cost, reference.
- **StockAdjustment** / **StockAdjustmentLine** — wastage/damage/correction.
- **StockTransfer** / line — between godowns.
- **StockTake** / line — physical count vs system.

### Purchasing
- **PurchaseOrder** / **PurchaseOrderLine**
- **GoodsReceipt (GRN)** / line
- **PurchaseInvoice** / **PurchaseInvoiceLine** (with tax, discount, landed cost allocation)
- **PurchaseReturn** / line
- **SupplierPayment** / **PaymentAllocation** (links payment to invoices)

### Sales
- **Quotation** / line
- **SalesInvoice** / **SalesInvoiceLine** (item, unit, qty, rate, discount, tax)
- **DeliveryChallan** / line
- **SalesReturn** / line
- **CustomerReceipt** / **ReceiptAllocation**

### Production / fabrication
- **BillOfMaterials (BOM)** / **BomComponent** — finished item → raw components + labor.
- **ProductionOrder** / line — consumes raw stock, produces finished stock, computes cost.
- **JobWorkOrder** — customer‑supplied material service jobs.

### Finance / accounting
- **CashBankTransaction** — every money in/out (links to receipts, payments, expenses).
- **Expense** — category, amount, paid‑from account, attachment, recurring flag.
- **Cheque** — received/issued, due date, status.
- **LedgerEntry** — party (customer/supplier) running balance entries.
- *(Phase 3+)* **Account / JournalEntry / JournalLine** for light double‑entry.

### Platform
- **AuditLog** — entity, action, user, timestamp, before/after.
- **Attachment** — file metadata linked to any document.
- **NumberSeries** — document numbering config.
- **Notification** — reminders/queue for WhatsApp/SMS/email.
- **Setting** — key/value app settings.

---

## Key relationships (text ER)

```
Company 1───* Godown
Company 1───* User *───* Role *───* Permission

Category 1───* Item 1───* ItemUnit *───1 Unit
Item 1───* StockItem *───1 Godown
Item 1───* StockMovement   (every movement references Item, Godown, qty, cost, source doc)

Supplier 1───* PurchaseInvoice 1───* PurchaseInvoiceLine *───1 Item
Supplier 1───* SupplierPayment 1───* PaymentAllocation *───1 PurchaseInvoice

Customer 1───* SalesInvoice 1───* SalesInvoiceLine *───1 Item
Customer 1───* CustomerReceipt 1───* ReceiptAllocation *───1 SalesInvoice

Item 1───1 BillOfMaterials 1───* BomComponent *───1 Item(raw)
ProductionOrder *───1 BillOfMaterials   (consumes raw StockMovements, produces finished StockMovement)

Expense *───1 ExpenseCategory ,  Expense *───1 PaymentAccount
CashBankTransaction *───1 PaymentAccount   (sales receipts, supplier payments, expenses all post here)
```

---

## How profit & loss is computed

- **Revenue** = Σ SalesInvoiceLine (net of returns & discounts).
- **COGS** = Σ cost of items sold, taken from `StockMovement.cost` at time of sale (weighted avg).
- **Gross Profit** = Revenue − COGS.
- **Net Profit** = Gross Profit − Σ Expenses (for the period).
- Because every sale line stores its cost, P&L can be sliced by item, category, customer, or salesman.

> This design means profit is **always reconcilable** to stock and cash, which is the core goal.
