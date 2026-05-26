const STOREFRONT_API_VERSION = '2024-10';


async function storefrontFetch(query, variables = {}) {
  const { token, shop } = window.storefrontContext;
  const url = `https://${shop}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Storefront API error: ${res.status}`);

  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);

  return data;
}

function formatNumber(amount, currencyCode) {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(parseFloat(amount));
}

export async function fetchProductsByHandles(handles, country) {
  if (!handles?.length) return [];

  const productFields = `
    handle
    title
    featuredImage {
      url(transform: { 
        maxWidth: 600, 
        maxHeight: 700 
      })
      altText
    }
    priceRange {
      minVariantPrice { 
        amount 
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice { 
        amount
        currencyCode
      }
    }
  `;

  // Use aliased productByHandle queries for exact handle matching.
  const handleEntries = handles.map((handle) => ({
    handle,
    alias: handle.replace(/-/g, '_'),
  }));

  const aliases = handleEntries
    .map(({ handle, alias }) => `${alias}: productByHandle(handle: ${JSON.stringify(handle)}) { ${productFields} }`)
    .join('\n');

  const query = `
    query GetLookbookProducts($country: CountryCode!) @inContext(country: $country) {
      ${aliases}
    }
  `;

  const data = await storefrontFetch(query, { country });

  return handleEntries
    .map(({ handle, alias }) => {
      const product = data[alias];
      if (!product) return null;

      const price = product.priceRange.minVariantPrice;
      const compareAt = product.compareAtPriceRange.minVariantPrice;
      const hasDiscount = parseFloat(compareAt.amount) > parseFloat(price.amount);

      return {
        handle,
        title: product.title,
        url: `${window.Shopify?.routes?.root ?? '/'}products/${handle}`,
        image: product.featuredImage?.url ?? null,
        imageAlt: product.featuredImage?.altText ?? product.title,
        price: formatNumber(price.amount, price.currencyCode),
        compareAtPrice: hasDiscount ? formatNumber(compareAt.amount, compareAt.currencyCode) : null,
      };
    })
    .filter(Boolean);
}

