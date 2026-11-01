# Synesis Carbon Foundation Standard

## 1. Authority and packages

IBM Carbon is the only UI design system for Synesis. The implementation must use:

- `@carbon/react` for official React components.
- `@carbon/styles` for Sass styles, themes and design tokens.
- `@carbon/icons-react` for product interface icons.

Use the stable supported release compatible with React 19, Vite 8 and the project's Sass toolchain. Verify peer dependencies before pinning versions. Commit a reproducible lockfile as part of Foundation work.

## 2. Theme architecture

- Centralize the theme provider and theme selection in the application shell.
- Support Carbon White (light) and Carbon G90 or G100 (dark), selecting the dark variant based on contrast and content requirements during visual validation.
- All page surfaces, tables, forms, overlays, charts and navigation must consume the active Carbon theme.
- Persist only the user's non-sensitive theme preference using the approved application preference mechanism.
- Never define parallel light/dark color palettes in page styles.

## 3. Design tokens

Use semantic Carbon tokens for:
- Text, links, icons and support colors.
- Background, layer, layer accent and field surfaces.
- Borders and focus indicators.
- Spacing and layout.
- Typography and type hierarchy.
- Motion and transitions.

Do not introduce hardcoded hex/RGB/HSL colors, bespoke font families, independent radius scales, shadow scales, or `--sn-*` design tokens for new UI. Product-specific data visualization may define data-series mappings only when colors are sourced from approved theme tokens and remain accessible.

## 4. Typography

Use the official Carbon type system and IBM Plex Sans through the official style package. Do not introduce DM Sans, Manrope, or other independent UI font families. Monospace is allowed only for code, JSON, identifiers, and technical payloads where semantically appropriate.

## 5. Layout and grid

- Use Carbon 2x Grid and responsive breakpoints.
- Use Carbon spacing tokens rather than arbitrary margins and gaps.
- Preserve a high-density workspace layout without excessive horizontal gutters.
- The navigation drawer must overlay content rather than permanently compressing the workspace.
- Data tables must remain readable and provide intentional horizontal overflow on narrow viewports.
- Forms must use consistent field grouping, labels, helper text and validation.

## 6. Component selection

| Need | Preferred Carbon component |
|---|---|
| Application header/navigation | Header, HeaderMenuButton, SideNav, SideNavItems, SideNavLink |
| Main content | Content |
| Layout | Grid, Column, Stack, FlexGrid where appropriate |
| Actions | Button, IconButton |
| Text/password/number | TextInput, PasswordInput, NumberInput |
| Multiline | TextArea |
| Selection | Dropdown, ComboBox, MultiSelect, Checkbox, RadioButton |
| Date | DatePicker |
| Data | DataTable, Table, Pagination |
| Status | Tag, InlineNotification, ToastNotification |
| Progress/loading | ProgressIndicator, ProgressBar, Loading |
| Overlay | Modal, ComposedModal, Popover, Tooltip |
| Navigation within page | Tabs, Breadcrumb |
| Disclosure | Accordion |
| Charts | Existing charting capability only when Carbon-compatible theming and accessible alternatives are provided |

Use the exact exports supported by the pinned Carbon package version; do not rely on guessed component names or props.

## 7. Business composition

Actor schema forms, import/export discovery, social collection, global customer records and credential management are business-specific workflows. They may have domain-specific composition and state, but their interactive controls must be Carbon components. Do not alter Apify request schemas, Supabase action contracts, authentication, encryption, credential ownership or BYOK semantics as part of visual work.

## 8. Icons and assets

Use Carbon Icons for controls and product navigation. Decorative illustrations and charts must not replace meaningful text or accessible labels. Do not add Lucide, Heroicons, Font Awesome, or a second icon pack.

## 9. Accessibility

Target WCAG 2.2 AA. Verify:
- Keyboard-only operation and logical tab order.
- Visible focus and correct focus restoration.
- Accessible labels, descriptions and error associations.
- Dialog focus containment and Escape behavior.
- Table headers and row/column relationships.
- Status announcements and loading feedback.
- Contrast in both themes.
- Reduced-motion behavior.
- Screen-reader names for icon-only actions.

## 10. Exceptions

An exception requires written approval and an entry in the legacy allowlist with owner, reason, scope, and removal condition. Temporary exceptions must not become reusable design patterns.
