---
skill: BIRTHDAY
category: marketing-framework
priority: 9
triggers:
  - birthday
  - 生日
  - bday
  - celebration
  - birthday month
  - birthday voucher
  - birthday gift
  - hari jadi
---

# SKILL: BIRTHDAY — Birthday Marketing Playbook
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN / MY

---

## 🎯 Purpose
Deliver perfectly timed, genuinely warm birthday messages with exclusive vouchers that make customers feel remembered — not marketed to.

---

## 📅 Timing Strategy

| When to Send | Message Type | Voucher |
|-------------|-------------|---------|
| **7 days before** birthday | Teaser / anticipation | None |
| **On birthday** (morning, 9–10am) | Main birthday message | Exclusive voucher |
| **3 days after** (if not redeemed) | Gentle reminder | Same voucher |
| **Voucher expiry day** | Last chance (optional) | Extend if VIP |

---

## 🔍 Birthday Radar — AI Query

```sql
-- Run daily at 8:00am KL time
SELECT customer_id, name, birthday, last_visit, total_spent, favorite_item
FROM profiles
WHERE 
  DAY(birthday) = DAY(NOW() + INTERVAL 7 DAY)
  AND MONTH(birthday) = MONTH(NOW() + INTERVAL 7 DAY)
  -- Also catch today's birthdays
  OR (DAY(birthday) = DAY(NOW()) AND MONTH(birthday) = MONTH(NOW()))
```

---

## 🎂 Message Scripts

### 7-Day Teaser
```
[Name]，你的特别日子快到了 🎉
[Shop Name] 正在为你准备一份惊喜...
敬请期待，生日快乐提前说！🎂
```

### Birthday Day — Regular Customer
```
生日快乐，[Name]！🎂✨
今天是你的特别日子，[Shop Name] 为你准备了专属礼物：
[voucher_description]
[date] 前随时可用，期待在店里为你庆生！
— [Shop Name] 全体 🥳
```

### Birthday Day — VIP Customer
```
[Name]，生日快乐！🎂
你是我们最重要的顾客之一，今天这份礼物是真心的：
[voucher_description]
随时来，我们帮你好好庆祝 🥂
带上家人朋友一起来吧！
— [Shop Name] 全体敬上 💛
```

### Birthday Day — Dormant Customer (special case)
```
[Name]，生日快乐！🎂
虽然好久没见，但我们记得你 💛
今天为你准备了一份特别礼物，希望能在你的生日见到你：
[voucher_description]，有效至 [date]
— [Shop Name]
```

### 3-Day Reminder
```
[Name]，你的生日礼物还在等你 🎁
[voucher_description] 将于 [date] 到期。
随时来兑换，我们在 ☕
```

---

## 🎁 Voucher Settings by Segment

| Segment | Voucher Type | Value | Valid Period |
|---------|------------|-------|-------------|
| New / Regular | Fixed discount | RM5 off | 30 days from birthday |
| VIP (≥RM500) | Free item or RM10 off | RM10 or free drink | 30 days |
| Champion (≥RM1000) | Premium offer | RM15 off or free upgrade | 45 days |
| Dormant (birthday revival) | Winback + birthday combo | RM8 off | 30 days |

---

## 🔧 AI Execution Steps

1. **Run birthday radar** — query customers with birthday in next 7 days + today
2. **Check** if birthday message already sent this year (check ai_memories)
3. **Classify** customer segment using RFM skill
4. **Select** voucher type based on segment
5. **Call create_voucher** tool to generate real voucher
6. **Generate message** using script above + AIDA skill
7. **Present batch to admin** for 1-click approval
8. **Log** to send_history + save to ai_memories: "Birthday message sent [year]"

---

## ⚙️ Rules
- Send birthday message max **once per year** per customer
- Morning send only — 9:00–10:30am KL time
- Never mention age unless customer has shared it
- If birthday falls on shop's rest day — send anyway, note in message "come anytime this week"
- VIP birthday = priority — generate message first in batch
