# Synesis Carbon Design System

**Authority:** IBM Carbon Design System, official React implementation.

This directory is the source of truth for Synesis UI architecture, compliance, migration and acceptance.

## Normative documents

- [Carbon Foundation](./CARBON-FOUNDATION.md): official packages, theme, tokens, grid, typography and component policy.
- [Acceptance checklist](./ACCEPTANCE-CHECKLIST.md): page, component, accessibility, responsive and regression criteria.
- [Implementation roadmap](./IMPLEMENTATION-ROADMAP.md): controlled migration sequence and release gates.
- [Legacy allowlist](./LEGACY-ALLOWLIST.md): existing non-Carbon debt that must not expand.

## Official references

- https://carbondesignsystem.com/
- https://react.carbondesignsystem.com/
- https://github.com/carbon-design-system/carbon

## Compliance principle

Carbon compliance is proven by source imports, token usage, interaction behavior, accessibility tests, responsive behavior and visual review. Installing packages or making a page look similar is not sufficient.

## Version policy

Use the supported stable Carbon React release compatible with the repository's React and TypeScript versions. Pin compatible versions in the package manifest and commit the package lockfile in the Foundation implementation. Do not adopt prerelease APIs without explicit approval.
