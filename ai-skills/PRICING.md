---
skill: PRICING
category: strategy-framework
priority: 7
triggers:
  - price
  - pricing
  - 定价
  - 价格
  - raise price
  - lower price
  - compare price
  - competitor price
  - margin
  - bundle price
  - set menu price
  - how to price
  - 贵吗
  - too expensive
---

# SKILL: PRICING — Psychological Pricing Strategy
**Version:** 1.0 | **Status:** ✅ Ready to Install | **Language:** ZH / EN / MY

---

## 🎯 Purpose
Help JP&Co admin make smarter pricing decisions using psychological pricing principles, competitor intel, and customer spend data — without needing a pricing consultant.

---

## 🧠 Core Pricing Principles

### 1. Charm Pricing (just-below pricing)
Round numbers feel expensive. Odd endings feel like deals.
| Instead of | Use |
|-----------|-----|
| RM10.00 | RM9.90 |
| RM15.00 | RM14.90 |
| RM20.00 | RM19.50 |

### 2. Anchor Pricing
Show a higher price first to make target price look reasonable.
```
Example: "Premium Set RM28 | Classic Set RM18"
→ RM18 feels cheap because RM28 anchors the perception
```

### 3. Bundle Pricing (perceived savings)
```
Individual: Coffee RM8 + Cake RM7 = RM15
Bundle: "Coffee & Cake Set" = RM13 (save RM2)
→ Customer saves money, shop increases avg spend
```

### 4. Price Tier Ladder
Always offer 3 tiers — customers default to middle.
```
Small RM7 | Regular RM10 | Large RM13
→ Most customers pick Regular (middle anchor effect)
```

### 5. Round Number Psychology
For premium items — round numbers signal quality.
```
Specialty coffee: RM20 (not RM19.90)
→ Round = confident, premium, no-discount feel
```

---

## 🔍 Competitor Pricing Analysis

AI will use `web_search` + `scrape_url` tools to:

1. Search: "[competitor name] menu price [city]"
2. Search: "GrabFood [area] coffee price"
3. Scrape competitor's GrabFood / FoodPanda listing
4. Compare to JP&Co current prices

**Output format:**
```
Item: [Latte]
JP&Co price: RM[X]
Competitor avg: RM[Y]
Gap: [+/-RM Z]
Recommendation: [Hold / Raise / Lower / Bundle]
Confidence: [HIGH / MEDIUM / LOW]
```

---

## 📊 Pricing Health Check

Run when admin asks "how are my prices?"

| Check | Good Sign | Warning Sign |
|-------|----------|-------------|
| Avg order value vs last month | +5% or more | -10% or more |
| Most ordered item margin | >60% | <40% |
| Discount usage rate | <20% of orders | >35% of orders |
| Bundle uptake | >15% of orders | <5% of orders |

---

## 💬 Admin Report Template
```
📊 Pricing Health Report — [Date]

✅ Strengths:
- [Item A] is priced well vs market (+RM2 above avg, still selling)
- Bundle conversion at [X]%

⚠️ Opportunities:
- [Item B] is RM3 below competitor avg — room to raise
- [Item C] has low margin — consider bundle or remove

💡 Suggestions:
1. [Specific action with RM impact estimate]
2. [Specific action with RM impact estimate]
```

---

## 🔧 AI Execution Steps

1. **Pull** current menu prices from knowledge base
2. **Get** avg order value + top items from transactions
3. **Search** competitor prices using web_search tool
4. **Apply** psychological pricing rules
5. **Generate** pricing health report
6. **Save insights** to ai_memories for next comparison

---

## 🚫 Rules
- Never recommend raising ALL prices at once — max 2–3 items per cycle
- Never suggest pricing below cost (AI doesn't know COGS — flag this to admin)
- Price changes need admin approval — AI only recommends, never auto-changes
- Always show competitor source URL when available
