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

export const apiIntegrations = [
  { name: 'Apify', slug: 'apify', fallback: 'A', credentialLabel: 'Apify API Token', placeholder: '填写 Apify API Token' },
  { name: 'Amazon Selling Partner API', slug: 'amazon', fallback: 'a', credentialLabel: 'LWA Credential Bundle (JSON)', placeholder: '{ clientId, clientSecret, refreshToken }' },
  { name: 'eBay Developer API', slug: 'ebay', fallback: 'e', credentialLabel: 'OAuth Credential Bundle (JSON)', placeholder: '{ clientId, clientSecret }' },
  { name: 'Walmart Marketplace API', slug: 'walmart', fallback: 'W', credentialLabel: 'OAuth Credential Bundle (JSON)', placeholder: '{ clientId, clientSecret }' },
  { name: 'Alibaba Open Platform', slug: 'alibaba', fallback: 'A', credentialLabel: 'App Credential Bundle (JSON)', placeholder: '{ appKey, appSecret, refreshToken }' },
  { name: 'AliExpress Open Platform', slug: 'aliexpress', fallback: 'A', credentialLabel: 'App Credential Bundle (JSON)', placeholder: '{ appKey, appSecret, refreshToken }' },
  { name: 'Google Cloud APIs', slug: 'google', fallback: 'G', credentialLabel: 'Google API Key', placeholder: '填写 Google API Key' },
  { name: 'YouTube Data API', slug: 'youtube', fallback: '▶', credentialLabel: 'YouTube Data API Key', placeholder: '填写 YouTube Data API Key' },
  { name: 'Reddit API', slug: 'reddit', fallback: 'r', credentialLabel: 'Reddit Client Secret', placeholder: '填写 Reddit OAuth Client Secret' },
  { name: 'TikTok API', slug: 'tiktok', fallback: '♪', credentialLabel: 'TikTok Client Secret', placeholder: '填写 TikTok Developer Client Secret' },
  { name: 'Custom REST API', slug: 'api', fallback: 'API', credentialLabel: 'API Key / Token', placeholder: '填写自定义 API Key 或 Token' },
];

export const services: CatalogItem[] = [
  { name: 'Apify', slug: 'apify', fallback: 'A', kind: 'service' },
  { name: 'GitHub', slug: 'github', fallback: 'GH', kind: 'service' },
  { name: 'Supabase', slug: 'supabase', fallback: 'S', kind: 'service' },
  { name: 'Cloudflare', slug: 'cloudflare', fallback: 'C', kind: 'service' },
];