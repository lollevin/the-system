---
skill: RFM
category: analytics-framework
priority: 8
triggers:
  - rfm
  - segment
  - customer value
  - 分群
  - 顾客分类
  - classify customer
  - top customer
  - champion
  - loyal
  - who are my best
  - customer tier
---

# SKILL: RFM — Customer Value Segmentation
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN

---

## 🎯 Purpose
Score every customer across 3 dimensions and assign them to an actionable segment. Drive the right campaign to the right person at the right time.

---

## 📐 Framework: RFM

| Dimension | Definition | Data Source |
|-----------|-----------|-------------|
| **R**ecency | Days since last visit | `last_visit` field |
| **F**requency | Total number of visits | COUNT of transactions |
| **M**onetary | Total lifetime spend | SUM of `earn` transactions |

---

## 🔢 Scoring Table (1–5 scale)

### Recency Score
| Days Since Last Visit | Score |
|----------------------|-------|
| 0–7 days | 5 |
| 8–14 days | 4 |
| 15–30 days | 3 |
| 31–60 days | 2 |
| 60+ days | 1 |

### Frequency Score
| Total Visits | Score |
|-------------|-------|
| 20+ visits | 5 |
| 10–19 visits | 4 |
| 5–9 visits | 3 |
| 2–4 visits | 2 |
| 1 visit | 1 |

### Monetary Score
| Lifetime Spend (RM) | Score |
|--------------------|-------|
| RM 1000+ | 5 |
| RM 500–999 | 4 |
| RM 200–499 | 3 |
| RM 50–199 | 2 |
| < RM 50 | 1 |

---

## 🏷️ Segment Definitions

| Segment | RFM Pattern | Description | Priority |
|---------|------------|-------------|----------|
| 🏆 **Champions** | R5, F5, M4-5 | Best customers, visit often, spend big | LOW (retain) |
| 💎 **VIP Loyalists** | R4-5, F3-5, M3-5 | Regular high spenders | LOW (reward) |
| 🌱 **Promising** | R3-4, F1-2, M1-2 | New but showing interest | MEDIUM (nurture) |
| ⚠️ **At Risk** | R2-3, F3-5, M3-5 | Used to be good, slipping | HIGH (winback) |
| 😴 **Dormant** | R1-2, F1-3, M1-3 | Haven't come back | HIGH (reactivate) |
| 👋 **New Customers** | R4-5, F1, M1-2 | Just joined | MEDIUM (welcome) |
| 💤 **Lost** | R1, F1-2, M1-2 | Gone, low value | LOW (ignore or cheap nudge) |

---

## 🔧 AI Calculation Steps

1. **Pull data** from transactions table for each customer
2. **Calculate R, F, M raw values**
3. **Map to 1–5 scores** using tables above
4. **Compute RFM string** e.g. "5-4-3"
5. **Match to segment** using pattern table
6. **Output** customer list with segment labels

---

## 📊 Output Format
```
Customer: [Name]
RFM Score: R[X] F[X] M[X] → Total: [sum]/15
Segment: [Label]
Recommended Action: [Campaign Type]
Suggested Voucher: [Type + Value]
```

---

## 🔗 Integration
- Feed output into **WINBACK** skill (At Risk / Dormant)
- Feed output into **BIRTHDAY** skill (add birthday layer)
- Feed output into **UPSELL** skill (Champions / VIP)
- Feed output into **AIDA** skill for copy generation
