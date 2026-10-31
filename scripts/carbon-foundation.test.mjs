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
  assert.match(foundation, /var\(--cds-border-interactive\)/);
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
  assert.doesNotMatch(styles + foundation, /Noto Sans TC/);
  assert.match(foundation, /@include type\.type-style\('heading-03'\)/);
  assert.match(foundation, /@include type\.type-style\('heading-02'\)/);
});

test('workspace theme and navigation expose accessible state', () => {
  assert.match(app, /cds--\$\{theme\}/);
  assert.match(app, /aria-expanded=\{navExpanded\}/);
  assert.match(navigation, /aria-current=\{page === target \? 'page' : undefined\}/);
  assert.match(navigation, /<SideNav/);
  assert.match(navigation, /isPersistent=\{false\}/);
  assert.match(navigation, /onOverlayClick=\{closeAndFocusTrigger\}/);
  assert.match(navigation, /onToggle=/);
  assert.match(app, /main-content/);
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


test('Carbon shell provides a first-focus skip link with a visible focus state', () => {
  const skipIndex = app.indexOf('className="synesis-skip-link"');
  const menuIndex = app.indexOf('<HeaderMenuButton');
  assert.ok(skipIndex >= 0 && menuIndex > skipIndex, 'Skip link must precede the header menu trigger');
  assert.match(app, /href="#main-content"/);
  assert.match(app, /document\.getElementById\('main-content'\)\?\.focus\(\)/);
  assert.match(foundation, /\.synesis-skip-link:focus-visible/);
  assert.match(foundation, /transform: translateY\(-150%\)/);
});


test('Carbon UI shell uses official background, selection, and icon tokens', () => {
  assert.match(foundation, /\.cds--header\s*\{[\s\S]*?background: var\(--cds-background\)/);
  assert.match(foundation, /\.synesis-carbon-side-nav \.cds--side-nav__navigation\s*\{[\s\S]*?background: var\(--cds-background\)/);
  assert.match(foundation, /background: var\(--cds-background-selected\)/);
  assert.match(foundation, /border-left: 4px solid var\(--cds-border-interactive\)/);
  assert.match(foundation, /var\(--cds-icon-secondary\)/);
  assert.match(styles, /fill: var\(--cds-icon-secondary\)/);
  assert.match(styles, /fill: var\(--cds-icon-primary\)/);
  assert.match(foundation, /var\(--cds-background-hover\)/);
});


test('Carbon SideNav keeps Carbon stacking defaults and has no dead overlay layer', () => {
  assert.doesNotMatch(styles, /nav-dismiss-overlay/);
  assert.doesNotMatch(styles, /\.synesis-app \.cds--side-nav\s*\{[^}]*z-index/);
  assert.doesNotMatch(foundation, /\.synesis-carbon-side-nav\s*\{[^}]*z-index/);
});

test('Dashboard uses semantic metric descriptions and a responsive ordered workflow', () => {
  const dashboard = read('../src/features/dashboard/WorkspaceDashboard.tsx');
  assert.match(dashboard, /aria-label="工作空间关键指标"/);
  assert.match(dashboard, /<dl>/);
  assert.match(dashboard, /<dt className="dashboard-metric-label">/);
  assert.match(dashboard, /<ol className="dashboard-workflow-steps">/);
  assert.match(dashboard, /projectCount === 0/);
  assert.match(dashboard, /role="status"/);
  assert.match(dashboard, /开始新研究/);
  assert.doesNotMatch(dashboard, /<Tag/);
  assert.match(foundation, /\.dashboard-metrics\s*\{[\s\S]*?grid-template-columns: repeat\(4,/);
  assert.match(foundation, /\.dashboard-workflow-steps\s*\{[\s\S]*?grid-template-columns: repeat\(5,/);
  assert.match(foundation, /dashboard-workflow-heading \.cds--btn/);
});


test('LAY-01 centralizes page gutters, grid tracks, and responsive card columns', () => {
  assert.match(foundation, /--synesis-page-gutter:\s*32px/);
  assert.match(foundation, /--synesis-page-gutter:\s*24px/);
  assert.match(foundation, /--synesis-page-gutter:\s*1rem/);
  assert.match(foundation, /max-width:\s*1376px/);
  assert.match(foundation, /--synesis-grid-gap:\s*var\(--cds-spacing-05\)/);
  assert.match(foundation, /\.product-grid/);
  assert.match(foundation, /\.project-card-grid/);
  assert.match(foundation, /\.analytics-kpis,.research-analytics-kpis\) > \* \{ grid-column: span 2; \}/);
  assert.doesNotMatch(styles, /\.page-wrap\s*\{[^}]*!important/);
  assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(2,[^;]*!important/);
});

test('LAY-02 consolidates Research intake layout rules into one responsive section', () => {
  const intakeStart = styles.indexOf('/* Research intake — single source of truth for the requirements page */');
  const platformStart = styles.indexOf('/* Research platform picker');
  assert.ok(intakeStart >= 0 && platformStart > intakeStart);
  const intake = styles.slice(intakeStart, platformStart);
  assert.equal((intake.match(/\.synesis-app \.research-intake-actions\s*\{/g) ?? []).length, 4);
  assert.equal((intake.match(/\.synesis-app \.research-fluid-grid\s*\{/g) ?? []).length, 2);
  assert.equal((intake.match(/\.synesis-app \.research-price-range\s*\{/g) ?? []).length, 2);
  assert.match(intake, /@media \(max-width: 672px\)[\s\S]*?\.research-fluid-grid \{/);
  assert.match(intake, /position:\s*static/);
  assert.doesNotMatch(intake, /position:\s*(?:sticky|fixed)/);
  assert.match(intake, /\.research-country-field[\s\S]*?display: none !important/);
  assert.match(intake, /\.research-country-map/);
  assert.doesNotMatch(styles, /research-intake-sticky-footer/);
});

test('LAY-03 uses one responsive Carbon five-step progress system and one action layout', () => {
  assert.match(research, /className="research-progress-scroll" role="region" aria-label="研究流程步骤，可横向滚动查看" tabIndex=\{0\}/);
  assert.match(research, /className="research-progress-status" role="status" aria-live="polite"/);
  assert.match(research, /className="research-progress-scroll-hint"/);
  assert.match(styles, /\/\* LAY-03: canonical five-step Carbon progress indicator and workflow actions \*\//);
  assert.match(styles, /\.research-carbon-progress \.cds--progress-step\s*\{/);
  assert.match(styles, /\.research-carbon-progress \.cds--progress-step__label\s*\{/);
  assert.match(styles, /\.research-progress-scroll\s*\{[\s\S]*?overflow-x:auto/);
  assert.match(styles, /\.research-carbon-progress\s*\{[\s\S]*?min-width:560px/);
  assert.match(styles, /\.research-workflow-actions:not\(\.research-intake-actions\)\s*\{/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(styles, /\.research-stepper/);
  assert.doesNotMatch(styles, /\.research-step\s*\{/);
  assert.doesNotMatch(styles, /\.research-step-footer\s*\{/);
  assert.doesNotMatch(styles, /research-workflow-actions[^}]*position:\s*(?:sticky|fixed)/);
});


test('ResearchWizard keeps hooks before conditional returns and isolates render failures', () => {
 const start=research.indexOf('function ResearchWizardContent(props:Props)');
 const end=research.indexOf('class ResearchWizardErrorBoundary',start);
 const component=research.slice(start,end);
 const early=component.indexOf("if(!project||project.scope?.workflow_state==='draft')");
 assert.ok(early>0);
 assert.doesNotMatch(component.slice(early),/React\\.use(?:State|Effect|Memo|Callback|Ref)\\(/);
 assert.match(research,/class ResearchWizardErrorBoundary extends React\\.Component/);
 assert.match(research,/页面遇到异常，但你的研究记录不会因此被删除/);
});

test('workspace headings are concise and page canvas uses available width', () => {
 assert.match(app,/const pageDescription: Record<Page,string>/);
 assert.doesNotMatch(app,/全球商业数据 · 跨平台情报 · AI 驱动研究/);
 assert.doesNotMatch(app,/个人工作空间/);
 assert.match(foundation,/\\.page-wrap/);
 assert.match(foundation,/max-width: none/);
});
