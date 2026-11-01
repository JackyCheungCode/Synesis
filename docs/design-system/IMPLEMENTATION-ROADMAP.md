# Synesis Carbon Implementation Roadmap

## Baseline

- Repository: `JackyCheungCode/Synesis`
- Baseline branch: `develop`
- UI system: official IBM Carbon React
- Scope: all current application routes, authentication views and shared shell
- Backend, database, credential security and business contracts: preserve

## Phase 0 — Guardrails (this branch)

1. Add repository-wide AI and contributor rules.
2. Replace the legacy anti-Carbon design test with a staged Carbon compliance gate.
3. Document current legacy UI debt.
4. Require Carbon compliance in CI.
5. Remove automatic production deployment on push to develop.
6. Require a protected production environment for manual release.

Exit criteria: guardrail tests pass, workflow syntax is valid, no production deployment occurs.

## Phase 1 — Carbon Foundation

1. Verify supported package versions and peer dependencies.
2. Add Carbon packages and a reproducible lockfile.
3. Establish Sass entry points, theme provider and global tokens.
4. Establish Carbon 2x Grid and centralized layout primitives.
5. Establish the shared Carbon component entry point.
6. Implement application shell, overlay navigation and theme switching.
7. Add component and accessibility test foundations.

Exit criteria: Foundation preview passes both themes, responsive checks, typecheck, build, keyboard and accessibility checks.

## Phase 2 — Page migration

Migrate in controlled slices:
1. Login and registration.
2. Import Export Leads Finder.
3. Social Leads Finder.
4. Global customer leads library.
5. API and AI credential settings.

For each page, preserve route, state transitions, API payloads, user-visible workflows and error handling. Remove legacy allowlist entries only after the page is fully migrated and verified.

## Phase 3 — Full compliance

1. Remove or reduce legacy component wrappers.
2. Remove obsolete styles and duplicate tokens.
3. Enable strict repository-wide Carbon checks.
4. Run full route, responsive, accessibility and business regression suites.
5. Verify CI required checks and preview.

Exit criteria: no unapproved legacy UI, all page checklists pass, all critical/serious accessibility issues resolved or explicitly approved.

## Phase 4 — Release

Production deployment is a separate owner-approved action through the protected GitHub `production` environment. A merge to `develop` must not deploy production automatically.

## Safety boundaries

This UI migration does not authorize:
- Supabase schema changes or migration execution.
- Changes to authentication or row-level security.
- Changes to API contracts or Apify Actor input payloads.
- Changes to encryption, credential storage, or BYOK behavior.
- Removal of features, routes or existing user data.
