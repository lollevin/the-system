---
skill: AIDA
category: marketing-framework
priority: 10
triggers:
  - write message
  - write a message
  - campaign
  - marketing message
  - whatsapp message
  - send message
  - voucher
  - promotion
  - copywriting
  - draft
  - 营销
  - 文案
  - 消息
  - 优惠
---

# SKILL: AIDA — Marketing Copywriting Framework
**Version:** 1.1 | **Status:** ✅ Active | **Language:** ZH / EN / MY / TH

---

## 🎯 Purpose
Generate persuasive WhatsApp / push notification marketing messages for F&B customers using the AIDA framework. All copy must feel personal, human, and brand-safe.

---

## 📐 Framework: AIDA

| Stage | Goal | Word Budget | Trigger Words (avoid spam) |
|-------|------|-------------|---------------------------|
| **A**ttention | Stop the scroll | 10–20 words | Curiosity, surprise, name |
| **I**nterest | Build relevance | 15–25 words | Benefit, context, timing |
| **D**esire | Create want | 15–25 words | Emotion, social proof, value |
| **A**ction | One clear CTA | 10–15 words | Soft urgency, easy next step |

**Total target: 60–120 words per message.**

---

## 🔧 Input Variables Required
Before generating, AI must have:
- `customer_name` — first name only
- `segment` — VIP / dormant / birthday / new / regular
- `last_item` or `favorite_item` — from get_customer_details
- `voucher_code` (if applicable) — from create_voucher
- `shop_name` — from shop_settings
- `campaign_type` — winback / birthday / upsell / promo / welcome

---

## ✍️ Generation Rules

### ✅ MUST DO
- Use customer's **first name** in opening line
- Reference **real data** (last visit, favorite item, points balance)
- Include **one soft CTA** — never two
- End with shop name or warm sign-off
- Use RM for all prices
- Match language to customer preference (default: 简中)

### ❌ NEVER DO
- No "限时抢购！！！" or ALL CAPS spam
- No fake scarcity ("Only 3 left!")
- No fabricated urgency ("Expires in 1 hour!" unless real)
- No generic openers ("Dear valued customer")
- No more than 1 emoji per line

---

## 📝 Templates by Segment

### 🔁 Winback (Dormant >30 days)
```
[Name]，好久不见！☕
距离你上次来 [shop] 已经 [X] 天了。
上次你最爱的 [item]，我们还在等你回来。
这次带了个小礼物给你：[voucher] 🎁
随时来，我们在。
— [Shop Name]
```

### 🎂 Birthday
```
[Name]，生日快乐！🎂
特别为你准备了一份专属惊喜：
[voucher_description]，本月内随时可用。
期待在你的特别日子见到你！
— [Shop Name] 全体
```

### 👑 VIP Appreciation
```
[Name]，谢谢你一直以来的支持 🙏
你已经是我们最重要的顾客之一。
作为感谢，这是你的专属优惠：[voucher]
下次来，记得告诉我们你想要什么 😊
— [Shop Name]
```

### 🆕 New Customer Welcome
```
嗨 [Name]！欢迎加入 [Shop Name] 大家庭 🌟
很高兴第一次见到你！
这是给新朋友的小礼物：[voucher]
期待再次见到你 ☕
```

---

## 🚫 Brand Safety Checklist
Before sending, verify:
- [ ] No fabricated data used
- [ ] Voucher code is real (from DB)
- [ ] Customer name matches record
- [ ] Language matches preference
- [ ] Message is 60–120 words
- [ ] CTA is clear and singular
