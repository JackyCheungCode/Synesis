# Carbon component entry point

New shared and shell UI imports official IBM Carbon React components and icons
from `src/components/carbon/index.ts`.

- Components: `@carbon/react`
- Styles, themes, tokens and grid Sass: `@carbon/styles` (also re-exported by Carbon React)
- Product icons: `@carbon/icons-react`

The existing `src/components/ui.tsx` remains a temporary legacy adapter for
business pages that are scheduled for migration in Phase 2. Do not add new
exports or controls to that adapter. Migrate each consumer to official Carbon
components before retiring the adapter.
