# Synesis Carbon Acceptance Checklist

A page or component is not complete until applicable checks are evidenced. Mark each item PASS, FAIL, or NOT APPLICABLE with a reason.

## A. Foundation

- [ ] Official Carbon React, styles and icons packages are pinned to compatible stable versions.
- [ ] A committed lockfile makes installs reproducible.
- [ ] Carbon theme provider is centralized.
- [ ] Light and dark themes are implemented using Carbon themes.
- [ ] Carbon typography and semantic tokens are centralized.
- [ ] Carbon 2x Grid and spacing tokens are used.
- [ ] Shared Carbon component entry point is documented.
- [ ] Legacy component/token allowlist is current and shrinking.

## B. Pages and application shell

- [ ] Login
- [ ] Registration
- [ ] Global application shell
- [ ] Overlay navigation
- [ ] Import Export Leads Finder
- [ ] Social Leads Finder
- [ ] Global customer leads library
- [ ] API and AI credential settings

For every page:
- [ ] Uses Carbon components for all supported UI controls.
- [ ] Uses Carbon tokens; no new hardcoded UI colors or independent typography.
- [ ] Light theme verified.
- [ ] Dark theme verified.
- [ ] Loading, empty, success, error and disabled states verified where applicable.
- [ ] No horizontal overflow except intentional table/data overflow.
- [ ] No browser console errors or unexpected network failures.

## C. Component behavior

- [ ] Buttons expose correct labels, types and disabled states.
- [ ] Inputs have associated labels, helper text and validation.
- [ ] Dropdown, ComboBox and MultiSelect support keyboard selection.
- [ ] Tabs support expected keyboard navigation and ARIA relationships.
- [ ] Accordion disclosure state is announced correctly.
- [ ] Modal traps focus, closes appropriately and restores focus.
- [ ] Notifications announce status without stealing focus.
- [ ] Tables expose correct headers and accessible relationships.
- [ ] Charts have accessible summaries or equivalent data tables.

## D. Responsive verification

Test at 320, 375, 768, 1024 and 1440 CSS pixels, plus a wide desktop viewport.

- [ ] Navigation remains usable and overlays content as designed.
- [ ] Forms reflow without clipped controls.
- [ ] Tables remain readable and scroll intentionally.
- [ ] Dialogs fit within the viewport.
- [ ] MultiSelect menus and popovers remain within viewport.
- [ ] No unintended page-level horizontal scrolling.

## E. Accessibility

- [ ] Automated axe scan has no unresolved critical or serious violations.
- [ ] Keyboard-only walkthrough completed.
- [ ] Focus visibility and order verified.
- [ ] Screen-reader names and announcements reviewed.
- [ ] Contrast checked in both themes.
- [ ] Reduced-motion preference respected.
- [ ] WCAG 2.2 AA exceptions documented and approved.

## F. Business regression

- [ ] Authentication and session behavior unchanged.
- [ ] Apify Actor discovery and schema retrieval unchanged.
- [ ] Actor input validation and execution unchanged.
- [ ] Import/export lead results still load.
- [ ] Social collection tasks and results still load.
- [ ] Global leads list, details and evidence still load.
- [ ] AI provider selection and invocation unchanged.
- [ ] BYOK credentials remain encrypted server-side.
- [ ] Credentials are never exposed in browser storage, logs or client bundles.
- [ ] Existing Supabase row ownership and RLS expectations remain intact.

## G. Evidence required

For each page, record:
- Route and commit SHA.
- Before/after screenshots for both themes.
- Tested viewport sizes.
- Test command and result.
- Accessibility scan result.
- Manual keyboard test result.
- Business regression result.
- Known limitations and approved exceptions.

## H. Release gate

- [ ] Required CI checks pass.
- [ ] Preview environment reviewed.
- [ ] Owner approves merge/release.
- [ ] Production deployment is explicitly authorized.
- [ ] Deployment result and health check recorded.
