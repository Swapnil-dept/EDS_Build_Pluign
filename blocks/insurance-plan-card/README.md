# Insurance Plan Card

A two-column featured insurance plan card. The left panel shows a promotional section (background image, headline, subtext, benefits checklist) and the right panel shows the plan details (badge, title, pricing, metadata, feature icons, and a CTA button).

---

## Authoring (Google Docs / Word table)

### Column layout

| Insurance Plan Card |  |
|---|---|
| [promo background image] | BEST SELLER |
| ## Can't decide on a term insurance plan? | ### Tata AIA Sampoorna Raksha Promise |
| Share your needs and get | Get **₹1 Crore** Life cover @ **₹826/month** |
| - Personalized suggestions<br>- Customizable quotes | Age: **25** &nbsp; Cover till age: **60 yrs** &nbsp; Payment duration: **35 yrs** |
|  | - [icon] **99.41%** Individual Death Claim Settlement Ratio<br>- [icon] **pay later option** Defer premium by 12 months<br>- [icon] **Instant Payout** on terminal illness |
|  | [Customize plans for you](https://example.com/customize) |

> The block reads a **single two-column row**. Put all left-panel content in the first cell, and all right-panel content in the second cell.

---

## Element-detection rules (JS)

| Heuristic | Class applied |
|---|---|
| First `<p>` with no `<strong>` or `<a>` and < 30 chars | `.ipc-badge` |
| First `<h2>`/`<h3>`/`<h4>` in plan cell | `.ipc-plan-title` |
| `<p>` containing `₹` | `.ipc-pricing` |
| `<p>` containing "age"/"cover"/"payment" | `.ipc-meta` |
| First `<ul>` / `<ol>` in plan cell | `.ipc-features` |
| `<p>` containing an `<a>` | `.ipc-cta-wrapper` |

---

## Variants

Add a variant keyword in parentheses after the block name:

| Block header | Effect |
|---|---|
| `Insurance Plan Card` | Default gradient |
| `Insurance Plan Card (wide)` | Removes max-width cap |
| `Insurance Plan Card (dark)` | Dark panel overrides |

Or select them in the Universal Editor **Variants** multiselect field.

---

## CSS custom properties used

| Property | Purpose |
|---|---|
| `--link-color` | Plan title colour, promo bullet background |
| `--heading-font-family` | Headings |

---

## File structure

```
blocks/insurance-plan-card/
├── insurance-plan-card.js       ← decorate()
├── insurance-plan-card.css      ← block styles
├── _insurance-plan-card.json    ← Universal Editor model + definitions
└── README.md                    ← this file
```

---

## After every change

1. Run `validate_block` (EDS MCP tool) on the JS/CSS.
2. Run `check_performance` to confirm the pre-LCP payload stays under 100 KB.
