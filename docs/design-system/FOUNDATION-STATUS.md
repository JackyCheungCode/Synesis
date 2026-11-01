# Carbon Foundation implementation status

## Change record

- Repository: `JackyCheungCode/Synesis`
- Base: `develop`
- Working branch: `feature/carbon-foundation`
- Pull request: https://github.com/JackyCheungCode/Synesis/pull/5
- Validation run: https://github.com/JackyCheungCode/Synesis/actions/runs/41278328243
- Status: implementation in review; not merged or released

## Implemented in this Foundation slice

| Area | Implementation |
|---|---|
| Official dependencies | `@carbon/react@1.118.0`, `@carbon/styles@1.118.0`, `@carbon/icons-react@11.91.0` pinned exactly |
| Reproducible install | npm lockfile v3 committed; CI uses `npm ci` |
| Sass foundation | Selective Carbon Sass modules (UI shell, notification, loading, button, tooltip, grid, reset, fonts and theme); no full-library stylesheet import |
| Themes | Carbon `GlobalTheme`: White for light mode, G90 for dark mode; existing non-sensitive theme preference remains persisted |
| Semantic tokens | Shell surfaces and typography consume Carbon theme tokens; spacing uses Carbon spacing tokens |
| Grid | Carbon React `Grid` and `Column` components, using Carbon's 16-column 2x Grid breakpoints |
| Component entry point | `src/components/carbon/index.ts` exports approved Carbon React components and Carbon icons |
| Global shell | Carbon Header, HeaderMenuButton, HeaderName, HeaderGlobalAction, Content, Grid and Column |
| Navigation | Carbon SideNav / SideNavMenu / SideNavMenuItem; navigation remains an overlay rather than permanently shrinking page content |

## Deliberately unchanged

- Existing business-page components and workflows remain on the temporary legacy adapter for Phase 2 migration.
- Apify Actor discovery, schema retrieval, input payloads and execution logic.
- Supabase schema, Edge Functions, authentication, RLS, user data and credential encryption.
- BYOK credential ownership, server-side encryption and redacted browser presentation.
- Existing routes and hash-navigation contracts.

The legacy adapter and existing page styles remain recorded in `LEGACY-ALLOWLIST.md`; no new business-page migration is claimed in this phase.

## CI evidence

The latest successful validation run completed:

- Carbon compliance: PASS
- `npm ci --no-audit --no-fund`: PASS
- Import/export leads regression test: PASS
- AI provider model actions test: PASS
- TypeScript typecheck and Vite production build: PASS
- Build artifact upload: PASS
- Carbon CSS output: 344.97 kB (36.90 kB gzip), down from 1,277.69 kB (122.42 kB gzip) with the initial full-library Sass import
- Production deploy job: SKIPPED

No production deployment was initiated by this PR's GitHub Actions deploy job.

## Remaining acceptance work

- Browser visual review of light and dark themes.
- Responsive review at 320, 375, 768, 1024, 1440 CSS px and wide desktop.
- Keyboard-only navigation, focus order and focus restoration review.
- Screen-reader and automated axe review; document any exceptions.
- Confirm Carbon IBM Plex font assets render without an external font dependency.
- Cloudflare Workers Builds preview build: PASS; branch trigger is `feature/carbon-foundation` and deploy command is `npx wrangler preview`, not `wrangler deploy`.
- Phase 2 migration of Login/Register, Import Export Leads Finder, Social Leads Finder, Global Leads and API/AI settings to Carbon controls.
- Shrink the legacy allowlist as each page is migrated and regression-tested.

## Release boundary

This PR is a draft and is not merged. No production deployment, Supabase migration, schema change or secret change is authorized by this work.
