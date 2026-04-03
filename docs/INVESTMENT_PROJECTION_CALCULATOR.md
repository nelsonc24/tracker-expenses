# Investment Projection Calculator — Complete Guide

## Overview

The Investment Projection Calculator helps you model long-term investment growth with multiple scenarios (best case, worst case, realistic). It accounts for inflation, taxes, and increasing contributions — all visualized with interactive charts.

**Key feature:** Save scenarios to compare different investment strategies side-by-side.

---

## Core Terms & Concepts

### Input Parameters

#### **Initial Lump Sum**
The starting amount you invest on day one. This money begins compounding immediately.

**Example:** You have $10,000 saved → this is your lump sum.

#### **Monthly Contribution**
Recurring amount you invest every month, automatically added to your portfolio.

**Example:** $500/month for 20 years = $120,000 in total contributions (plus returns).

#### **Annual Return Rate (%)**
Expected yearly percentage gain on your investment. Different asset types have different historical averages.

**Common ranges:**
- **Stocks:** 10% p.a. (volatile, highest growth)
- **ETF:** 8% p.a. (diversified, moderate volatility)
- **Bonds:** 4% p.a. (stable, predictable)
- **Savings Account:** 3% p.a. (no risk, minimal growth)
- **Crypto:** 15% p.a. (highly volatile, speculative)

*Note: These are preset averages. Actual returns vary yearly.*

#### **Time Horizon (Years)**
How long you'll invest before accessing the money (e.g., retirement age, house down-payment target).

**Example:** 20 years = monthly growth projections from year 1 to year 20.

#### **Inflation Rate (%)**
How fast purchasing power erodes. Reserve currency typically inflates 2–3% annually.

**What it means:** $100 today → ~$61 buying power in 30 years at 2.5% inflation.

*Default: 2.5%* (Australia's typical RBA target).

#### **Contribution Growth (% p.a.)**
Annual percentage increase in your monthly contribution (e.g., salary raise, cost-of-living adjustment).

**Example:**
- Year 1: $500/month
- Year 2: $515/month (+3% growth)
- Year 3: $531/month (+3% growth)

*Default: 0%* (static contributions).

#### **Capital Gains Tax (%)**
Tax rate applied to investment gains when you sell. Applies to profit only, not your principal.

**Example:**
- Initial + contributions: $100,000
- Final value: $150,000
- Gains: $50,000
- Tax (20%): $10,000
- After-tax value: $140,000

*Default: 0%* (no tax, or assume tax-advantaged account like superannuation).

---

## Output: Charts & Metrics

### **1. Portfolio Growth Chart**

**Four lines** showing value over time:

#### Base (Nominal) — Primary Blue Line
Your projected portfolio value using the return rate you entered. **No inflation adjustment.**

#### Bull Scenario (+4%) — Green Dashed
Optimistic case: return rate + 4%. Shows upside potential if markets perform better.

#### Bear Scenario (−4%) — Red Dashed
Conservative case: return rate − 4%. Shows downside risk if returns underperform.

#### Inflation-Adjusted (Real) — Purple Dashed
Your portfolio's **actual purchasing power** after inflation. Usually curves flatten compared to nominal because inflation erodes gains.

**Why compare?** Helps you decide: "Will my investment beat inflation and my time horizon?"

---

### **2. Invested vs Returns Chart**

**Stacked bar chart** showing composition of your portfolio:

- **Bottom (Blue):** Total amount you personally invested (lump sum + all contributions)
- **Top (Green):** Investment returns (profit)

**Why matters?** Visualizes your profit vs. principal. As years pass, the green section grows — that's compounding at work.

**Example Year 20:**
- Invested: $150,000
- Returns: +$350,000
- Total: $500,000 (70% is profit!)

---

### **3. Year-by-Year Breakdown Table**

| Year | Total Invested | Nominal Value | Real Value | Returns | Return % |
|------|---|---|---|---|---|
| 1 | $6k | $6.36k | $6.20k | +$360 | +6.0% |
| ... | ... | ... | ... | ... | ... |
| 20 | $136k | $318k | $202k | +$182k | +134% |

**Key columns:**

- **Total Invested:** Cumulative principal (lump sum + all contributions)
- **Nominal Value:** Portfolio worth *without* inflation adjustment
- **Real Value:** Portfolio worth in *today's dollars* (inflation-adjusted)
- **Returns:** Profit = Nominal − Total Invested
- **Return %:** Percentage gain on your investment

---

### **4. Milestones**

**Two types of milestones** show when you'll reach key targets:

#### Multiplier Milestones
- **2× your money:** When portfolio doubles
- **5× your money:** When portfolio grows 5x
- **10× your money:** When portfolio grows 10x

*Useful for* understanding how long it takes for compounding to kick in.

#### Dollar Milestones
- **$100k, $250k, $500k, $1M**

*Useful for* goal-based planning (e.g., "when will I have $500k for a house deposit?")

**Each milestone shows the **year reached** or "Not reached" if outside your time horizon.**

---

### **Summary Stat Cards**

#### Final Value (Nominal)
Your portfolio's raw dollar amount at the end. Headline number everyone sees first.

#### Total Returns
Profit = Final Value − Total Invested. Shows absolute gain.

#### Real Value (After Inflation)
Final Value adjusted for purchasing power. More realistic than nominal.

#### After Tax
Final Value after capital gains tax. Your actual take-home after tax.

---

## How the Calculator Works (Math)

### Monthly Compounding

The calculator compounds **monthly**, not annually, for accuracy:

```
monthly_rate = annual_return_rate / 12
balance = initial_lump_sum

For each month:
    balance = balance × (1 + monthly_rate) + monthly_contribution
```

### Annual Progression

**Contribution Growth:** Each year, monthly contributions increase by the contribution growth rate.

```
Year 1 monthly contribution = $500
Year 2 monthly contribution = $500 × (1 + 0.03) = $515
Year 3 monthly contribution = $515 × (1 + 0.03) = $530.45
```

### Real Value (Inflation-Adjusted)

```
real_value = nominal_value / (1 + inflation_rate)^years
```

### Tax Calculation

```
gains = final_value - total_invested
after_tax_gains = gains × (1 - tax_rate)
after_tax_value = total_invested + after_tax_gains
```

---

## Scenarios Explained

### Why 3 Scenarios? (Base, Bear, Bull)

**Real markets don't deliver the same return every year.** They fluctuate. The calculator shows:

- **Base:** Your expected average (e.g., 8% ETF return)
- **Bull:** If returns beat expectations by 4% → 12% p.a.
- **Bear:** If returns fall short by 4% → 4% p.a.

**Over 20 years**, these 4% swings compound to massive differences. A $100k investment could be:
- **Bear:** ~$220k
- **Base:** ~$467k
- **Bull:** ~$960k

**This helps you:** Understand the *range* of outcomes, not just an optimistic single number.

---

## Common Use Cases

### Use Case 1: "When Can I Retire?"

**Scenario:** 
- Monthly contribution: $1,500
- Time horizon: 30 years
- Target: $1 million

**Steps:**
1. Set Initial Lump Sum = 0
2. Set Monthly Contribution = $1,500
3. Set Annual Return = 8% (ETF)
4. Set Time Horizon = 30 years
5. Check milestones → find when you hit $1M

**Result:** Year 18 (reach $1M before year 30) ✓ Go retire!

---

### Use Case 2: "How Much Should I Invest Monthly?"

**Scenario:**
- Lump sum: $50,000
- Time horizon: 10 years
- Target final value: $150,000

**Steps:**
1. Set Initial Lump Sum = $50,000
2. Adjust Monthly Contribution until final value ~$150k
3. (Trial: $800/month → $161k ✓)

**Result:** Save $800/month to reach your goal.

---

### Use Case 3: "Impact of Inflation on My Savings"

**Scenario A:** Compare real value vs nominal for same investment.

**Scenario B:** Run twice—one with 2.5% inflation, one with 4% inflation.

**Result:** See how much faster your purchasing power erodes with higher inflation. Plan accordingly.

---

### Use Case 4: "Stocks vs Bonds"

**Scenario:**
- Save the form as "Stocks Portfolio" (return 10%, years 25)
- Save again as "Bond Portfolio" (return 4%, years 25)

**Compare:**
- Stocks final: ~$1.2M
- Bonds final: ~$480k

**Decision:** Worth the extra volatility (bull/bear swings) for that ~$720k upside?

---

## Investment Type Presets

The calculator includes shortcuts for common investment types:

| Type | Default Return | Risk Level | Best For |
|------|---|---|---|
| **Stocks** | 10% p.a. | High | Long-term growth (20+ years) |
| **ETF** | 8% p.a. | Medium | Balanced growth + diversification |
| **Bonds** | 4% p.a. | Low | Income + stability |
| **Savings** | 3% p.a. | None | Emergency fund, short-term |
| **Crypto** | 15% p.a. | Very High | Speculative, high risk |
| **Custom** | 7% p.a. | ? | Your own return estimate |

**When you select a type, the Annual Return Rate auto-fills.** You can override it.

---

## Saving & Loading Scenarios

### Why Save?

Compare multiple investment plans side-by-side without re-entering numbers.

### Save a Scenario

1. Enter your inputs (lump sum, return rate, etc.)
2. Click **"Save Scenario"**
3. Name it (e.g., "Retirement at 60" or "House Down-Payment")
4. Click Save

### Load a Scenario

In the **"Saved Scenarios"** collapsible panel at the bottom:

1. Find your scenario
2. Click **"Load"** → form repopulates
3. Adjust if needed, or view the projection
4. Click **"Delete"** to remove

---

## Tips & Best Practices

### ✓ Do

- **Use realistic return rates:** Historical averages ≠ guaranteed. Adjust for risk tolerance.
- **Update inflation assumption:** Check current central bank targets (RBA, Fed, etc.).
- **Account for taxes:** Set Capital Gains Tax if investing in taxable account.
- **Increase contributions:** Add cost-of-living adjustment (2–3%) to account for salary growth.
- **Save multiple scenarios:** Compare conservative, moderate, aggressive strategies.

### ✗ Don't

- **Assume bull returns forever:** Markets cycle. Bear scenarios happen.
- **Ignore inflation:** Real purchasing power is what matters.
- **Set unrealistic return rates:** 50% stocks? Unlikely without extreme risk.
- **Forget fees:** If your ETF charges 0.5% annually, adjust return down by that amount.

---

## FAQ

### Q: Why does Real Value go down over time if I'm earning 8%?

**A:** Your 8% nominal returns may be outpaced by inflation if inflation > 0%. E.g., 8% return − 3% inflation = ~5% real growth.

### Q: What if returns go negative one year?

**A:** The calculator averages to your annual rate. Real markets are lumpy. For stressed scenarios, load the **Bear** scenario (−4% offset).

### Q: Can I use this for multiple investment accounts?

**A:** Yes! Save separate scenarios:
- "Superannuation" (no tax)
- "Bank Savings" (low return)
- "Shares Account" (high return, taxed)

### Q: Why isn't $500/month + 8% return = my exact final value?

**A:** Built-in compounding. Monthly contributions invest mid-month and earn returns for the remainder of the year. The calculator is accurate; simplified math often isn't.

### Q: Should I use nominal or real value for planning?

**A:** **Real value** is more honest. It shows what you can actually buy. Use it to validate if your end goal is realistic in today's dollars.

---

## Example Walkthrough

**Goal:** Save for a $500k house down payment in 10 years.

### Step 1: Initial Setup
- Lump Sum: $50,000 (savings)
- Monthly Contribution: $2,000 (aggressive saving)
- Type: ETF (8% p.a.)
- Years: 10
- Inflation: 2.5%
- Contribution Growth: 2% (salary raise)
- Tax: 0% (assume tax-free account)

### Step 2: Review Results
- **Final Value (Nominal):** $406k ❌ (short of $500k goal)
- **Real Value:** $318k ❌ (even worse in today's dollars)

### Step 3: Adjust
Option A: Increase monthly contribution to $2,800 → Final: ~$520k ✓

Option B: Increase lump sum to $150k → Final: ~$520k ✓

Option C: Take on more risk (Stocks, 10%) → Final: ~$450k (still short)

### Step 4: Decision
- **Choose Option B:** Sell extra assets or get a loan now for $100k → reach $500k goal
- **Save as "House Fund Plan"** for reference

---

## Glossary

| Term | Definition |
|------|---|
| **Compound Interest** | Earning returns on your returns; "snowball effect" |
| **Nominal** | Raw dollar amount; doesn't account for inflation |
| **Real** | Inflation-adjusted; what money can actually buy |
| **Annual Return Rate** | Percentage gain per year (8% = portfolio grows by 8%) |
| **Principal** | Your own money invested (lump sum + contributions) |
| **Gains** | Profit = Final Value − Principal |
| **Bear Market** | Prices fall; negative/low returns |
| **Bull Market** | Prices rise; strong positive returns |
| **Capital Gains Tax** | Tax on profit when you sell (not on principal) |
| **Volatility** | How much returns swing year-to-year |
| **Diversification** | Spreading money across multiple asset types (reduce risk) |

---

## Need Help?

- **Chart not clear?** Hover over lines to see exact values in the tooltip.
- **Lost your scenario?** Check "Saved Scenarios" panel at the bottom.
- **Want to compare?** Save as "Strategy A" and "Strategy B", then load each to compare.
- **Numbers seem off?** Check inflation rate and tax settings—they compound significantly.

---

**Last Updated:** April 3, 2026  
**Calculator Version:** 1.0
