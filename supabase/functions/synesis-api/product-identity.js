const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
function readField(record, aliases) {
  const wanted = new Set(aliases.map((name) => name.toLowerCase()));
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 5) return null;
    if (Array.isArray(value)) { for (const item of value) { const found = visit(item, depth + 1); if (found !== null) return found; } return null; }
    for (const [key, nested] of Object.entries(value)) if (wanted.has(key.toLowerCase()) && nested != null && String(nested).trim() !== '') return nested;
    for (const nested of Object.values(value)) { const found = visit(nested, depth + 1); if (found !== null) return found; }
    return null;
  };
  return visit(record);
}
export function normalizeGtin(value) {
  if (value == null) return null;
  const digits = String(value).replace(/[\s-]/g, '');
  if (!GTIN_LENGTHS.has(digits.length) || !/^\d+$/.test(digits)) return null;
  const body = digits.slice(0, -1).split('').reverse();
  const sum = body.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1)) ? digits : null;
}
export function normalizeSourceUrl(value) {
  if (value == null) return null;
  try {
    const parsed = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = ''; parsed.hostname = parsed.hostname.toLowerCase();
    for (const key of [...parsed.searchParams.keys()]) if (/^utm_/i.test(key) || /^(fbclid|gclid|msclkid|yclid|ref|ref_|source|campaign)$/i.test(key)) parsed.searchParams.delete(key);
    parsed.searchParams.sort();
    if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) parsed.port = '';
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch { return null; }
}
/** GTIN is globally matchable; platform IDs and seller SKUs remain scoped. */
export function resolveProductIdentity(platformSlug, record) {
  const platform = String(platformSlug ?? '').trim().toLowerCase();
  if (!platform) return null;
  const platformId = readField(record, ['asin','product_id','productId','item_id','itemId','listing_id','listingId','offer_id','offerId','external_product_id','externalProductId']);
  const skuValue = readField(record, ['sku','seller_sku','sellerSku','merchant_sku','merchantSku']);
  const sellerIdValue = readField(record, ['seller_id','sellerId','merchant_id','merchantId']);
  const gtin = normalizeGtin(readField(record, ['gtin','gtin8','gtin12','gtin13','gtin14','ean','upc','barcode']));
  const urlValue = readField(record, ['canonical_url','canonicalUrl','product_url','productUrl','item_url','itemUrl','url','link']);
  const platformIdText = platformId == null ? '' : String(platformId).trim();
  const sku = skuValue == null ? '' : String(skuValue).trim();
  const sellerId = sellerIdValue == null ? '' : String(sellerIdValue).trim();
  const sourceUrl = urlValue == null ? null : String(urlValue).trim();
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  let externalProductId = platformIdText || null;
  if (!externalProductId && sku && sellerId) externalProductId = `seller:${sellerId}:sku:${sku}`;
  if (!externalProductId && gtin) externalProductId = `gtin:${gtin}`;
  if (!externalProductId && normalizedUrl) externalProductId = normalizedUrl;
  if (!externalProductId) return null;
  return { externalProductId, canonicalKey: gtin ? `gtin:${gtin}` : `${platform}:${externalProductId}`, sourceSku: sku || null, sourceUrl, matchType: gtin ? 'gtin' : platformIdText ? 'platform_id' : sku && sellerId ? 'seller_sku' : 'source_url' };
}
