import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGtin, normalizeSourceUrl, resolveProductIdentity } from '../supabase/functions/synesis-api/product-identity.js';

test('valid GTINs normalize and invalid check digits are rejected', () => {
  assert.equal(normalizeGtin('4006381333931'), '4006381333931');
  assert.equal(normalizeGtin('0 36000-291452'), '036000291452');
  assert.equal(normalizeGtin('4006381333932'), null);
  assert.equal(normalizeGtin('12345'), null);
});
test('GTIN identity is stable across platforms while source IDs remain distinct', () => {
  const amazon = resolveProductIdentity('amazon', { asin: 'B0ABC12345', gtin: '4006381333931' });
  const ebay = resolveProductIdentity('ebay', { itemId: '998877', ean: '4006381333931' });
  assert.equal(amazon.canonicalKey, ebay.canonicalKey);
  assert.equal(amazon.canonicalKey, 'gtin:4006381333931');
  assert.equal(amazon.externalProductId, 'B0ABC12345');
  assert.equal(ebay.externalProductId, '998877');
});
test('unscoped seller SKUs are not globally unique', () => {
  assert.equal(resolveProductIdentity('amazon', { sku: 'SAME-SKU' }), null);
  const one = resolveProductIdentity('amazon', { sku: 'SAME-SKU', sellerId: 'seller-a' });
  const two = resolveProductIdentity('amazon', { sku: 'SAME-SKU', sellerId: 'seller-b' });
  assert.notEqual(one.externalProductId, two.externalProductId);
  assert.equal(one.sourceSku, 'SAME-SKU');
});
test('platform IDs stay platform-scoped without a valid GTIN', () => {
  assert.notEqual(resolveProductIdentity('amazon', { productId: '12345' }).canonicalKey, resolveProductIdentity('ebay', { productId: '12345' }).canonicalKey);
});
test('URL fallback strips tracking but preserves host, country and variants', () => {
  const first = resolveProductIdentity('shop', { url: 'HTTPS://Shop.Example/item/?utm_source=x&variant=red#details' });
  const tracked = resolveProductIdentity('shop', { url: 'https://shop.example/item?variant=red&fbclid=abc' });
  const blue = resolveProductIdentity('shop', { url: 'https://shop.example/item?variant=blue' });
  const country = resolveProductIdentity('shop', { url: 'https://shop.example.fr/item?variant=red' });
  assert.equal(first.canonicalKey, tracked.canonicalKey);
  assert.notEqual(first.canonicalKey, blue.canonicalKey);
  assert.notEqual(first.canonicalKey, country.canonicalKey);
  assert.equal(normalizeSourceUrl('javascript:alert(1)'), null);
});
