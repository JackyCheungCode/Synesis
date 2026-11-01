# Carbon Migration Legacy Allowlist

This is a temporary debt register, not a permission to extend existing patterns.

## Known legacy areas at the develop baseline

| Area | Current state | Required disposition |
|---|---|---|
| `src/components/ui.tsx` | Custom foundational React controls and layout wrappers | Replace usages with official Carbon components; remove wrappers when unused |
| `src/components/icons.tsx` | Hand-maintained icon exports | Replace with Carbon Icons |
| `src/components/BrandIcon.tsx` | Brand-specific icon rendering | Review whether domain logos are needed; keep only documented non-control brand marks |
| `src/styles.scss` | Page-level styles include custom colors, controls and layout | Migrate page styles to Carbon tokens and component composition |
| `src/styles/synesis-design.scss` | Independent typography, colors, spacing, radii and shadows | Retire in favor of Carbon theme and tokens |
| Existing feature TSX files | Some pages render native controls and custom visual patterns | Migrate page by page; do not expand legacy usage |
| `src/features/leads/MultiSelect.tsx` | Custom listbox behavior with incomplete keyboard coverage | Replace with Carbon MultiSelect or document a justified domain-specific composition |

## Rules

- No new entries without owner approval.
- Existing code may be touched to migrate away from legacy patterns.
- Do not copy legacy styles or components into new files.
- Each entry must be removed or narrowed after its migration is verified.
- The strict compliance gate is enabled after Phase 1 establishes the Carbon entry points and Phase 2 completes page migration.
