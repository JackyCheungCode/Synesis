# Synesis Design System — Modern Trade Intelligence Workbench

## Approved direction
- Direction A: modern business intelligence workbench.
- Default theme: Light; Dark theme available.
- Information density: Balanced.
- Page headings are left-aligned; no centered page titles.
- Deep navy overlay navigation; it does not permanently consume workspace width.
- Soft neutral canvas, white surfaces, restrained borders and shadows, moderate corner radius.
- Electric blue for primary actions; teal, amber and red reserved for meaningful data states.
- DM Sans for interface; IBM Plex Mono for identifiers and raw data.
- Preserve existing business logic, database schema, API contracts and encrypted BYOK credential flow.

## Five implementation layers
1. Global Shell: header, overlay navigation, workspace canvas and theme preference.
2. Page layouts: task-oriented hierarchy, aligned title/content/action regions and balanced grids.
3. Components: consistent buttons, inputs, cards, tables, filters, charts, dialogs and drawers.
4. Interaction states: loading, empty, error, success, disabled and busy with useful feedback.
5. Accessibility: visible focus, keyboard reachability, labels, status announcements, focus restoration and responsive zoom.

## Page inventory
| Page | Main task | Status |
|---|---|---|
| Intelligence overview | Monitor key metrics and start research | First visual pass |
| Research project center | Define research, choose sources, collect, analyze and report | Dedicated layout and wizard regression pending |
| Standardized product library | Search products and inspect price history | First visual pass |
| Collection settings | Configure collection defaults | First visual pass |
| AI model & Key Vault | Manage BYOK credentials and provider connections | First visual pass |
| Authentication | Secure sign-in and registration | First visual pass |

## Acceptance
- Source implementation and commit: recorded in Git.
- CI must pass before deployment.
- Verify Cloudflare Worker version and traffic allocation after deployment.
- Browser screenshots and keyboard testing are still required; no browser pass is claimed.
- Research wizard regression project `0510ceeb-2942-4aec-af0c-949bc499f371` must be tested without deletion or recreation.
