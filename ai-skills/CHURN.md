---
skill: CHURN
category: analytics-framework
priority: 9
triggers:
  - churn
  - churning
  - losing customer
  - at risk
  - 流失
  - 快要流失
  - risk of leaving
  - stop visiting
  - drop off
  - slipping
  - retention
  - 留住
---

# SKILL: CHURN — Churn Prediction & Prevention
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN / MY

---

## 🎯 Purpose
Identify customers who are likely to stop visiting — **before** they fully churn — and trigger the right intervention at the right moment. Prevention is 5x cheaper than reactivation.

---

## 🔮 Churn Risk Scoring

Run weekly. Score each active customer 1–10.

### Signals & Weights

| Signal | Weight | Churn Indicator |
|--------|--------|-----------------|
| Days since last visit increasing | 30% | Gap > personal average × 1.5 |
| Visit frequency dropping | 25% | This month < last month by 40%+ |
| Avg spend dropping | 20% | Last 3 visits below personal avg |
| No voucher redemption | 10% | Has active voucher, not used |
| Declining item variety | 10% | Ordering fewer item types |
| No response to last message | 5% | Sent message 7+ days ago, no visit |

### Risk Levels

| Score | Risk Level | Action |
|-------|-----------|--------|
| 8–10 | 🔴 Critical | Immediate personal outreach + strong offer |
| 5–7 | 🟡 Medium | Proactive check-in + small incentive |
| 3–4 | 🟢 Low | Monitor + include in next campaign |
| 1–2 | ✅ Healthy | No action needed |

---

## 📐 Churn Prevention Playbook

### 🔴 Critical (Score 8–10)
**Goal:** Stop the bleeding NOW.
```
[Name]，我们注意到你最近来得少了一点 🥺
不知道是不是我们哪里做得不够好？
这里有份诚意礼物：[voucher_description]
如果有任何不满意，告诉我们，我们想改进 💛
— [Shop Name]
```
→ Follow up with phone call if no response in 5 days (flag to admin)

### 🟡 Medium (Score 5–7)
**Goal:** Re-engage before it's too late.
```
嗨 [Name]！☕
最近有点想念你，[favorite_item] 都在问你在哪里 😄
这周来打个卡？带了个小惊喜给你：[voucher]
```

### 🟢 Low (Score 3–4)
**Goal:** Keep warm, no pressure.
→ Include in next regular campaign, no special action needed

---

## 🔧 AI Weekly Churn Audit Steps

1. **Query** all customers with at least 2 past visits (active customers)
2. **Calculate** personal visit gap baseline (avg days between visits)
3. **Compare** current gap vs baseline
4. **Score** each customer using signals + weights above
5. **Bucket** into Critical / Medium / Low
6. **Cross-check** with WINBACK — if already in winback flow, skip
7. **Generate report** for admin:

```
📊 Weekly Churn Alert — [Date]

🔴 Critical Risk (act now): [X] customers
   Top 3: [Name] (Score 9), [Name] (Score 8), [Name] (Score 8)

🟡 Medium Risk (watch closely): [X] customers

💡 Suggested Actions:
1. Send critical risk batch → approve vouchers first
2. Include medium risk in this week's campaign
3. [Name] hasn't responded to 2 messages — recommend phone follow-up
```

8. **Save** churn scores to ai_memories for trend tracking

---

## 📈 Churn Rate Tracking

| Metric | Formula | Target |
|--------|---------|--------|
| Monthly Churn Rate | Lost customers / Start of month customers × 100 | < 5% |
| Winback Success Rate | Reactivated / Contacted × 100 | > 20% |
| Prevention Success Rate | Saved critical / Total critical × 100 | > 40% |

---

## 🚫 Rules
- Never label a customer as "churned" until 180+ days dormant
- Never send churn prevention message to a customer who visited in last 14 days
- Score recalculation: weekly minimum, daily for Critical customers
- If a customer explicitly asks to be removed — respect it, mark as `opted_out` in memory, never contact again
- Churn prevention and winback are different flows — never run both simultaneously for same customer
