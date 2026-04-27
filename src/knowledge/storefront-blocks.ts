/**
 * Storefront Block Catalog
 *
 * Canonical commerce blocks shipped or commonly built on top of
 * `aem-boilerplate-commerce`. Each entry maps an EDS block name to
 * the drop-in(s) it mounts and the slots it commonly customizes.
 */

export interface CommerceBlockSpec {
  name: string;            // EDS block folder name
  title: string;
  purpose: string;
  dropins: string[];       // dropin ids from DROPIN_CATALOG
  containers: string[];    // container imports
  commonSlots?: string[];
  authoredFields?: string[]; // doc-table fields the author can set
  loadStrategy: 'eager' | 'lazy';
  notes?: string[];
}

export const COMMERCE_BLOCKS: CommerceBlockSpec[] = [
  {
    name: 'commerce-mini-cart',
    title: 'Mini Cart',
    purpose: 'Header overlay cart — shows count + slide-in cart preview',
    dropins: ['cart'],
    containers: ['MiniCart'],
    commonSlots: ['EmptyCart', 'ProductAttributes', 'Footer'],
    loadStrategy: 'eager',
    notes: ['Mounted on every page', 'Lives in the header (not in /blocks/ tree typically)'],
  },
  {
    name: 'commerce-cart',
    title: 'Cart Page',
    purpose: 'Full /cart page',
    dropins: ['cart'],
    containers: ['Cart'],
    commonSlots: ['EmptyCart', 'ProductAttributes', 'OrderSummaryFooter'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-checkout',
    title: 'Checkout',
    purpose: 'Multi-step checkout page',
    dropins: ['checkout', 'payment-services'],
    containers: ['Checkout'],
    commonSlots: ['Heading', 'PaymentMethods', 'OrderSummary', 'PlaceOrder'],
    loadStrategy: 'lazy',
    notes: ['Requires Payment Services dropin for CC/Apple Pay'],
  },
  {
    name: 'commerce-order',
    title: 'Order Confirmation / History',
    purpose: 'Order confirmation, status, and history pages',
    dropins: ['order'],
    containers: ['OrderHeader', 'OrderProductList', 'OrderCostSummary', 'OrderStatus'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-product-details',
    title: 'Product Detail Page (PDP)',
    purpose: 'Full PDP with gallery, options, price, add-to-cart',
    dropins: ['pdp', 'product-recommendations', 'wishlist'],
    containers: ['ProductDetails'],
    commonSlots: ['Gallery', 'Price', 'Attributes', 'Actions', 'Description'],
    authoredFields: ['SKU (optional override)', 'Layout (default | wide | minimal)'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-product-list-page',
    title: 'Product List Page (PLP)',
    purpose: 'Category / search results page with facets, sort, pagination',
    dropins: ['product-discovery'],
    containers: ['ProductList', 'Facets', 'SortBy', 'Pagination'],
    commonSlots: ['ProductCard', 'EmptyList'],
    authoredFields: ['Category UID', 'Default Sort', 'Page Size'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-search',
    title: 'Search Bar / Results',
    purpose: 'Live-search-powered search input with results popover',
    dropins: ['product-discovery'],
    containers: ['Search'],
    loadStrategy: 'eager',
  },
  {
    name: 'commerce-recommendations',
    title: 'Product Recommendations Unit',
    purpose: 'Renders an AI-driven recommendation unit by typeId',
    dropins: ['product-recommendations'],
    containers: ['RecommendationUnit'],
    commonSlots: ['ProductCard', 'Header'],
    authoredFields: ['Type ID (e.g. rec-similar / rec-trending)', 'Heading'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-account',
    title: 'Customer Account',
    purpose: 'Account dashboard, addresses, orders, prefs',
    dropins: ['account', 'order'],
    containers: ['CustomerInformation', 'AddressBook', 'OrdersList'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-login',
    title: 'Sign-in / Sign-up',
    purpose: 'Sign-in form (or tabbed sign-in / sign-up)',
    dropins: ['auth'],
    containers: ['SignIn', 'SignUp', 'AuthCombine'],
    authoredFields: ['Variant (signin | signup | combined)'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-wishlist',
    title: 'Wishlist Page',
    purpose: 'Customer wishlist',
    dropins: ['wishlist'],
    containers: ['Wishlist'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-payment-services',
    title: 'Payment Services Mount',
    purpose: 'Hosted card form / Apple Pay / PayPal embedded inside checkout',
    dropins: ['payment-services'],
    containers: ['CreditCard', 'ApplePay', 'PayPal'],
    loadStrategy: 'lazy',
  },
  {
    name: 'commerce-quick-order',
    title: 'B2B Quick Order',
    purpose: 'B2B SKU pad / CSV upload',
    dropins: ['quick-order'],
    containers: ['QuickOrder', 'RequisitionLists'],
    loadStrategy: 'lazy',
  },
  // Custom composition blocks (built on the SDK, not 1:1 dropin mounts)
  {
    name: 'product-card',
    title: 'Product Card',
    purpose: 'Reusable card composing Image + Price + AddToCart for grids',
    dropins: ['pdp', 'cart'],
    containers: ['ProductPrice'],
    loadStrategy: 'lazy',
    notes: ['Composes design-system Card + ProductPrice + custom CTA'],
  },
];

export function findCommerceBlock(name: string): CommerceBlockSpec | undefined {
  return COMMERCE_BLOCKS.find((b) => b.name === name);
}
