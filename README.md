# Lookbook Feature — Shopify Dawn Theme

A "Complete the Look" lookbook feature built on top of Shopify's Dawn theme. Lookbooks are defined via Shopify metaobjects and can be surfaced in two ways: added to any page through the theme customizer, or auto-displayed on a product page when that product has a lookbook metafield set.

---

## Architecture Overview

The feature is split across three layers:

```
Shopify Admin (metaobjects + metafields)
        ↓
Liquid sections (resolve lookbook data, pass handles to snippet)
        ↓
snippets/lookbook.liquid (shared markup, skeleton loader, Alpine bindings)
        ↓
src/components/LookbookSection.js (Alpine component — fetches products client-side)
        ↓
src/utils/api.js (Storefront API — market-aware pricing via @inContext)
```

The Liquid layer only handles **what** to show (which lookbook, which title). The **product data** (images, prices) is always fetched at runtime on the client so prices reflect the visitor's current market.

---

## Shopify Setup

### 1. Metaobject definition — `lookbook`

Create a metaobject type with handle `lookbook` and these fields:

| Field handle       | Type                          | Notes                              |
|--------------------|-------------------------------|------------------------------------|
| `title`            | Single line text              | Displayed as the section heading   |
| `description`      | Multi-line text (optional)    | Rendered as a subheading below the title |
| `product_handles`  | List of single line text      | One Shopify product handle per row |

`product_handles` is a **list of text**, not `product_reference`. This keeps the API query flexible and avoids GraphQL product reference limits.

### 2. Product metafield — `custom.lookbook`

Assign a metafield to products:

- Namespace: `custom`
- Key: `lookbook`
- Type: `metaobject` (references the `lookbook` metaobject type)

Each product can reference exactly one lookbook. The section reads `product.metafields.custom.lookbook.value` directly.

### 3. Storefront API token

In Shopify Admin, create a custom app with **Storefront API** access and the `unauthenticated_read_product_listings` scope. Add the public token to the theme settings under **Storefront API > Storefront API Access Token**.

This token is injected into `window.storefrontContext` by `layout/theme.liquid` before the app bundle loads.

---

## File Map

```
sections/
  lookbook.liquid              # Standalone section — add to any page via customizer
  lookbook-on-product.liquid   # Auto-shown on product pages (no config needed)

snippets/
  lookbook.liquid              # Shared markup used by both sections

src/
  app.js                       # Alpine init — registers lookbookSection component
  components/
    LookbookSection.js         # Alpine component
  utils/
    api.js                     # Storefront API helpers

config/
  settings_schema.json         # Adds "Storefront API" group for token input

layout/
  theme.liquid                 # Injects window.storefrontContext

templates/
  product.json                 # Includes lookbook-on-product section
```

---

## How Each Piece Works

### `sections/lookbook.liquid`

Resolves a metaobject selected by the merchant in the theme customizer. Extracts `title`, `description`, and `product_handles`, then delegates to the shared snippet.

```liquid
assign lookbook = section.settings.lookbook
assign title = lookbook.title.value
assign description = lookbook.description.value
assign product_handles = lookbook.product_handles.value | default: blank
```

The schema has a single setting of `"type": "metaobject"` with `"metaobject_type": "lookbook"` so the customizer shows a metaobject picker. Title comes directly from the metaobject — there is no override field.

### `sections/lookbook-on-product.liquid`

Reads the lookbook directly from the product's metafield. No merchant configuration needed — if the product has a lookbook assigned, it renders automatically.

```liquid
assign lookbook = product.metafields.custom.lookbook.value
```

Falls back to `'Complete the Look'` if the metaobject has no title set.

### `snippets/lookbook.liquid`

Shared markup for both sections. Accepts `title`, `description`, `product_handles`, and `section_id` as parameters.

Key design decisions:

- **`data-product-handles`** — the Liquid array is JSON-encoded and escaped into a `data-` attribute. Alpine reads it in `init()` via `JSON.parse(this.$el.dataset.productHandles)`. This is the handoff point between Liquid and Alpine.
- **`data-country`** — passes `localization.country.iso_code` to the component so it can request market-correct prices.
- **Skeleton loader** — rendered while `loading` is true; skeleton count matches the number of product handles so the layout doesn't jump.
- **`x-show` not `<template x-if>`** — all conditionals inside `x-for` use `x-show` on real DOM elements. Nested `<template x-if>` inside `<template x-for>` loses the loop scope in Alpine v3.
- **Currency rendering split** — Liquid renders the symbol and currency code (e.g. `$` and `AUD`); Alpine renders only the formatted number. This avoids JavaScript having to know the display format for each market.

### `src/components/LookbookSection.js`

Minimal Alpine component. On `init()`:

1. Reads `product_handles` and `country` from `data-` attributes.
2. Sets `skeletonCount` to the handle count so skeletons match the final layout.
3. Calls `fetchProductsByHandles` and stores the result in `looks`.
4. Sets `loading = false` in `finally` so the grid always un-hides even on error.

### `src/utils/api.js`

#### `storefrontFetch(query, variables)`

Private helper. Reads `token` and `shop` from `window.storefrontContext` (set by `layout/theme.liquid`). Throws on non-200 HTTP or GraphQL errors.

#### `fetchProductsByHandles(handles, country)`

The main export. Builds a single GraphQL request using **aliased `productByHandle` queries** rather than `products(query: "handle:x OR handle:y")`.

Why aliased queries? Shopify's `products(query:)` filter uses a search index — it can return unrelated products (e.g. returning `gift-card` for a handle search). `productByHandle` is an exact lookup.

GraphQL aliases require valid identifiers, so hyphens in handles are replaced with underscores:

```js
const alias = handle.replace(/-/g, '_');
// "the-complete-snowboard" → "the_complete_snowboard"
```

The final query looks like:

```graphql
query GetLookbookProducts($country: CountryCode!) @inContext(country: $country) {
  the_complete_snowboard: productByHandle(handle: "the-complete-snowboard") { ... }
  the_multi_location_snowboard: productByHandle(handle: "the-multi-location-snowboard") { ... }
}
```

`@inContext(country: $country)` makes Shopify return prices for the visitor's market (AUD vs JPY etc.).

The result maps back using the original `handles` array — product URLs are constructed from the input handle, not from the API response, to avoid issues with unpublished products returning `null` for `onlineStoreUrl`.

#### `formatNumber(amount, currencyCode)`

Uses `Intl.NumberFormat('en', ...)` with the locale hard-coded to `'en'`. Without an explicit locale, the system locale can change the currency symbol (e.g. Japanese system locale renders JPY as `JP¥` instead of `¥`). Decimal places are omitted for JPY.

---

## Build & Dev

```bash
pnpm install

# Watch mode — rebuilds src/ to assets/ on change
pnpm run dev

# Shopify CLI dev server
pnpm run shopify:dev

# Both together
pnpm start
```

Vite bundles `src/app.js` → `assets/app.js` and `src/scss/main.scss` → `assets/app.css`. The output filenames are stable (no hashes) so Liquid `asset_url` references never break.

---

## Market / Currency Support

| Concern              | Where handled                          |
|----------------------|----------------------------------------|
| Country detection    | `localization.country.iso_code` (Liquid) → `data-country` attribute → passed to GraphQL `@inContext` |
| Price amount         | Storefront API returns market price    |
| Currency symbol      | `localization.country.currency.symbol` rendered by Liquid |
| Currency code        | `localization.country.currency.iso_code` rendered by Liquid |
| Number formatting    | `Intl.NumberFormat('en')` in JS — commas/dots, zero decimals for JPY |

The symbol and code come from Liquid rather than JavaScript so they're always correct regardless of API response shape.

---

## Notable Trade-offs

- **No caching** — products are re-fetched on every page load. For a production build, responses could be cached in `sessionStorage` keyed by handles + country.
- **Single lookbook per product** — the metafield is a single reference, not a list. This was an intentional scope decision.
- **Public Storefront token** — the token is visible in page source. This is the standard Shopify pattern for client-side Storefront API use; the token only grants read access to published data.
- **Handle-based product reference** — `product_handles` stores plain strings, not product references. Handles can become stale if a product is renamed, but this avoids the complexity of metaobject product reference fields and their API querying limitations.
