import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const rootFile = (path) => new URL(path, import.meta.url);

test('repository contains the mandatory Carbon engineering policy', () => {
  const policy = read('../AGENTS.md');
  for (const phrase of [
    'IBM Carbon Design System',
    '@carbon/react',
    '@carbon/styles',
    '@carbon/icons-react',
    'WCAG 2.2 AA',
    'Production deployment must be an explicit',
    'docs/design-system/LEGACY-ALLOWLIST.md',
  ]) assert.ok(policy.includes(phrase), `AGENTS.md must contain: ${phrase}`);
});

test('Carbon foundation, acceptance and migration documents exist', () => {
  for (const path of [
    '../docs/design-system/README.md',
    '../docs/design-system/CARBON-FOUNDATION.md',
    '../docs/design-system/ACCEPTANCE-CHECKLIST.md',
    '../docs/design-system/IMPLEMENTATION-ROADMAP.md',
    '../docs/design-system/LEGACY-ALLOWLIST.md',
  ]) assert.ok(existsSync(rootFile(path)), `Missing required policy file: ${path}`);
});

test('Carbon is the only permitted UI framework in package dependencies', () => {
  const pkg = JSON.parse(read('../package.json'));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const prohibited = [
    /^@mui\//, /^@chakra-ui\//, /^@mantine\//, /^antd$/,
    /^semantic-ui-react$/, /^primereact$/, /^@fluentui\//,
    /^lucide-react$/, /^react-icons$/, /^@heroicons\//,
    /^@fortawesome\//,
  ];
  for (const name of Object.keys(dependencies)) {
    assert.equal(prohibited.some((pattern) => pattern.test(name)), false,
      `Unapproved UI/icon dependency: ${name}`);
  }
});

test('CI exposes the Carbon compliance test and has a manual production release gate', () => {
  const pkg = JSON.parse(read('../package.json'));
  assert.ok(pkg.scripts['test:carbon-compliance'], 'Missing test:carbon-compliance script');
  const workflow = read('../.github/workflows/ci.yml');
  assert.match(workflow, /Carbon compliance/);
  assert.match(workflow, /environment:\s*production/);
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /inputs\.deploy_production\s*==\s*true/);
  assert.doesNotMatch(workflow, /if:\s*github\.ref\s*==\s*'refs\/heads\/develop'/,
    'Production deploy must not run automatically on develop pushes');
});

test('new source additions cannot extend the registered legacy patterns', () => {
  let diff = '';
  try {
    diff = execFileSync('git', [
      'diff', '--no-ext-diff', '--unified=0', '--diff-filter=ACMR',
      'origin/develop...HEAD', '--', 'src',
    ], { encoding: 'utf8' });
  } catch {
    try {
      diff = execFileSync('git', [
        'diff', '--no-ext-diff', '--unified=0', 'HEAD^..HEAD', '--', 'src',
      ], { encoding: 'utf8' });
    } catch {
      diff = '';
    }
  }
  const added = diff.split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
  const rules = [
    { name: 'legacy Synesis design tokens', pattern: /--sn-[a-z0-9_-]+\s*:/i },
    { name: 'hardcoded UI color', pattern: /(?:^|[;{\s])(?:color|background(?:-color)?|border-color)\s*:\s*(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/i },
    { name: 'independent UI font family', pattern: /font-family\s*:\s*[^;]*(?:DM Sans|Manrope|Inter|Roboto)/i },
    { name: 'legacy foundational component import', pattern: /from\s+['"][^'"]*(?:components\/ui|components\/icons)['"]/i },
  ];
  for (const line of added) {
    for (const rule of rules) {
      assert.equal(rule.pattern.test(line), false,
        `New source line introduces ${rule.name}: ${line}`);
    }
  }
});
