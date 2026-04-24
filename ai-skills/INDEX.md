# JP&Co Marketing AI — Skills Index
**Version:** 1.0 | **Last Updated:** April 2026

---

## 📚 Installed Skills

| Skill File | Status | Purpose | Feeds Into |
|-----------|--------|---------|-----------|
| `AIDA.md` | ✅ Active | WhatsApp copy generation | All campaigns |
| `RFM.md` | ✅ Ready | Customer value segmentation | WINBACK, BIRTHDAY, UPSELL |
| `WINBACK.md` | ✅ Ready | Dormant customer reactivation | AIDA |
| `BIRTHDAY.md` | ✅ Ready | Birthday campaign playbook | AIDA, create_voucher |
| `UPSELL.md` | ✅ Ready | Increase avg order value | AIDA |
| `PRICING.md` | ✅ Ready | Pricing strategy & competitor intel | web_search, scrape_url |
| `CHURN.md` | ✅ Ready | Churn prediction & prevention | WINBACK, AIDA |

---

## 🔗 Skill Dependency Map

```
RFM
 ├── → WINBACK → AIDA → WhatsApp Message
 ├── → BIRTHDAY → create_voucher → AIDA → WhatsApp Message
 ├── → UPSELL → AIDA → WhatsApp Message
 └── → CHURN → WINBACK → AIDA → WhatsApp Message

PRICING
 └── → web_search + scrape_url → Admin Report

AIDA (used by ALL skills for final copy generation)
```

---

## ⚡ Quick Campaign Triggers

| Admin says... | AI runs... |
|--------------|-----------|
| "谁快要流失了？" | CHURN audit |
| "帮我做生日营销" | BIRTHDAY radar + voucher batch |
| "沉睡客户名单" | RFM → WINBACK tier classification |
| "怎么提高客单价？" | UPSELL analysis |
| "我们的价格贵不贵？" | PRICING competitor check |
| "发一批营销消息" | RFM → segment → AIDA → batch copy |

---

## 📏 Global Rules (apply to ALL skills)
1. Always use **real data** — no fabrication
2. Always use **RM** for currency
3. Always **present to admin** before sending any message
4. Always **log** to send_history after sending
5. Always **save key outcomes** to ai_memories
6. Message frequency cap: **max 2 messages per customer per week**
7. Respect **opted_out** flag — never contact these customers
8. Shop rest day: check `shop_settings` before scheduling sends
