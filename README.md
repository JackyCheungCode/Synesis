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

## Local development
1. Copy `.env.example` to `.env.local`.
2. Fill only the Supabase project URL and publishable key when frontend auth is implemented.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

Never place AI provider keys, Cloudflare API tokens, or Supabase secret keys in `VITE_*` variables or source control.

## Current implementation status
Initial Carbon application shell and UI navigation are in place. Provider credential forms are presentation-only until authenticated backend encryption and credential persistence are implemented.
