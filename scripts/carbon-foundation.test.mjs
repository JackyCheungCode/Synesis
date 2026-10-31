import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const styles = read('../src/styles.scss');
const foundation = read('../src/styles/carbon-foundation.scss');
const entry = read('../src/main.tsx');
const app = read('../src/App.tsx');
const navigation = read('../src/components/WorkspaceNavigation.tsx');
const collection = read('../src/features/settings/CollectionSettingsPage.tsx');
const research = read('../src/features/research/ResearchWizard.tsx');
const workflow = read('../.github/workflows/ci.yml');
const pkg = JSON.parse(read('../package.json'));
const vault = read('../src/features/settings/CredentialVault.tsx');

test('application styling uses Carbon semantic color tokens', () => {
  assert.doesNotMatch(styles, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(app, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(research, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(foundation, /var\(--cds-background\)/);
  assert.match(foundation, /var\(--cds-text-primary\)/);
  assert.match(foundation, /var\(--cds-interactive\)/);
});

test('application spacing declarations align to the 4px micro-grid', () => {
  const declaration = /\b((?:padding|margin)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;
  for (const match of styles.matchAll(declaration)) {
    for (const value of match[2].matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)) {
      const number = Number(value[1]);
      const pixels = value[2] === 'rem' ? number * 16 : number;
      assert.ok(pixels === 0 || pixels % 4 === 0, `Non-Carbon spacing in ${match[1]}: ${value[0]}`);
    }
  }
});

test('responsive foundation defines the 16/8/4 grid and reduced motion', () => {
  assert.match(foundation, /grid-template-columns:\s*repeat\(16,/);
  assert.match(foundation, /grid-template-columns:\s*repeat\(8,/);
  assert.match(foundation, /grid-template-columns:\s*repeat\(4,/);
  assert.match(foundation, /prefers-reduced-motion:\s*reduce/);
  assert.match(entry, /styles\/carbon-foundation\.scss/);
});

test('Carbon typography and code font families are loaded', () => {
  assert.match(styles, /IBM\+Plex\+Mono/);
  assert.match(foundation, /@include type\.type-style\('heading-03'\)/);
  assert.match(foundation, /@include type\.type-style\('heading-02'\)/);
});

test('workspace theme and navigation expose accessible state', () => {
  assert.match(app, /cds--\$\{theme\}/);
  assert.match(app, /aria-expanded=\{navExpanded\}/);
  assert.match(navigation, /aria-current=\{page === target \? 'page' : undefined\}/);
  assert.match(navigation, /<SideNav/);
  assert.match(navigation, /isPersistent=\{false\}/);
  assert.match(navigation, /onOverlayClick=\{onClose\}/);
});

test('custom selection and async controls expose selected and busy states', () => {
  assert.match(collection, /aria-pressed=\{settings\.itemsPerPlatform === count\}/);
  assert.match(vault, /busy\?:boolean/);
  assert.match(vault, /disabled=\{busy\|\|/);
  assert.match(research, /<ProgressIndicator/);
  assert.equal(pkg.dependencies['@carbon/charts-react'], '1.27.24');
  assert.match(app, /<LineChart/);
  assert.match(app, /<DonutChart/);
  assert.match(workflow, /IBM_TELEMETRY_DISABLED: 'true'/);
});
