import { z } from 'zod';
import { DROPIN_CATALOG } from '../knowledge/storefront-dropins.js';
import { EVENT_BUS_PATTERN } from '../knowledge/storefront-sdk.js';
export function registerCommerceEventsGuide(server) {
    server.tool('commerce_events_guide', `Guide for Adobe Client Data Layer (ACDL) and the @dropins/tools event-bus. Returns: how to bootstrap ACDL in head.html, how to install and configure @adobe/magento-storefront-events-sdk + @adobe/magento-storefront-event-collector, the full inventory of dropin events, and snippets for common use cases (cart counter, analytics push, conversion tracking, custom events).`, {
        topic: z
            .enum(['overview', 'bootstrap', 'collector', 'events', 'cart-counter', 'analytics', 'custom-events', 'all'])
            .default('all')
            .describe('Which section of the guide to return'),
    }, {
        title: 'Commerce Events Guide',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ topic }) => {
        const sections = [];
        const want = (k) => topic === 'all' || topic === k;
        if (want('overview'))
            sections.push(`# Adobe Commerce events on EDS\n\n` +
                `Two layers cooperate:\n\n` +
                `1. **Adobe Client Data Layer (ACDL)** — \`window.adobeDataLayer\` — vendor-neutral push/listen pattern, used by analytics & personalization.\n` +
                `2. **@dropins/tools event-bus** — typed pub/sub used inside drop-ins. Mirrors important events to ACDL automatically via the **Magento Storefront Event Collector**.\n\n` +
                `Most apps need both: dropins emit → collector translates → ACDL → analytics SDKs (Adobe Analytics, GA4, Target).`);
        if (want('bootstrap'))
            sections.push(`## 1 · Bootstrap ACDL in head.html\n\n` +
                '```html\n' +
                '<!-- in head.html, BEFORE any dropin script -->\n' +
                '<script>window.adobeDataLayer = window.adobeDataLayer || [];</script>\n' +
                '```\n\n' +
                'This must be inline & first, so dropins can push events even before the analytics SDK loads (events are queued).');
        if (want('collector'))
            sections.push(`## 2 · Install the Storefront Events SDK + Collector\n\n` +
                '```bash\n' +
                'npm install @adobe/magento-storefront-events-sdk @adobe/magento-storefront-event-collector\n' +
                '```\n\n' +
                'Wire them in `scripts/commerce-events.js` (loaded delayed):\n\n' +
                '```js\n' +
                `// scripts/commerce-events.js — loaded after LCP\n` +
                `import '@adobe/magento-storefront-events-sdk';\n` +
                `import '@adobe/magento-storefront-event-collector';\n` +
                `import { getConfigValue } from './configs.js';\n\n` +
                `(async () => {\n` +
                `  const mse = window.magentoStorefrontEvents;\n` +
                `  mse.context.setStorefrontInstance({\n` +
                `    environment: 'production',\n` +
                `    storeViewCode: await getConfigValue('commerce-store-view-code'),\n` +
                `    websiteCode:   await getConfigValue('commerce-website-code'),\n` +
                `    storeCode:     await getConfigValue('commerce-store-code'),\n` +
                `    storeUrl:      window.location.origin,\n` +
                `    websiteId:     1,\n` +
                `    storeId:       1,\n` +
                `    storeViewId:   1,\n` +
                `  });\n` +
                `})();\n` +
                '```\n\n' +
                'Then import this file from `scripts/delayed.js` (NOT scripts.js) so it does not block LCP.');
        if (want('events'))
            sections.push(`## 3 · Drop-in event inventory\n\n` +
                '| Drop-in | Event | Payload |\n|---|---|---|\n' +
                DROPIN_CATALOG.flatMap((d) => d.events.map((e) => `| ${d.id} | \`${e.name}\` | \`${e.payload}\` |`)).join('\n'));
        if (want('cart-counter'))
            sections.push(`## 4 · Cart counter (mini-cart badge)\n\n` +
                '```js\n' +
                `// blocks/header/header.js or similar\n` +
                `import { events } from '@dropins/tools/event-bus.js';\n\n` +
                `const badge = document.querySelector('.mini-cart-count');\n\n` +
                `events.on('cart/data', ({ cart }) => {\n` +
                `  if (!cart) return;\n` +
                `  badge.textContent = cart.totalQuantity ?? 0;\n` +
                `  badge.hidden = !cart.totalQuantity;\n` +
                `}, { eager: true /* fire with current value if already emitted */ });\n` +
                '```');
        if (want('analytics'))
            sections.push(`## 5 · Push to analytics (GA4 / Adobe Analytics)\n\n` +
                '```js\n' +
                `// scripts/analytics.js (loaded delayed)\n` +
                `window.adobeDataLayer.push((dl) => {\n` +
                `  dl.addEventListener('cart-added-to-cart', (event) => {\n` +
                `    // ACDL events from the collector are normalized\n` +
                `    gtag('event', 'add_to_cart', {\n` +
                `      currency: event.cart.currency,\n` +
                `      value:    event.cart.subtotal,\n` +
                `      items:    event.items.map((i) => ({\n` +
                `        item_id: i.sku, item_name: i.name, quantity: i.quantity, price: i.price,\n` +
                `      })),\n` +
                `    });\n` +
                `  });\n\n` +
                `  dl.addEventListener('place-order', (event) => {\n` +
                `    gtag('event', 'purchase', {\n` +
                `      transaction_id: event.order.orderRef,\n` +
                `      value:          event.order.grandTotal,\n` +
                `      currency:       event.order.currency,\n` +
                `    });\n` +
                `  });\n` +
                `});\n` +
                '```');
        if (want('custom-events'))
            sections.push(`## 6 · Emit your own events\n\n` +
                '```js\n' +
                `import { events } from '@dropins/tools/event-bus.js';\n\n` +
                `// In your custom block\n` +
                `events.emit('mybrand/banner-clicked', { campaignId: 'spring-sale' });\n\n` +
                `// Anywhere else\n` +
                `events.on('mybrand/banner-clicked', ({ campaignId }) => { /* … */ });\n` +
                '```');
        if (want('all'))
            sections.push(`## Reference: Event Bus pattern\n\n${EVENT_BUS_PATTERN}`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=commerce-events-guide.js.map