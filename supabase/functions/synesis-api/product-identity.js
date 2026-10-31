const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
export function readField(record, aliases) {
  const matches = (key) => aliases.some((alias) => alias instanceof RegExp ? alias.test(key) : String(alias).toLowerCase() === key.toLowerCase());
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 5) return null;
    if (Array.isArray(value)) { for (const item of value) { const found = visit(item, depth + 1); if (found !== null) return found; } return null; }
    for (const [key, nested] of Object.entries(value)) if (matches(key) && nested != null && String(nested).trim() !== '') return nested;
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
  if (!externalProductId && normalizedUrl) externalProductId = normalizedUrl;
  if (!externalProductId && gtin) externalProductId = `gtin:${gtin}`;
  if (!externalProductId) return null;
  return { externalProductId, canonicalKey: gtin ? `gtin:${gtin}` : `${platform}:${externalProductId}`, sourceSku: sku || null, sourceUrl, matchType: gtin ? 'gtin' : platformIdText ? 'platform_id' : sku && sellerId ? 'seller_sku' : 'source_url' };
}


const PLATFORM_ENTITY_RULES = [
  ['product', /amazon|ebay|walmart|etsy|aliexpress|shopify|tiktok.?shop|temu|shopee|lazada|rakuten|mercari|qoo10|淘宝|天猫|1688|京东|拼多多|商城|ecommerce|retail/i],
  ['social_content', /tiktok|instagram|youtube|twitter|^x$|linkedin|facebook|reddit|threads|douyin|抖音|小红书|xiaohongshu|weibo|微博|bilibili|知乎|豆瓣|pinterest|snapchat|twitch/i],
  ['search_result', /google|bing|baidu|百度|yandex|naver|yahoo|duckduckgo|brave|搜狗|360搜索|search|seo|trends/i],
  ['company', /crunchbase|opencorporates|companies.?house|sunbiz|builtwith|wappalyzer|similarweb|企查查|天眼查|爱企查|法人番号|dart|company|business|linkedin.?company/i],
  ['job', /indeed|glassdoor|ziprecruiter|wellfound|monster|careerbuilder|remote.?ok|we.?work|himalayas|boss|直聘|51job|智联|猎聘|拉勾|doda|mynavi|jobkorea|saramin|jobstreet|jobs|招聘/i],
  ['property', /zillow|redfin|realtor|apartments|rightmove|zoopla|suumo|home.?s|airbnb|booking|trip\.com|expedia|agoda|vrbo|房产|住宿|property|real.?estate/i],
  ['news', /news|bbc|reuters|techcrunch|wired|guardian|financial.?times|bloomberg|hacker.?news|新浪新闻|网易新闻|腾讯新闻|澎湃|36氪|虎嗅|界面|财新|arxiv|pubmed|rss/i],
  ['app', /google.?play|play.?store|app.?store|apple.?store|应用商店/i],
  ['public_record', /sec|edgar|usaspending|grants|fec|epa|clinicaltrials|openfda|nhtsa|ofac|court|cms|irs|ted|gleif|政府|公共数据/i],
];

const ENTITY_EXPECTED_FIELDS = {
  product: ['title','brand','category','price','currency','rating','review_count','source_url'],
  social_content: ['title','creator','published_at','views','likes','comments','shares','source_url'],
  search_result: ['title','description','source_url','category','published_at'],
  company: ['title','brand','category','description','location','source_url'],
  job: ['title','brand','description','location','price','published_at','source_url'],
  property: ['title','price','currency','location','category','rating','source_url'],
  news: ['title','brand','creator','description','published_at','source_url','category'],
  app: ['title','brand','rating','review_count','price','currency','source_url'],
  public_record: ['title','external_id','brand','category','location','published_at','source_url'],
  generic: ['title','description','source_url'],
};

function readFieldEntry(record, aliases) {
  const matches = (key) => aliases.some((alias) => alias instanceof RegExp ? alias.test(key) : String(alias).toLowerCase() === key.toLowerCase());
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 5) return null;
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item, depth + 1); if (found) return found; }
      return null;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (matches(key) && nested !== null && nested !== undefined && nested !== '') return { key, value: nested };
    }
    for (const nested of Object.values(value)) { const found = visit(nested, depth + 1); if (found) return found; }
    return null;
  };
  return visit(record);
}

function normalizedText(value) {
  if (value === null || value === undefined || typeof value === 'object') return null;
  const text = String(value).trim();
  return text || null;
}

function normalizedNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.replace(/,/g, '').trim();
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function normalizedDate(value) {
  const text = normalizedText(value);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

/**
 * Convert platform payloads into a versioned, user-scoped canonical field set.
 * This function never mutates or replaces the original Apify payload.
 */
export function normalizeResearchRecord(platformSlug, record) {
  const platform = String(platformSlug ?? '').trim();
  const rule = PLATFORM_ENTITY_RULES.find(([, pattern]) => pattern.test(platform));
  const entityType = rule?.[0] ?? 'generic';
  const definitions = {
    title: [/^(title|name|product.?name|item.?name|headline|job.?title|company.?name|app.?name|property.?name|post.?title)$/i],
    brand: [/^(brand(name)?|seller.?name|merchant|store.?name|shop.?name|company|company.?name|publisher|source|developer.?name)$/i],
    creator: [/^(author|author.?name|creator|username|user.?name|owner.?username|channel.?name|account.?name)$/i],
    description: [/^(description|product.?description|summary|snippet|caption|text|content|excerpt|about|overview)$/i],
    category: [/^(category|categories|department|product.?type|industry|sector|section|topic)$/i],
    price: [/^(price|sale.?price|current.?price|amount|cost|listing.?price|unit.?price|salary|compensation|rent|nightly.?price)$/i],
    currency: [/^(currency|currency.?code|price.?currency)$/i],
    rating: [/^(rating|stars|score|average.?rating|review.?score)$/i],
    review_count: [/^(review.?count|reviews.?count|number.?of.?reviews|ratings.?count)$/i],
    views: [/^(views|view.?count|play.?count|video.?views|installs|downloads)$/i],
    likes: [/^(likes|like.?count|digg.?count|favorite.?count)$/i],
    comments: [/^(comments|comment.?count|reply.?count|replies)$/i],
    shares: [/^(shares|share.?count|repost.?count)$/i],
    location: [/^(location|address|city|country|region|headquarters|workplace)$/i],
    published_at: [/^(published.?at|created.?at|posted.?at|timestamp|date|updated.?at|filed.?at)$/i],
    source_url: [/^(canonical.?url|product.?url|item.?url|post.?url|video.?url|article.?url|job.?url|listing.?url|website|url|permalink|link|href)$/i],
    external_id: [/^(asin|product.?id|item.?id|listing.?id|offer.?id|external.?id|record.?id|case.?number|document.?number|app.?id|video.?id|post.?id)$/i],
  };
  const normalizedData = {};
  const fieldSources = {};
  const rawValues = {};
  for (const [field, aliases] of Object.entries(definitions)) {
    const entry = readFieldEntry(record, aliases);
    if (!entry) continue;
    rawValues[field] = entry.value;
    fieldSources[field] = entry.key;
    let value = entry.value;
    if (field === 'price' || field === 'rating' || field === 'review_count' || field === 'views' || field === 'likes' || field === 'comments' || field === 'shares') value = normalizedNumber(value);
    else if (field === 'published_at') value = normalizedDate(value);
    else if (field === 'source_url') value = normalizeSourceUrl(value);
    else value = normalizedText(value);
    if (value !== null && value !== undefined && value !== '') normalizedData[field] = value;
  }
  if (normalizedData.currency) normalizedData.currency = String(normalizedData.currency).toUpperCase();
  const identity = entityType === 'product' ? resolveProductIdentity(platform, record) : null;
  const externalId = normalizedData.external_id;
  const sourceUrl = normalizedData.source_url;
  const canonicalKey = identity?.canonicalKey
    ?? (externalId ? `${platform.toLowerCase()}:${entityType}:id:${externalId}` : sourceUrl ? `${platform.toLowerCase()}:${entityType}:url:${sourceUrl}` : null);
  const expected = ENTITY_EXPECTED_FIELDS[entityType] ?? ENTITY_EXPECTED_FIELDS.generic;
  const populated = expected.filter((field) => normalizedData[field] !== undefined).length;
  const qualityScore = Math.round((populated / expected.length) * 100);
  const warnings = [];
  if (!canonicalKey) warnings.push('未识别稳定来源标识，暂不进行跨记录去重');
  if (!normalizedData.title) warnings.push('未识别标题或主体名称');
  if (rawValues.price !== undefined && normalizedData.price === undefined) warnings.push('价格字段无法转换为数值');
  if (normalizedData.price !== undefined && !normalizedData.currency) warnings.push('价格缺少币种，暂不进行跨币种比较');
  if (rawValues.published_at !== undefined && normalizedData.published_at === undefined) warnings.push('日期字段无法转换为标准时间');
  if (rawValues.source_url !== undefined && normalizedData.source_url === undefined) warnings.push('来源链接不是有效的 HTTP(S) 地址');
  return { entityType, canonicalKey, normalizedData, fieldSources, qualityScore, warnings, normalizationVersion: 1 };
}
