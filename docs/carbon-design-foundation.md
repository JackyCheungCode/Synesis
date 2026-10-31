# Synesis Carbon Design Foundation

This document is the implementation contract for the Synesis interface. New pages and controls must follow these rules rather than introducing a second design system.

## Source of truth

- Component library: IBM Carbon React v11 (@carbon/react).
- Data visualization: Carbon Charts React (@carbon/charts-react).
- Foundation styles: src/styles/carbon-foundation.scss.
- Existing feature styles: src/styles.scss; feature-specific declarations may refine layout but must not reintroduce raw colors, off-grid spacing, or competing component geometry.
- Regression checks: npm run test:carbon-foundation.

## Grid and layout

Use the Carbon 2x Grid as the shared layout model:

| Viewport | Columns | Intended use |
|---|---:|---|
| Desktop | 16 | Full workspace canvas |
| Tablet | 8 | Two-column module composition |
| Mobile | 4 | Single-column forms and compact content |

The workspace canvas is full width. Use a 16-column base and compose modules in 4- or 8-column spans. Data tables may use a contained horizontal scroll region; the page itself must not overflow horizontally.

Breakpoints are implementation values, not permission to create separate page designs. At 672px and below, forms and dense modules collapse to one column. At 380px and below, card grids must not be forced into two columns.

## Spacing

- Use Carbon spacing tokens for new styles: --cds-spacing-*.
- The application stylesheet's spacing declarations use the 4px micro-grid; 8px increments are preferred for major rhythm.
- 1px is reserved for borders and hairlines, not layout spacing.
- Avoid one-off margins and paddings. Adjust the shared layout class instead of compensating on an individual page.

## Color and themes

- Only Carbon semantic tokens may define UI colors.
- Use --cds-background, --cds-layer-*, --cds-text-*, --cds-border-*, --cds-interactive, --cds-focus, and --cds-support-* according to role.
- Use Carbon Charts palettes for data visualizations; do not hand-author unrelated color arrays.
- Never hardcode HEX/RGB accent colors in feature CSS or JSX.
- The root application supports Carbon White and Gray 100 themes. Components must inherit theme tokens; do not force a white background inside a themed surface.

## Typography

- IBM Plex Sans is the primary interface family.
- IBM Plex Mono is reserved for code, JSON, logs, and identifiers.
- Noto Sans TC is the CJK fallback.
- Use Carbon type styles for headings, body text, labels, helper text, and code. Do not invent a parallel type scale.
- Display typography at 42px and above uses Light 300.

## Geometry and depth

- Use square geometry for application controls, tiles, cards, fields, menus, and modal surfaces.
- Circular shapes are allowed only when they express a semantic visual form, such as a map marker, country flag crop, or Carbon progress step.
- Prefer layer tokens and 1px borders over decorative shadows.
- Do not add gradients, ornamental borders, or non-semantic color treatments.

## Shell and navigation

- The Carbon Header is the persistent application shell.
- The single root navigation group opens as an overlay and does not resize or push the content canvas.
- Navigation destinations are links; commands are buttons.
- The active destination exposes aria-current="page".
- The open menu exposes expanded state from the Header trigger, supports Escape, moves focus into the menu, and returns focus to the trigger when closed.
- The content area remains full width with a consistent page gutter.

## Component and interaction rules

- Prefer Carbon React components over custom controls.
- Use Progress Indicator for ordered multi-step workflows; use Tabs only for related peer content in the same context.
- Form controls require visible labels; placeholders are examples, never labels.
- Single-choice state must be represented semantically (radio group or aria-pressed), not by color alone.
- Async actions must expose loading/busy and disabled states.
- Read-only, error, warning, empty, and selected states must be designed before a control is considered complete.
- Use Carbon Charts for charts. If a custom data visualization is unavoidable, provide equivalent tabular or textual information.

## Accessibility and responsive behavior

- All actions must be keyboard reachable and have a visible focus indicator.
- Icon-only controls require accessible names and tooltips.
- Use semantic landmarks, correct heading order, table header scopes, and ARIA state only where native semantics are insufficient.
- Do not truncate information without a keyboard-accessible way to reveal the complete value. Prefer wrapping for labels and data values.
- Text contrast must meet WCAG AA (4.5:1 for normal text); meaningful non-text controls and indicators must meet 3:1.
- Respect prefers-reduced-motion.
- Test the same workflows at 320px, 380px, 672px, tablet, and desktop widths.

## Pull request / change checklist

- [ ] Uses Carbon React or Carbon Charts for the appropriate control.
- [ ] Uses semantic Carbon tokens; no hardcoded color values.
- [ ] Uses 4px micro-grid spacing and the shared 16/8/4 grid.
- [ ] Supports White and Gray 100 themes.
- [ ] Defines hover, focus, selected, disabled, read-only, error, warning, loading, and empty states as applicable.
- [ ] Keyboard-only operation and focus return are verified.
- [ ] Long labels and narrow viewports do not lose information.
- [ ] npm run test:carbon-foundation and npm run build pass.
