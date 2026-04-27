/**
 * Drop-in Catalog
 *
 * Comprehensive catalog of all Adobe Commerce drop-ins (B2C + B2B).
 * Each entry documents: package, purpose, container components, slots,
 * events, and the canonical mount snippet.
 *
 * Source: experienceleague.adobe.com/developer/commerce/storefront/dropins
 * + npm registry (@dropins/storefront-*)
 */

export interface DropinSlot {
  name: string;
  purpose: string;
}

export interface DropinContainer {
  name: string;        // e.g. "Cart", "MiniCart"
  importPath: string;  // e.g. "@dropins/storefront-cart/containers/Cart.js"
  purpose: string;
  slots?: DropinSlot[];
}

export interface DropinEvent {
  name: string;        // ACDL event name
  payload: string;     // brief shape
}

export interface DropinSpec {
  id: string;                      // 'cart' | 'checkout' | …
  title: string;
  package: string;                 // npm package
  category: 'b2c' | 'b2b' | 'shared';
  purpose: string;
  apiImport: string;               // initialization import
  containers: DropinContainer[];
  events: DropinEvent[];
  blockName: string;               // suggested EDS block name
  notes?: string[];
}

export const DROPIN_CATALOG: DropinSpec[] = [
  // ─── Cart ────────────────────────────────────────────────────
  {
    id: 'cart',
    title: 'Cart',
    package: '@dropins/storefront-cart',
    category: 'b2c',
    purpose: 'Cart page and mini-cart UI with line-items, totals, coupons, gift options',
    apiImport: '@dropins/storefront-cart/api.js',
    blockName: 'commerce-cart',
    containers: [
      {
        name: 'Cart',
        importPath: '@dropins/storefront-cart/containers/Cart.js',
        purpose: 'Full cart page',
        slots: [
          { name: 'EmptyCart',           purpose: 'Render when cart has zero items' },
          { name: 'Heading',             purpose: 'Cart page heading' },
          { name: 'ProductAttributes',   purpose: 'Customise product line item attributes (price, options)' },
          { name: 'EstimateShipping',    purpose: 'Shipping estimator widget' },
          { name: 'CartSummaryFooter',   purpose: 'Custom footer below totals (e.g. trust badges)' },
          { name: 'OrderSummaryFooter',  purpose: 'Custom footer below order summary' },
          { name: 'ChooseGiftItems',     purpose: 'Gift-item picker' },
        ],
      },
      {
        name: 'MiniCart',
        importPath: '@dropins/storefront-cart/containers/MiniCart.js',
        purpose: 'Header / overlay mini-cart',
        slots: [
          { name: 'EmptyCart',         purpose: 'Empty state in the mini-cart' },
          { name: 'ProductAttributes', purpose: 'Custom product attributes per line' },
          { name: 'Footer',            purpose: 'Custom footer (CTAs, totals)' },
        ],
      },
      {
        name: 'EstimateShipping',
        importPath: '@dropins/storefront-cart/containers/EstimateShipping.js',
        purpose: 'Standalone estimate-shipping widget',
      },
      {
        name: 'CouponCode',
        importPath: '@dropins/storefront-cart/containers/CouponCode.js',
        purpose: 'Standalone coupon entry widget',
      },
    ],
    events: [
      { name: 'cart-data',                     payload: '{ cart }' },
      { name: 'cart/data',                     payload: '{ cart }' },
      { name: 'cart/added-to-cart',            payload: '{ items }' },
      { name: 'cart/removed-from-cart',        payload: '{ items }' },
      { name: 'cart/updated',                  payload: '{ cart, prevCart }' },
    ],
  },

  // ─── Checkout ────────────────────────────────────────────────
  {
    id: 'checkout',
    title: 'Checkout',
    package: '@dropins/storefront-checkout',
    category: 'b2c',
    purpose: 'Multi-step checkout (shipping, payment, review) with order placement',
    apiImport: '@dropins/storefront-checkout/api.js',
    blockName: 'commerce-checkout',
    containers: [
      {
        name: 'Checkout',
        importPath: '@dropins/storefront-checkout/containers/Checkout.js',
        purpose: 'Full multi-step checkout flow',
        slots: [
          { name: 'Heading',           purpose: 'Page heading' },
          { name: 'EmptyCart',         purpose: 'Shown when cart is empty mid-checkout' },
          { name: 'ServerError',       purpose: 'Custom server error UI' },
          { name: 'OutOfStock',        purpose: 'Out-of-stock notification' },
          { name: 'LoginForm',         purpose: 'Guest vs sign-in selector' },
          { name: 'ShippingMethods',   purpose: 'Shipping method picker' },
          { name: 'PaymentMethods',    purpose: 'Payment method picker (Apple Pay, CC, …)' },
          { name: 'BillToShippingAddress', purpose: 'Bill-to-shipping toggle' },
          { name: 'OrderSummary',      purpose: 'Right-rail summary' },
          { name: 'PlaceOrder',        purpose: 'Place-order button row' },
        ],
      },
    ],
    events: [
      { name: 'checkout/initialized',  payload: '{ cartId }' },
      { name: 'checkout/step-changed', payload: '{ step }' },
      { name: 'checkout/order-placed', payload: '{ order }' },
    ],
  },

  // ─── Order ───────────────────────────────────────────────────
  {
    id: 'order',
    title: 'Order',
    package: '@dropins/storefront-order',
    category: 'b2c',
    purpose: 'Order confirmation, order status, order history & details',
    apiImport: '@dropins/storefront-order/api.js',
    blockName: 'commerce-order',
    containers: [
      { name: 'OrderHeader',           importPath: '@dropins/storefront-order/containers/OrderHeader.js',           purpose: 'Order # + status header' },
      { name: 'OrderStatus',           importPath: '@dropins/storefront-order/containers/OrderStatus.js',           purpose: 'Order tracking timeline' },
      { name: 'OrderProductList',      importPath: '@dropins/storefront-order/containers/OrderProductList.js',      purpose: 'Line items in the order' },
      { name: 'OrderCostSummary',      importPath: '@dropins/storefront-order/containers/OrderCostSummary.js',      purpose: 'Totals breakdown' },
      { name: 'ShippingStatus',        importPath: '@dropins/storefront-order/containers/ShippingStatus.js',        purpose: 'Shipment progress' },
      { name: 'OrderConfirmation',     importPath: '@dropins/storefront-order/containers/OrderConfirmation.js',     purpose: 'Thank-you page composition' },
      { name: 'CustomerDetails',       importPath: '@dropins/storefront-order/containers/CustomerDetails.js',       purpose: 'Customer / billing / shipping address' },
    ],
    events: [
      { name: 'order/initialized', payload: '{ orderRef }' },
      { name: 'order/data',        payload: '{ order }' },
    ],
  },

  // ─── PDP ─────────────────────────────────────────────────────
  {
    id: 'pdp',
    title: 'Product Details (PDP)',
    package: '@dropins/storefront-pdp',
    category: 'b2c',
    purpose: 'Product detail page: gallery, options, attributes, add-to-cart',
    apiImport: '@dropins/storefront-pdp/api.js',
    blockName: 'commerce-product-details',
    containers: [
      { name: 'ProductDetails',  importPath: '@dropins/storefront-pdp/containers/ProductDetails.js',  purpose: 'Full PDP composition',
        slots: [
          { name: 'Header',         purpose: 'Custom header above gallery' },
          { name: 'Title',          purpose: 'Product title override' },
          { name: 'Gallery',        purpose: 'Gallery / image swatch override' },
          { name: 'Price',          purpose: 'Price block override' },
          { name: 'ShortDescription', purpose: 'Short description override' },
          { name: 'Attributes',     purpose: 'Configurable / custom attributes' },
          { name: 'Quantity',       purpose: 'Quantity selector override' },
          { name: 'Actions',        purpose: 'Add-to-cart / wishlist / actions row' },
          { name: 'Description',    purpose: 'Long description tab' },
        ],
      },
      { name: 'ProductGallery',  importPath: '@dropins/storefront-pdp/containers/ProductGallery.js',  purpose: 'Standalone gallery' },
      { name: 'ProductPrice',    importPath: '@dropins/storefront-pdp/containers/ProductPrice.js',    purpose: 'Standalone price' },
      { name: 'ProductOptions',  importPath: '@dropins/storefront-pdp/containers/ProductOptions.js',  purpose: 'Standalone options selector' },
    ],
    events: [
      { name: 'pdp/data',           payload: '{ product }' },
      { name: 'pdp/valuesChanged',  payload: '{ optionsUIDs }' },
    ],
  },

  // ─── Product Discovery (PLP / Search) ────────────────────────
  {
    id: 'product-discovery',
    title: 'Product Discovery (PLP & Search)',
    package: '@dropins/storefront-product-discovery',
    category: 'b2c',
    purpose: 'PLP, category pages, search results, faceted search powered by Live Search',
    apiImport: '@dropins/storefront-product-discovery/api.js',
    blockName: 'commerce-product-list-page',
    containers: [
      { name: 'ProductList',     importPath: '@dropins/storefront-product-discovery/containers/ProductList.js',     purpose: 'Grid of products',
        slots: [
          { name: 'ProductCard',  purpose: 'Render override per card' },
          { name: 'EmptyList',    purpose: 'No-results state' },
        ],
      },
      { name: 'Facets',          importPath: '@dropins/storefront-product-discovery/containers/Facets.js',          purpose: 'Filter rail' },
      { name: 'SortBy',          importPath: '@dropins/storefront-product-discovery/containers/SortBy.js',          purpose: 'Sort dropdown' },
      { name: 'Pagination',      importPath: '@dropins/storefront-product-discovery/containers/Pagination.js',      purpose: 'Paginator' },
      { name: 'Search',          importPath: '@dropins/storefront-product-discovery/containers/Search.js',          purpose: 'Search input + popover' },
    ],
    events: [
      { name: 'search/results',  payload: '{ products, total, facets }' },
      { name: 'search/request',  payload: '{ phrase, filters, sort, page }' },
    ],
  },

  // ─── Product Recommendations ─────────────────────────────────
  {
    id: 'product-recommendations',
    title: 'Product Recommendations',
    package: '@dropins/storefront-product-recommendations',
    category: 'b2c',
    purpose: 'AI-powered recommendation units (similar, recently-viewed, trending)',
    apiImport: '@dropins/storefront-product-recommendations/api.js',
    blockName: 'commerce-recommendations',
    containers: [
      { name: 'RecommendationUnit', importPath: '@dropins/storefront-product-recommendations/containers/RecommendationUnit.js', purpose: 'A single rec unit by typeId',
        slots: [
          { name: 'ProductCard',    purpose: 'Custom card render' },
          { name: 'Header',         purpose: 'Unit heading override' },
        ],
      },
    ],
    events: [
      { name: 'recs/unit-rendered', payload: '{ unitId, products }' },
      { name: 'recs/click',         payload: '{ unitId, productSku }' },
    ],
  },

  // ─── Personalization ─────────────────────────────────────────
  {
    id: 'personalization',
    title: 'Personalization',
    package: '@dropins/storefront-personalization',
    category: 'b2c',
    purpose: 'Conditional content blocks driven by Adobe Target / customer segments',
    apiImport: '@dropins/storefront-personalization/api.js',
    blockName: 'commerce-personalization',
    containers: [
      { name: 'PersonalizationContainer', importPath: '@dropins/storefront-personalization/containers/PersonalizationContainer.js', purpose: 'Container that toggles children based on audience' },
    ],
    events: [
      { name: 'personalization/evaluated', payload: '{ audienceIds }' },
    ],
  },

  // ─── Payment Services ────────────────────────────────────────
  {
    id: 'payment-services',
    title: 'Payment Services',
    package: '@dropins/storefront-payment-services',
    category: 'b2c',
    purpose: 'Adobe Payment Services UI: card form, Apple Pay, PayPal, vault',
    apiImport: '@dropins/storefront-payment-services/api.js',
    blockName: 'commerce-payment-services',
    containers: [
      { name: 'CreditCard',       importPath: '@dropins/storefront-payment-services/containers/CreditCard.js',       purpose: 'Hosted card form' },
      { name: 'ApplePay',         importPath: '@dropins/storefront-payment-services/containers/ApplePay.js',         purpose: 'Apple Pay button' },
      { name: 'PayPal',           importPath: '@dropins/storefront-payment-services/containers/PayPal.js',           purpose: 'PayPal button' },
      { name: 'VaultedMethods',   importPath: '@dropins/storefront-payment-services/containers/VaultedMethods.js',   purpose: 'Saved payment methods' },
    ],
    events: [
      { name: 'payments/initialized', payload: '{ methods }' },
      { name: 'payments/error',       payload: '{ code, message }' },
    ],
  },

  // ─── User Account ────────────────────────────────────────────
  {
    id: 'account',
    title: 'User Account',
    package: '@dropins/storefront-account',
    category: 'b2c',
    purpose: 'Customer account dashboard, addresses, orders, profile',
    apiImport: '@dropins/storefront-account/api.js',
    blockName: 'commerce-account',
    containers: [
      { name: 'CustomerInformation', importPath: '@dropins/storefront-account/containers/CustomerInformation.js', purpose: 'Profile / email / password' },
      { name: 'AddressBook',         importPath: '@dropins/storefront-account/containers/AddressBook.js',         purpose: 'Address book CRUD' },
      { name: 'OrdersList',          importPath: '@dropins/storefront-account/containers/OrdersList.js',          purpose: 'Order history list' },
      { name: 'CustomerCommunications', importPath: '@dropins/storefront-account/containers/CustomerCommunications.js', purpose: 'Newsletter / comms prefs' },
    ],
    events: [
      { name: 'account/data',     payload: '{ customer }' },
      { name: 'account/updated',  payload: '{ customer }' },
    ],
  },

  // ─── User Auth ───────────────────────────────────────────────
  {
    id: 'auth',
    title: 'User Auth',
    package: '@dropins/storefront-auth',
    category: 'b2c',
    purpose: 'Sign-in, sign-up, password reset, sign-out, session management',
    apiImport: '@dropins/storefront-auth/api.js',
    blockName: 'commerce-login',
    containers: [
      { name: 'SignIn',          importPath: '@dropins/storefront-auth/containers/SignIn.js',          purpose: 'Sign-in form' },
      { name: 'SignUp',          importPath: '@dropins/storefront-auth/containers/SignUp.js',          purpose: 'Sign-up form' },
      { name: 'ResetPassword',   importPath: '@dropins/storefront-auth/containers/ResetPassword.js',   purpose: 'Password reset' },
      { name: 'AuthCombine',     importPath: '@dropins/storefront-auth/containers/AuthCombine.js',     purpose: 'Tabbed sign-in/sign-up' },
    ],
    events: [
      { name: 'authenticated',  payload: '{ token, customer }' },
      { name: 'auth/signOut',   payload: '{}' },
    ],
  },

  // ─── Wishlist ────────────────────────────────────────────────
  {
    id: 'wishlist',
    title: 'Wishlist',
    package: '@dropins/storefront-wishlist',
    category: 'b2c',
    purpose: 'Wishlist page, add-to-wishlist toggle, share',
    apiImport: '@dropins/storefront-wishlist/api.js',
    blockName: 'commerce-wishlist',
    containers: [
      { name: 'Wishlist',           importPath: '@dropins/storefront-wishlist/containers/Wishlist.js',           purpose: 'Full wishlist page' },
      { name: 'AddToWishlist',      importPath: '@dropins/storefront-wishlist/containers/AddToWishlist.js',      purpose: 'Heart button toggle' },
    ],
    events: [
      { name: 'wishlist/data',  payload: '{ wishlist }' },
    ],
  },

  // ─── B2B: Quick Order ────────────────────────────────────────
  {
    id: 'quick-order',
    title: 'Quick Order (B2B)',
    package: '@dropins/storefront-quick-order',
    category: 'b2b',
    purpose: 'B2B quick-order pad, CSV upload, requisition lists',
    apiImport: '@dropins/storefront-quick-order/api.js',
    blockName: 'commerce-quick-order',
    containers: [
      { name: 'QuickOrder',         importPath: '@dropins/storefront-quick-order/containers/QuickOrder.js',         purpose: 'Quick-order entry pad' },
      { name: 'RequisitionLists',   importPath: '@dropins/storefront-quick-order/containers/RequisitionLists.js',   purpose: 'Requisition lists CRUD' },
    ],
    events: [
      { name: 'quick-order/added', payload: '{ items }' },
    ],
    notes: ['Requires B2B-enabled Adobe Commerce backend'],
  },
];

export function findDropin(query: string): DropinSpec | undefined {
  const q = query.toLowerCase().trim();
  return DROPIN_CATALOG.find(
    (d) =>
      d.id === q ||
      d.blockName === q ||
      d.package === q ||
      d.title.toLowerCase().includes(q) ||
      d.id.includes(q),
  );
}

export function listDropinsByCategory(category: 'b2c' | 'b2b' | 'shared'): DropinSpec[] {
  return DROPIN_CATALOG.filter((d) => d.category === category);
}

// Canonical mount snippet for any dropin
export function buildMountSnippet(spec: DropinSpec, container = spec.containers[0]): string {
  return `// blocks/${spec.blockName}/${spec.blockName}.js
import { events } from '@dropins/tools/event-bus.js';
import { render as provider } from '@dropins/tools/render.js';
import ${container.name} from '${container.importPath}';

export default async function decorate(block) {
  // 1. Read authored config (if any) before clearing the block
  const authored = Object.fromEntries(
    [...block.children].map((row) => {
      const [k, v] = row.children;
      return [k?.textContent?.trim(), v?.textContent?.trim()];
    }),
  );
  block.textContent = '';

  // 2. Mount the drop-in container
  await provider.render(${container.name}, {
    // props passed to the container
    ${container.slots?.length ? `slots: {
      ${container.slots
        .slice(0, 2)
        .map(
          (s) =>
            `${s.name}: (ctx) => {
        // ${s.purpose}
        ctx.appendChild(document.createElement('div'));
      },`,
        )
        .join('\n      ')}
    },` : ''}
  })(block);

  // 3. (Optional) react to dropin events
  events.on('${spec.events[0]?.name ?? 'dropin/data'}', (payload) => {
    // payload: ${spec.events[0]?.payload ?? '{}'}
  });
}
`;
}
