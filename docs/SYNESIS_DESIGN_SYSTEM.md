# Synesis Design System — Modern Trade Intelligence Workbench

## Approved direction
Direction A · Light default · Dark supported · Balanced density. Synesis is a cross-border market intelligence workspace. Page titles are left aligned; navigation is deep-navy overlay; workspace surfaces use a neutral canvas, white panels, restrained borders and moderate radius. Electric blue is reserved for primary actions, with teal/amber/red for meaningful data states. DM Sans is the interface face; IBM Plex Mono is reserved for identifiers and raw data.

## Five-layer implementation
1. Global Shell — header, overlay navigation, workspace canvas, theme preference and skip navigation.
2. Page layouts — left-aligned title, task-first content, consistent spacing and responsive grids.
3. Components — cards, inputs, buttons, tables, filters, notifications, dialogs and progress.
4. Interaction states — loading, empty, error, success, disabled and busy feedback.
5. Accessibility — visible focus, labels, keyboard reachability, live status, focus restoration and reduced motion.

## Page inventory
| Area | Implementation |
|---|---|
| Global shell | Navy header, overlay navigation, light/dark theme tokens, skip link |
| Intelligence overview | Welcome task panel, four KPIs, empty state, five-stage workflow |
| Research workspace | Five-step workflow, intake accordion, profile confirmation, source tasks, result tables and analytics styled in new visual language |
| Product library | Search toolbar, product cards, price-history table and pagination |
| Collection settings | Defaults, record-count presets, depth choices, save action |
| AI model & Key Vault | Provider and integration cards, encrypted credential workflow, default model routing |
| Authentication | Existing authentication flow styled through Synesis surfaces |

## Acceptance
CI and deployment must pass before marking deployed. Real browser visual, responsive and keyboard verification remains pending. Research wizard regression ID `0510ceeb-2942-4aec-af0c-949bc499f371` remains a required browser test; preserve the record.
