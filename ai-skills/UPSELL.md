---
skill: UPSELL
category: marketing-framework
priority: 8
triggers:
  - upsell
  - cross-sell
  - cross sell
  - add-on
  - bundle
  - upgrade
  - increase average order
  - higher spend
  - 客单价
  - 加购
  - 提高消费
  - 套餐
  - suggest more
---

# SKILL: UPSELL — Smart Upselling & Cross-selling
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN / MY

---

## 🎯 Purpose
Increase average order value and visit frequency by suggesting relevant upgrades, add-ons, and complementary items — based on real customer behavior, never random guessing.

---

## 🧠 Upsell Logic Tree

```
Customer visits / orders
        ↓
Has order history?
   YES → Use favorite_item + avg_spend to suggest upgrade
   NO  → Use popular item from menu + welcome combo
        ↓
Is avg_spend near a round number? (e.g. RM18, RM23)
   YES → Suggest add-on to push to next tier (RM20, RM25)
   NO  → Suggest complementary item
        ↓
Does shop have a combo or bundle?
   YES → Propose bundle as "better value"
   NO  → Suggest pairing (drink + food, main + dessert)
```

---

## 📦 Upsell Types

| Type | Trigger | Example |
|------|---------|---------|
| **Size Upgrade** | Customer orders regular size | "Upgrade to large for just RM2 more?" |
| **Add-on** | Single item order | "Add a [dessert] for RM4 today?" |
| **Bundle** | 2 items close to bundle price | "Our combo saves you RM3!" |
| **Pairing** | Drink only / food only | "This goes great with our [item]" |
| **Points Push** | Customer near points milestone | "You're 15 pts away from a free drink!" |
| **Tier Push** | Customer near next loyalty tier | "RM12 more to reach Silver tier this month!" |

---

## 💬 Message Scripts

### Size Upgrade
```
[Name]，这次要不要升级到大杯？☕
只需多 RM[X]，量多一倍！
```

### Add-on Suggestion
```
[Name]，你的 [item] 搭配我们的 [suggested_item] 超配 😋
今天加 RM[X] 一起带走？
```

### Points Milestone Push
```
嗨 [Name]！
你现在有 [current_points] 积分，再消费 RM[X] 就能兑换 [reward]！
下次来凑个整数吧 🎯
```

### Loyalty Tier Push
```
[Name]，你这个月已经消费 RM[X] 了 🌟
再花 RM[Y] 就能升级到 [next_tier]，享受更多专属优惠！
```

### Bundle Suggestion
```
[Name]，我们的 [bundle_name] 套餐包含 [item1] + [item2]，
原价 RM[X]，套餐价 RM[Y]，省 RM[Z]！
下次来试试？😊
```

---

## 🔧 AI Execution Steps

1. **Get customer data** via get_customer_details
2. **Check** avg_spend, favorite_item, current_points, current_tier
3. **Identify best upsell type** using logic tree above
4. **Check menu** for actual items and prices (from knowledge base)
5. **Calculate** points to next milestone / spend to next tier
6. **Generate message** using script + AIDA skill
7. **Never suggest** an item the customer has never ordered AND is >30% above their avg spend

---

## 📊 Upsell Priority Order
1. Points milestone push (highest conversion — feels like a game)
2. Tier upgrade push (loyalty psychology)
3. Bundle offer (saves money = easy yes)
4. Pairing suggestion (contextual, feels helpful)
5. Size upgrade (lowest friction)

---

## 🚫 Rules
- Never upsell during a winback message — one goal per message
- Never suggest items >RM15 above customer's average order
- If customer's last 3 orders are identical — they know what they want, don't push alternatives
- Always frame upsell as benefit to customer, never as "buy more"
