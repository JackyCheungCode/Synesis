# Synesis

Global Trade Intelligence Platform.

## Product principles
- IBM Carbon-inspired design language with light and dark themes.
- Fixed left navigation with expandable platform modules.
- Platform-specific data modules and a shared cross-platform intelligence layer.
- Multi-provider AI architecture (OpenAI, Gemini, DeepSeek, Anthropic, Workers AI).
- Bring Your Own Key (BYOK): credentials are entered in the UI and stored only server-side after authenticated, encrypted credential APIs are deployed.
- AI-generated research and collection plans require human approval before execution.
- Existing Cloudflare Worker and Supabase project are reused. Do not create domains, zones, or replacement projects without explicit approval.

## Frontend
- React + TypeScript + Vite
- IBM Carbon React components and Carbon icons
- Brand marks use a local fallback registry.

## Cloudflare preview
- Existing Worker script name: `synesis`.
- Existing workers.dev host: `https://synesis.xg-y.workers.dev`.
- No custom domain or DNS zone was created.
- Current preview is a self-contained, responsive UI shell deployed directly to the existing Worker.
- `/api/v1/health` is the initial health endpoint. Other API routes intentionally return 404.
- The deployed preview uses demonstration data only. It does not connect to live data, save credentials, or execute collection jobs.
- The React/Carbon Vite application remains the source frontend for the next integrated build/deploy step.

## Backend and database
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
React/Carbon application shell, navigation, dual-theme support, platform/provider registry, and API credential-entry screens are in place. The live Worker currently serves a UI preview. Credential forms are presentation-only until authenticated backend encryption and credential persistence are implemented.
