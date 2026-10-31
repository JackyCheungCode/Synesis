export type CatalogItem = { name: string; slug: string; fallback: string; kind: 'platform' | 'provider' | 'service' };

export const platforms: CatalogItem[] = [
  { name: 'Amazon', slug: 'amazon', fallback: 'a', kind: 'platform' },
  { name: 'eBay', slug: 'ebay', fallback: 'e', kind: 'platform' },
  { name: 'Walmart', slug: 'walmart', fallback: 'W', kind: 'platform' },
  { name: 'Alibaba', slug: 'alibaba', fallback: 'A', kind: 'platform' },
  { name: 'AliExpress', slug: 'aliexpress', fallback: 'A', kind: 'platform' },
  { name: 'Google', slug: 'google', fallback: 'G', kind: 'platform' },
  { name: 'YouTube', slug: 'youtube', fallback: '▶', kind: 'platform' },
  { name: 'Reddit', slug: 'reddit', fallback: 'r', kind: 'platform' },
  { name: 'TikTok', slug: 'tiktok', fallback: '♪', kind: 'platform' },
];

export const providers: CatalogItem[] = [
  { name: 'OpenAI', slug: 'openai', fallback: 'O', kind: 'provider' },
  { name: 'Google Gemini', slug: 'googlegemini', fallback: 'G', kind: 'provider' },
  { name: 'DeepSeek', slug: 'deepseek', fallback: 'D', kind: 'provider' },
  { name: 'Anthropic Claude', slug: 'anthropic', fallback: 'A', kind: 'provider' },
  { name: 'Cloudflare Workers AI', slug: 'cloudflare', fallback: 'C', kind: 'provider' },
  { name: 'Mistral AI', slug: 'mistral', fallback: 'M', kind: 'provider' },
  { name: 'xAI', slug: 'x', fallback: 'x', kind: 'provider' },
];

export const services: CatalogItem[] = [
  { name: 'Apify', slug: 'apify', fallback: 'A', kind: 'service' },
  { name: 'GitHub', slug: 'github', fallback: 'GH', kind: 'service' },
  { name: 'Supabase', slug: 'supabase', fallback: 'S', kind: 'service' },
  { name: 'Cloudflare', slug: 'cloudflare', fallback: 'C', kind: 'service' },
];