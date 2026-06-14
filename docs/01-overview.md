# 01 — Overview

## The business

You run a steel godown that sells steel and construction materials. Some items are bought and
resold as‑is (cement, sand, bricks, bars), and some are **produced** in‑house — steel **rings
(stirrups)** and **pillars** are fabricated from raw steel bars and wire.

Today the typical pain points for this kind of business are:

- Stock is hard to track because steel is sold both **by weight (kg / ton)** and **by piece / bundle**, and rates change frequently.
- A lot of business is on **credit (udhaar)** — it is hard to know who owes money and how much.
- Suppliers are also paid partly now / partly later — payables are hard to track.
- Expenses (rent, labor, fuel, salaries) are paid in cash and rarely recorded.
- At month end, **nobody knows the real profit** because cost of goods sold and expenses aren't tied together.

## Goals of this system

1. **Know stock in real time** — quantity and value, per godown, including weight↔piece handling.
2. **Track every rupee** — sales, purchases, expenses, cash and bank, all in one place.
3. **Control credit** — clear receivables (customers) and payables (suppliers) with ageing and reminders.
4. **Show true profit & loss** — automatically, for any date range, product, or category.
5. **Be fast and simple** — usable by a counter clerk on a normal screen, and by the owner on a phone.

## Who uses it (roles)

| Role | What they do |
|------|--------------|
| **Owner / Admin** | Sees everything, dashboards, P&L, manages users & settings. |
| **Manager** | Approves purchases, sets prices, views reports. |
| **Salesman / Counter** | Creates quotations, invoices, delivery challans, takes payments. |
| **Store keeper** | Records goods received, stock adjustments, deliveries. |
| **Accountant** | Records expenses, payments, reconciles cash & bank, runs reports. |

## Glossary

| Term | Meaning |
|------|---------|
| **Godown** | Warehouse / storage location. |
| **Udhaar / Credit** | Selling now, getting paid later. |
| **GRN** | Goods Received Note — confirms what physically arrived from a supplier. |
| **Delivery Challan** | Document accompanying goods sent to a customer. |
| **Receivable** | Money customers owe us. |
| **Payable** | Money we owe suppliers. |
| **COGS** | Cost of Goods Sold — what the sold items cost us. |
| **Stirrup / Ring** | Bent steel reinforcement loop, produced from steel wire/bar. |

## Assumptions (please confirm)

- Single company, possibly **multiple godowns** in future — design supports it from day one.
- Currency: **PKR** (configurable). Tax: a single configurable **sales tax %** (e.g., Pakistan GST/FBR) — can be turned off per item/invoice.
- Language: **English** UI first; Urdu labels can be added later.
- Steel is tracked by **both weight and pieces** with a per‑item conversion (e.g., 1 piece of 12mm × 40ft ≈ X kg).
