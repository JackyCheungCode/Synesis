# Synesis Engineering Rules

These rules apply to every human and AI contributor working in this repository. They are mandatory unless the repository owner explicitly approves a written exception.

## 1. Design-system authority

- IBM Carbon Design System is the sole product UI design system.
- Use the official Carbon React implementation: `@carbon/react`.
- Use official Carbon Sass styles and themes from `@carbon/styles`.
- Use official Carbon icons from `@carbon/icons-react`.
- Use Carbon design tokens and the Carbon 2x Grid.
- Consult the official guidance at https://carbondesignsystem.com/ and https://react.carbondesignsystem.com/.
- Do not introduce another UI component library, icon system, typography system, token set, or visual language.

## 2. Component rules

- Prefer official Carbon components over hand-built equivalents.
- Business-specific components must compose Carbon components; they must not recreate foundational controls.
- Do not add new native button, input, select, textarea, checkbox, radio, dialog, tab, or menu implementations where Carbon provides the equivalent.
- Do not add new Synesis-prefixed design tokens or page-local design foundations.
- Do not hardcode UI colors, font families, spacing, radii, or shadows. Use semantic Carbon tokens.
- Use Carbon Icons for product UI icons.
- Any approved exception must be documented with its owner, reason, affected files, and removal condition.

## 3. Theme, layout, and accessibility

- Support Carbon light and dark themes through the centralized theme foundation.
- Use Carbon typography, spacing, layers, grid, motion, and responsive guidance.
- All interactive controls must support keyboard operation, visible focus, accessible names, and correct semantic/ARIA relationships.
- Dialogs must manage initial focus, focus containment, Escape behavior, and focus restoration.
- Respect reduced-motion preferences.
- Target WCAG 2.2 AA; automated scans do not replace manual keyboard and screen-reader checks.

## 4. Architecture and business invariants

- Keep the application shell, navigation, theme provider, tokens, and shared component entry points centralized.
- Prevent page styles from leaking into other pages.
- Preserve existing routes, authentication, Apify workflows, Supabase contracts, credential encryption, BYOK behavior, user data, and business functionality.
- Do not expose provider credentials in browser storage, logs, URLs, or client bundles.
- UI refactoring does not authorize database schema changes, migration edits, API contract changes, or removal of product features.
- Database changes require a separate forward-only migration plan and explicit approval.

## 5. Required development workflow

Before a change:
1. Inspect the current implementation and all affected consumers.
2. Identify shared-component, route, theme, accessibility, and backend-contract impact.
3. Define acceptance criteria and regression coverage.
4. Use an isolated feature branch based on `develop`.

After a change:
1. Run type checking and production build.
2. Run relevant unit and integration tests.
3. Run Carbon compliance checks.
4. Run accessibility checks and manual keyboard verification.
5. Verify both themes and responsive breakpoints.
6. Verify affected business workflows and inspect browser console/network errors.
7. Record evidence, limitations, and changed files.

Never claim a test passed unless it was actually executed and its result was observed.

## 6. CI and release protection

- Required CI checks must pass before merge.
- Production deployment must be an explicit, separately approved action.
- A push or merge to `develop` must not automatically deploy production.
- Production deployment must use the protected GitHub `production` environment with required reviewers configured.
- Never deploy, alter production secrets, or run database migrations without explicit owner authorization.

## 7. Completion definition

A task is complete only when its acceptance criteria, test evidence, regression results, and known limitations are reported. Visual resemblance alone is not Carbon compliance.

## 8. Temporary legacy baseline

Existing non-Carbon implementation is technical debt, not permission to extend it. The initial legacy inventory is documented in `docs/design-system/LEGACY-ALLOWLIST.md`. New code must follow Carbon rules immediately. Existing entries may be removed only as their approved migration work is completed. The strict repository-wide gate is enabled after the Carbon Foundation migration establishes the official component and theme entry points.
