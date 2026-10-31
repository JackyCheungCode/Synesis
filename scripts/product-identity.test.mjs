import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGtin, normalizeSourceUrl, normalizeResearchRecord, resolveProductIdentity } from '../supabase/functions/synesis-api/product-identity.js';

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

test('nested camelCase and punctuation variants are resolved case-insensitively', () => {
  const nested = resolveProductIdentity('amazon', { product: { productId: 'ABC-1', productName: 'Example' }, meta: { GTIN13: '4006381333931' } });
  assert.equal(nested.externalProductId, 'ABC-1');
  assert.equal(nested.canonicalKey, 'gtin:4006381333931');
});


test('normalizes ecommerce records into typed canonical fields with source provenance', () => {
  const result = normalizeResearchRecord('Amazon', {
    product: { title: 'Smart Feeder', brand: 'PetCo', price: '$49.90', currencyCode: 'USD', rating: '4.6', reviewCount: '128' },
    asin: 'B0ABC12345',
    productUrl: 'https://www.amazon.com/dp/B0ABC12345?utm_source=test',
  });
  assert.equal(result.entityType, 'product');
  assert.equal(result.normalizedData.title, 'Smart Feeder');
  assert.equal(result.normalizedData.price, 49.9);
  assert.equal(result.normalizedData.currency, 'USD');
  assert.equal(result.normalizedData.rating, 4.6);
  assert.equal(result.normalizedData.review_count, 128);
  assert.equal(result.fieldSources.price, 'price');
  assert.equal(result.canonicalKey, 'amazon:B0ABC12345');
  assert.equal(result.normalizationVersion, 1);
  assert.ok(result.qualityScore > 50);
});

test('normalizes social content metrics and ISO timestamps without losing original records', () => {
  const raw = { video: { desc: 'A demo', playCount: '12,500', diggCount: '900', commentCount: '42' }, author: { nickname: 'Creator' }, createTime: '2026-01-02T03:04:05Z', webVideoUrl: 'https://www.tiktok.com/@creator/video/123' };
  const result = normalizeResearchRecord('TikTok', raw);
  assert.equal(result.entityType, 'social_content');
  assert.equal(result.normalizedData.description, 'A demo');
  assert.equal(result.normalizedData.views, 12500);
  assert.equal(result.normalizedData.likes, 900);
  assert.equal(result.normalizedData.comments, 42);
  assert.equal(result.normalizedData.creator, 'Creator');
  assert.equal(result.normalizedData.published_at, '2026-01-02T03:04:05.000Z');
  assert.equal(raw.video.playCount, '12,500');
});

test('does not invent cross-platform identities from titles alone', () => {
  const one = normalizeResearchRecord('YouTube', { title: 'Same title' });
  const two = normalizeResearchRecord('TikTok', { title: 'Same title' });
  assert.equal(one.canonicalKey, null);
  assert.equal(two.canonicalKey, null);
  assert.ok(one.warnings.includes('未识别稳定来源标识，暂不进行跨记录去重'));
});

test('classifies public company and job records without mixing entity types', () => {
  assert.equal(normalizeResearchRecord('Crunchbase', { name: 'Example Inc' }).entityType, 'company');
  assert.equal(normalizeResearchRecord('Indeed', { jobTitle: 'Engineer' }).entityType, 'job');
  assert.equal(normalizeResearchRecord('Google Search', { title: 'Result' }).entityType, 'search_result');
  assert.equal(normalizeResearchRecord('Google Play', { title: 'App listing' }).entityType, 'app');
  assert.equal(normalizeResearchRecord('SEC EDGAR', { title: 'Filing' }).entityType, 'public_record');
});
