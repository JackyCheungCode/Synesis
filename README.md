# Synesis

Global Trade Intelligence Platform.

## Product principles
- IBM Carbon React native components and icons; light/dark Carbon themes.
- Carbon UI Shell navigation with a responsive mobile side navigation.
- Platform-specific data modules and a shared cross-platform intelligence layer.
- AI providers: OpenAI, Gemini, DeepSeek, Anthropic Claude, Cloudflare Workers AI, plus Mistral and xAI adapters.
- BYOK: credentials are submitted only to an authenticated backend and encrypted with AES-256-GCM before storage.
- AI-generated research plans require explicit human approval before collection tasks can be created.
- Apify runs require an approved plan, a user-confirmed Actor ID, and a queued task state.
- Existing Cloudflare Worker, Supabase project, GitHub repository, and workers.dev host are reused. No new domain, DNS zone, or project is created.

## Frontend
- React + TypeScript + Vite.
- IBM Carbon React and Carbon icons.
- Responsive Carbon SideNav; mobile navigation opens from the Carbon Header menu button.
- Key Vault, provider connection testing, research project creation, AI plan review/approval, and collection task UI.
- Public Supabase URL and publishable key are safe client configuration; never place provider API keys or Supabase secret keys in `VITE_*` variables.

## Backend
- Supabase project: existing `Synesis` project in `eu-central-1`.
- Edge Function: `synesis-api` (JWT verification enabled).
- Function URL: `https://vuyyaqsmlzixhdjvaidj.supabase.co/functions/v1/synesis-api`.
- Credential metadata lives in owner-scoped public tables; encrypted credential bytes live in the non-exposed `private` schema.
- AES-256-GCM uses a random 96-bit nonce per credential. The 256-bit encryption key is stored in Supabase Vault and can be read only through service-role-only RPC.
- The Edge Function validates the caller's Supabase Auth JWT and scopes every credential lookup to that user.
- Provider connection tests are implemented for OpenAI-compatible APIs, Gemini, Anthropic, Cloudflare Workers AI, Apify, Google/YouTube API key checks, Reddit OAuth client credentials, and TikTok client credentials.
- AI plan generation supports OpenAI, Gemini, DeepSeek, Claude, Mistral, xAI, and Workers AI.
- Plan approval is performed server-side. Task creation occurs only after approval.
- Apify execution checks approved-plan status and queued task state; the actor ID must be explicitly supplied in the reviewed plan. A failed external start is recorded as failed.

## Database
- Core schema: provider configs, integration metadata, research projects, AI plans, collection tasks, and market reports.
- All exposed user tables have RLS and owner policies.
- Browser roles cannot write collection tasks or approve AI plans directly.
- Private credential tables are inaccessible to anon/authenticated roles.
- Service-only RPCs access the private schema and Vault encryption key.

## Cloudflare preview
- Existing Worker script name: `synesis`.
- Existing workers.dev host: `https://synesis.xg-y.workers.dev`.
- No custom domain or DNS zone was created.
- The current deployed Worker still serves the earlier standalone preview shell. The React/Carbon app and authenticated backend are in GitHub/Supabase; the React build has not yet been deployed to the existing Worker.

## Local development
1. Copy `.env.example` to `.env.local` (the existing public Supabase project values are also used as build fallbacks).
2. Run `npm install`.
3. Run `npm run dev`.

Never commit `.env.local`, AI provider keys, Apify tokens, Cloudflare API tokens, Supabase secret keys, or encryption keys.
