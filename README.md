# Synesis

Global Trade Intelligence Platform.

## Product principles
- IBM Carbon Design System, dual light/dark themes.
- Fixed left navigation with expandable platform modules.
- Platform-specific data modules and a shared cross-platform intelligence layer.
- Multi-provider AI architecture (OpenAI, Gemini, DeepSeek, Anthropic, Workers AI).
- Bring Your Own Key (BYOK): credentials are entered in the UI and must only be stored server-side after authenticated, encrypted credential APIs are deployed.
- AI-generated research and collection plans require human approval before execution.
- Existing Cloudflare Worker and Supabase project are reused. Do not create domains, zones, or replacement projects without explicit approval.

## Frontend
- React + TypeScript + Vite
- IBM Carbon React components and Carbon icons
- Brand marks use Simple Icons CDN with local monogram fallback.

## Cloudflare Worker
- Worker script name remains `synesis`.
- `wrangler.jsonc` targets the existing Worker and its existing workers.dev route; no custom domain or DNS zone is created.
- `/api/v1/health` is the initial health endpoint. Other API routes intentionally return 404 until implemented.
- Static frontend assets are served from Vite `dist` when deployed with Wrangler.

## Backend and database
- Cloudflare Worker: existing `synesis` script; do not rename it.
- Supabase project: existing `Synesis` project in `eu-central-1`.
- Core schema: user-owned provider configs, integration metadata, research projects, AI plans, collection tasks, and market reports.
- Encrypted credentials live in the non-exposed `private` schema; only the trusted backend service role can access them.
- Collection execution must remain gated by an approved AI research plan.

## Local development
1. Copy `.env.example` to `.env.local`.
2. Fill only the Supabase project URL and publishable key when frontend auth is implemented.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

Never place AI provider keys, Cloudflare API tokens, or Supabase secret keys in `VITE_*` variables or source control.

## Current implementation status
Initial Carbon application shell, navigation, dual-theme token classes, platform/provider icon registry, and API credential-entry screens are in place. Credential forms are presentation-only until authenticated backend encryption and credential persistence are implemented.
