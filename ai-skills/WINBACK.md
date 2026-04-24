---
skill: WINBACK
category: marketing-framework
priority: 9
triggers:
  - winback
  - win back
  - dormant
  - reactivate
  - haven't come
  - not coming back
  - 召回
  - 沉睡
  - 好久不见
  - long time no see
  - lost customer
  - re-engage
---

# SKILL: WINBACK — Dormant Customer Reactivation
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN / MY

---

## 🎯 Purpose
Re-engage customers who have stopped visiting. Use tiered escalation — gentle nudge first, stronger offer if no response. Never beg or spam.

---

## 🔍 Who Qualifies for Winback?

| Tier | Days Dormant | RFM Score | Strategy |
|------|-------------|-----------|----------|
| **Tier 1 — Slipping** | 30–44 days | R2, F3+ | Soft check-in, no voucher needed |
| **Tier 2 — Dormant** | 45–89 days | R2, F2-3 | Small voucher (RM3–5 off) |
| **Tier 3 — Lost Risk** | 90–179 days | R1, F2+ | Strong offer (RM8–10 off or free item) |
| **Tier 4 — Gone** | 180+ days | R1, F1 | Last attempt + sunset (remove from active list) |

---

## 📐 Winback Escalation Script

### Tier 1 — Soft Nudge (no voucher)
```
[Name]，最近怎么样？☕
距离上次在 [Shop] 见到你已经有一段时间了。
你最爱的 [favorite_item] 还是老样子，随时欢迎回来！
— [Shop Name]
```

### Tier 2 — Gentle Incentive
```
[Name]，我们想你了 🌟
上次你来喝了 [item]，还记得那个味道吗？
这次带了个小礼物：[voucher_code] (满 RM[X] 减 RM[Y])
有效期到 [date]，期待再见！
— [Shop Name]
```

### Tier 3 — Strong Offer
```
嗨 [Name]！
好久不见，我们真的很想你回来 🙏
专门为你准备了一份大礼：[voucher_description]
这是我们诚心的邀请，[date] 前有效。
[Shop Name] 全体等你回家 ☕
```

### Tier 4 — Last Chance
```
[Name]，这可能是我们最后一次打扰你了。
如果你愿意，这里有份特别礼物：[voucher]
不回也没关系，祝你一切都好 🤍
— [Shop Name]
```

---

## 🔧 AI Execution Steps

1. **Query** all customers with `last_visit` > 30 days ago
2. **Classify** into Tier 1–4 using table above
3. **Check** if customer has been messaged in last 14 days (avoid double-send)
4. **Select script** based on tier
5. **Fill variables** using get_customer_details
6. **Create voucher** if Tier 2–4 (call create_voucher tool)
7. **Generate personalized AIDA copy** for each customer
8. **Present to admin** for approval before sending
9. **Log** to send_history after sending

---

## ⚙️ Voucher Recommendation by Tier

| Tier | Voucher Type | Value | Min Spend |
|------|------------|-------|-----------|
| 2 | Discount | RM3–5 off | RM15 |
| 3 | Discount or Free Item | RM8–10 off | RM20 |
| 4 | Maximum offer | RM12–15 off or free drink | RM25 |

---

## 🚫 Rules
- Never send Tier 3/4 to a customer who visited in last 30 days
- Never send more than 1 winback message per 14 days
- Tier 4 customers — send once, then mark as `sunset` in memory
- Always save winback result to `ai_memories` ("Last winback attempt: [date], result: [responded/no response]")
