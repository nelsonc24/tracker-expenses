# Australian Tax Return Preparation Feature

## Overview

The Tax Return feature helps you prepare for your ATO lodgement each financial year by tracking:

- **Work-related deductions** — tag any transaction as tax-deductible and assign an ATO category
- **Work from home hours** — daily log using the ATO fixed rate method (70¢/hr)
- **Super contributions** — projection vs the concessional cap with a warning if exceeded
- **Estimated tax saving** — based on ATO FY 2025-26 brackets (Stage 3 cuts), LITO, and Medicare levy
- **CSV export** — one-click download for your tax agent or myTax

---

## Navigation

`Sidebar → Tax Return`  (`/tax`)

---

## How It Works

### 1. Tag Transactions as Deductible

From the **Transactions** page, open the `⋯` menu on any transaction and select **Tag as Tax Deductible**. The transaction is immediately saved as deductible with a default ATO category of *Other Work Expenses*.

You can then go to the **Tax Return** page and change the ATO category per transaction using the inline dropdown.

To remove a tag, either use **Remove Tax Tag** from the transactions menu, or click the `✕` button next to the transaction in the deductions table.

**ATO categories available:**

| Value | Label |
|---|---|
| `work_from_home` | Work from Home |
| `vehicle_travel` | Vehicle & Travel |
| `tools_equipment` | Tools & Equipment |
| `phone_internet` | Phone & Internet |
| `self_education` | Self-Education |
| `clothing_uniform` | Clothing & Uniform |
| `professional_fees` | Professional Fees & Memberships |
| `other_work` | Other Work Expenses |
| `investment` | Investment Expenses |

---

### 2. Log Work from Home Hours

Click **+ Log WFH Day** on the WFH Tracker card. Enter:

- **Date** — must be within FY 2025-26 (1 Jul 2025 – 30 Jun 2026). Logging the same date again overwrites that day's entry.
- **Hours** — in 0.5-hr increments (min 0.5, max 24)
- **Notes** (optional) — e.g. "Project meeting from home"

The deduction is calculated automatically: `hours × $0.70`.

> **ATO rule:** The fixed rate method is $0.70 per hour for all running expenses (electricity, internet, phone etc.) while working from home. You do not need to separately claim those costs. You still need to keep a record of hours worked — this log acts as that record.

---

### 3. Enter Your Salary & Super Details

Click **Settings** (top-right of the Tax Return page) and fill in:

| Field | Description |
|---|---|
| Annual Gross Salary | Your pre-tax salary before any salary sacrifice |
| Employer Super Rate | Your employer's SG rate — FY 2025-26 default is 11.5% |
| Salary Sacrifice (FY total) | Total additional super via salary sacrifice for the year |
| Personal (Deductible) Contributions | After-tax contributions you intend to claim a deduction for |
| Private Health Insurance | Tick if you hold hospital cover (affects Medicare Levy Surcharge exposure) |

Settings are saved per financial year and used for all calculations on the page.

---

### 4. Reading the Summary Cards

| Card | What it shows |
|---|---|
| **Work Deductions** | Total AUD amount of tagged transactions, grouped by ATO category |
| **WFH Deduction** | Total hours logged × $0.70/hr |
| **Super Used** | Total concessional contributions vs the $30,000 FY 2025-26 cap |
| **Est. Tax Saving** | Estimated refund/reduction from all deductions at your marginal rate |

The super card turns **red** if your total concessional contributions exceed the $30,000 cap — excess contributions are taxed at your marginal rate by the ATO.

---

### 5. Export to CSV

Click **Export CSV**. The file `tax-return-fy2025-26.csv` contains three sections:

1. **Work-Related Deductions** — all tagged transactions with date, description, merchant, amount, ATO category
2. **Work from Home Log** — each logged day with hours, per-day deduction (hrs × $0.70), and notes
3. **Super Contributions Summary** — employer SG, salary sacrifice, personal contributions, total vs cap

Use this file when:
- Completing your return in **myTax** (pre-fill verification)
- Handing to a **registered tax agent**
- Keeping as a **record for 5 years** (ATO record-keeping requirement)

---

## Tax Calculations

All estimates use ATO FY 2025-26 rates:

### Income Tax Brackets (Stage 3)

| Taxable Income | Rate |
|---|---|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 16% |
| $45,001 – $135,000 | 30% |
| $135,001 – $190,000 | 37% |
| $190,001+ | 45% |

Plus **2% Medicare Levy** (applies above ~$26,000).

**Low Income Tax Offset (LITO)** reduces tax by up to $700 for incomes below $37,500, tapering to zero at $66,667.

### How the Estimated Saving is Computed

```
taxable_income = annual_salary - salary_sacrifice - personal_super_contributions
tax_before     = income_tax(taxable_income) + medicare_levy(taxable_income)

total_deductions = work_deductions + wfh_deduction
reduced_income   = taxable_income - total_deductions
tax_after        = income_tax(reduced_income) + medicare_levy(reduced_income)

estimated_saving = tax_before - tax_after
```

### Concessional Super Cap

```
total_concessional = employer_SG + salary_sacrifice + personal_deductible_contributions
cap                = $30,000 (FY 2025-26)
cap_remaining      = max(0, cap - total_concessional)
```

---

## Database Schema

### `transactions` table (extended)

| Column | Type | Default | Description |
|---|---|---|---|
| `tax_deductible` | boolean | `false` | Whether this transaction is a work deduction |
| `tax_category` | text | `null` | ATO category string (see list above) |

### `wfh_logs` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | text | Clerk user ID |
| `log_date` | text | ISO date `YYYY-MM-DD` |
| `hours` | numeric(5,2) | Hours worked from home |
| `notes` | text | Optional notes |
| Unique constraint on `(user_id, log_date)` | | One entry per user per day |

### `tax_settings` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | text | Clerk user ID |
| `financial_year` | text | e.g. `2025-26` |
| `annual_salary` | numeric(15,2) | Gross salary |
| `employer_super_rate` | numeric(5,2) | e.g. `11.5` |
| `salary_sacrifice_amount` | numeric(15,2) | FY total salary sacrifice |
| `personal_super_contributions` | numeric(15,2) | Personal deductible contributions |
| `has_private_health_insurance` | boolean | Private hospital cover flag |
| Unique constraint on `(user_id, financial_year)` | | One settings row per user per FY |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/tax/summary` | Aggregated summary (deductions, WFH, super, tax estimate) |
| `GET` | `/api/tax/settings` | Fetch tax settings for current FY |
| `PUT` | `/api/tax/settings` | Upsert tax settings |
| `GET` | `/api/tax/wfh-logs` | List all WFH log entries for current FY |
| `POST` | `/api/tax/wfh-logs` | Add or update a WFH log entry (upsert by date) |
| `DELETE` | `/api/tax/wfh-logs/[id]` | Delete a WFH log entry |
| `GET` | `/api/tax/export` | Download CSV file |

---

## Disclaimer

Estimates are based on standard ATO 2025-26 brackets and offsets (LITO, Medicare levy). They **do not** account for:

- HELP/HECS debt repayments
- SAPTO (seniors offset)
- Medicare Levy Surcharge (MLS)
- Spouse or dependent offsets
- Capital gains or investment income
- State taxes or levies

Always verify figures with a **registered tax agent** or via **myTax** before lodging. Keep records for **5 years** after lodgement as required by the ATO.
