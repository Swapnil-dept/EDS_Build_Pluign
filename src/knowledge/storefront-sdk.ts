/**
 * Drop-in SDK Knowledge
 *
 * The Drop-in SDK = `@dropins/tools` (v1.7+). It is the design system,
 * runtime framework, event bus, and tooling that every Adobe Commerce
 * drop-in is built on. Use this knowledge to **customize**, **style**,
 * and **compose** drop-ins — never to fork them.
 *
 * Source: experienceleague.adobe.com/developer/commerce/storefront/sdk
 */

// ─── SDK Surface ────────────────────────────────────────────────

export const SDK_SURFACE = `
## What @dropins/tools provides

| Module                              | Purpose                                          |
|-------------------------------------|--------------------------------------------------|
| @dropins/tools/initializer.js       | Mount + bootstrap drop-ins (initializeDropin)    |
| @dropins/tools/render.js            | Container renderer (provider.render(C, props))   |
| @dropins/tools/event-bus.js         | events.on / events.emit (typed, idempotent)      |
| @dropins/tools/lib.js               | Utilities: classes, debounce, fetchGraphQl, …    |
| @dropins/tools/preact.js            | Re-export of Preact + hooks (drop-ins use Preact)|
| @dropins/tools/lib/aem/configs.js   | Read EDS config from /config.json                |
| @dropins/tools/types.js             | Shared TS types                                  |
| @dropins/tools/components/          | Design-system primitives (see below)             |
| @dropins/tools/design-tokens/       | CSS custom properties (see below)                |
`.trim();

// ─── Design-System Components ───────────────────────────────────

export const SDK_DESIGN_COMPONENTS = [
  'Accordion', 'Badge', 'Button', 'Card', 'Carousel', 'Checkbox',
  'Chip', 'Counter', 'Divider', 'Form', 'Header', 'Heading',
  'Icon', 'Image', 'Input', 'InPageAlert', 'Modal', 'Notification',
  'Overlay', 'Picker', 'Pill', 'Price', 'ProgressSpinner', 'Radio',
  'Select', 'SkeletonLoader', 'Slider', 'SmartCheckbox', 'Stepper',
  'Tabs', 'Tag', 'Textarea', 'Tile', 'Toggle', 'Tooltip',
] as const;

// ─── Design Tokens ──────────────────────────────────────────────

export const SDK_DESIGN_TOKENS = `
## Design tokens (CSS custom properties)

All drop-ins consume these. Override at \`:root\` (global) or scope to a
single block (\`main .commerce-cart { … }\`) — never patch the dropin CSS.

### Color
\`\`\`css
--color-brand-50  …  --color-brand-900     /* primary brand scale */
--color-neutral-50 … --color-neutral-900   /* greyscale */
--color-positive-500   /* success */
--color-warning-500    /* warning */
--color-alert-500      /* destructive / error */
\`\`\`

### Typography
\`\`\`css
--type-headline-1-font-size       /* 48px */
--type-headline-2-font-size       /* 36px */
--type-body-1-font-size           /* 16px */
--type-body-2-font-size           /* 14px */
--type-base-font-family           /* primary font stack */
--type-headline-font-family       /* display font stack */
\`\`\`

### Spacing (4px base)
\`\`\`css
--spacing-xxsmall   /* 2px */
--spacing-xsmall    /* 4px */
--spacing-small     /* 8px */
--spacing-medium    /* 16px */
--spacing-big       /* 24px */
--spacing-large     /* 32px */
--spacing-xlarge    /* 48px */
\`\`\`

### Radius / shadow / border
\`\`\`css
--shape-radius-1 … --shape-radius-5
--shadow-1 … --shadow-3
--border-width-1, --border-style, --color-border
\`\`\`

### Component-scoped tokens
Each design-system component also exposes its own tokens, e.g.
\`--ds-button-primary-background\`, \`--ds-input-border-color\`.
`.trim();

// ─── Container / Slot pattern ───────────────────────────────────

export const CONTAINER_SLOT_PATTERN = `
## The Container / Slot customization pattern

Every drop-in ships **containers** (composable Preact components) with
**slots** (named override points). You customize a drop-in by passing
slot functions to \`provider.render(Container, { slots })\`:

\`\`\`js
import { render as provider } from '@dropins/tools/render.js';
import Cart from '@dropins/storefront-cart/containers/Cart.js';

await provider.render(Cart, {
  hideHeading: true,
  slots: {
    EmptyCart: (ctx) => {
      // ctx is a SlotContext — append/replace DOM here
      const wrap = document.createElement('div');
      wrap.className = 'my-empty-cart';
      wrap.innerHTML = \`
        <h2>Your bag is empty</h2>
        <a href="/" class="button">Continue shopping</a>
      \`;
      ctx.appendChild(wrap);
    },

    ProductAttributes: (ctx, { item }) => {
      if (item.lowStock) {
        const badge = document.createElement('span');
        badge.className = 'badge low-stock';
        badge.textContent = \`Only \${item.stock} left\`;
        ctx.appendChild(badge);
      }
    },

    OrderSummaryFooter: (ctx) => {
      const trust = document.createElement('div');
      trust.className = 'trust-badges';
      trust.innerHTML = '🔒 Secure checkout · Free returns';
      ctx.appendChild(trust);
    },
  },
})(block);
\`\`\`

### SlotContext API
- \`ctx.appendChild(node)\`  — add DOM at the slot position
- \`ctx.replaceWith(node)\`  — replace the default slot DOM entirely
- \`ctx.dictionary\`         — access localized strings
- \`ctx.onChange(cb)\`       — react to context changes (e.g. cart updates)

### When NOT to use slots
- You need to change layout across multiple slots → wrap the block in a
  custom CSS grid and override design tokens instead.
- You need a totally bespoke flow → compose individual containers
  yourself (e.g. \`ProductGallery\` + \`ProductPrice\` + custom CTA).
`.trim();

// ─── Event Bus pattern ─────────────────────────────────────────

export const EVENT_BUS_PATTERN = `
## Event Bus

\`@dropins/tools/event-bus.js\` is a typed, idempotent pub/sub used by
all drop-ins. It mirrors important state to Adobe Client Data Layer
(\`window.adobeDataLayer\`) automatically.

\`\`\`js
import { events } from '@dropins/tools/event-bus.js';

// Listen
events.on('cart/data', ({ cart }) => {
  document.querySelector('.mini-cart-count').textContent = cart.totalQuantity;
}, { eager: true /* fire with last value if already emitted */ });

// One-shot
events.on('authenticated', (payload) => { … }, { once: true });

// Emit (custom block → other blocks)
events.emit('myblock/ready', { foo: 1 });
\`\`\`

### Common dropin events
| Event                       | Emitted by         | Payload                        |
|-----------------------------|--------------------|--------------------------------|
| cart/data                   | cart               | { cart }                       |
| cart/added-to-cart          | cart               | { items }                      |
| pdp/data                    | pdp                | { product }                    |
| pdp/valuesChanged           | pdp                | { optionsUIDs }                |
| search/results              | product-discovery  | { products, total, facets }    |
| order/data                  | order              | { order }                      |
| authenticated               | auth               | { token, customer }            |
| account/data                | account            | { customer }                   |
| wishlist/data               | wishlist           | { wishlist }                   |
`.trim();

// ─── Initializer pattern ───────────────────────────────────────

export const INITIALIZER_PATTERN = `
## Initializer

\`@dropins/tools/initializer.js\` bootstraps a drop-in's data layer
**once** per page. Always call it from \`scripts/initializers.js\`
(invoked from \`loadEager\` in \`scripts.js\`):

\`\`\`js
import { initializers } from '@dropins/tools/initializer.js';
import * as cartApi from '@dropins/storefront-cart/api.js';

// Mount immediately (synchronous-ish, before first render)
await initializers.mountImmediately(cartApi.initialize, {
  langDefinitions: { default: await fetchPlaceholders() },
  models: { /* override default models */ },
});
\`\`\`

### Multi-dropin bootstrap
\`\`\`js
await Promise.all([
  initializers.mountImmediately(authApi.initialize,    { langDefinitions }),
  initializers.mountImmediately(cartApi.initialize,    { langDefinitions }),
  initializers.mountImmediately(accountApi.initialize, { langDefinitions }),
]);
\`\`\`
`.trim();

// ─── Composition recipe ────────────────────────────────────────

export const COMPOSITION_RECIPE = `
## Composing a custom commerce experience

You can compose **individual containers** (not the full page container)
when you need a bespoke layout — e.g. a "wide PDP" with gallery on the
left and details on the right but custom upsells in the middle.

\`\`\`js
import { render as provider } from '@dropins/tools/render.js';
import ProductGallery  from '@dropins/storefront-pdp/containers/ProductGallery.js';
import ProductPrice    from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductOptions  from '@dropins/storefront-pdp/containers/ProductOptions.js';
import RecommendationUnit from '@dropins/storefront-product-recommendations/containers/RecommendationUnit.js';

export default async function decorate(block) {
  block.innerHTML = \`
    <div class="pdp-grid">
      <div data-slot="gallery"></div>
      <div data-slot="info">
        <div data-slot="price"></div>
        <div data-slot="options"></div>
        <button class="add-to-cart">Add to bag</button>
      </div>
      <div data-slot="recs"></div>
    </div>\`;

  await Promise.all([
    provider.render(ProductGallery, {})(block.querySelector('[data-slot="gallery"]')),
    provider.render(ProductPrice,   {})(block.querySelector('[data-slot="price"]')),
    provider.render(ProductOptions, {})(block.querySelector('[data-slot="options"]')),
    provider.render(RecommendationUnit, { typeId: 'rec-similar' })(block.querySelector('[data-slot="recs"]')),
  ]);
}
\`\`\`
`.trim();

// ─── Hard rules ────────────────────────────────────────────────

export const SDK_HARD_RULES = [
  'Never edit files inside scripts/__dropins__/ — they are regenerated by `npm run postinstall`',
  'Customize via slots; if slots aren’t enough, compose individual containers; only as last resort, build custom UI on top of the dropin API',
  'Override design via CSS custom properties (--color-*, --type-*, --spacing-*) — never with !important',
  'Use events.on(…, { eager: true }) when you might subscribe after the dropin has already emitted',
  'Always pass langDefinitions to initialize() — pulled from EDS placeholders.json so all UI is localizable',
  'Read commerce config via getConfigValue(key) (scripts/configs.js); never hardcode endpoints or store codes',
  'Drop-ins are Preact internally; your slot callbacks return DOM nodes — do NOT import React/Vue inside slot fns',
  'Pre-LCP budget still applies — heavy drop-ins (PDP, checkout) are loaded as blocks (lazy), not in scripts.js',
];
