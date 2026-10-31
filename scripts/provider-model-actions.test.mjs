import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../supabase/functions/synesis-api/index.ts', import.meta.url), 'utf8');

test('frontend model discovery and selection actions have backend handlers', () => {
  assert.match(frontend, /api\('models\.list',\s*\{\s*slug\s*\}\)/);
  assert.match(frontend, /api\('models\.select',\s*\{\s*slug,\s*model\s*\}\)/);
  assert.match(backend, /action === 'models\.list'/);
  assert.match(backend, /action === 'models\.select'/);
});

test('model discovery uses the encrypted BYOK credential retrieval path', () => {
  assert.match(backend, /getCredential\(slug,'provider'\)/);
  assert.match(backend, /decryptSecret\(secret\.ciphertext, secret\.nonce\)/);
  assert.match(backend, /crypto\.subtle\.importKey\('raw', raw, 'AES-GCM'/);
  assert.match(backend, /key_last4:apiKey\.slice\(-4\)/);
});

test('all configured providers have model catalogue adapters', () => {
  for (const slug of ['openai','googlegemini','deepseek','anthropic','cloudflare','mistral','x']) {
    assert.ok(backend.includes(`slug === '${slug}'`), `missing adapter for ${slug}`);
  }
  assert.match(backend, /default_model:model/);
  assert.match(backend, /selected_model:config\.default_model/);
});

test('model catalogue errors do not return provider secrets', () => {
  const branch = backend.slice(backend.indexOf("if (action === 'models.list')"), backend.indexOf("if (action === 'models.select')"));
  assert.doesNotMatch(branch, /return json\(\{[^}]*clear/);
  assert.doesNotMatch(branch, /return json\(\{[^}]*apiKey/);
});

test('Cloudflare Workers AI model namespaces remain path segments', () => {
  assert.match(backend, /function cloudflareModelPath\(value: string\)/);
  assert.match(backend, /segments\.map\(segment => encodeURIComponent\(segment\).*join\('\/'\)/);
  assert.equal((backend.match(/cloudflareModelPath\(model \|\| '@cf\/meta\/llama-3\.3-70b-instruct'\)/g) ?? []).length, 2);
  assert.doesNotMatch(backend, /encodeURIComponent\(config\.default_model \|\| '@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast'\)/);
});


test('research plan prompt passes discovered Apify candidates using the declared variable', () => {
  const planBranch = backend.slice(backend.indexOf("if (action === 'plans.generate')"), backend.indexOf("if (action === 'plans.approve')"));
  assert.match(planBranch, /const actorCandidates\s*=\[\.\.\.actorMap\.values\(\)\]/);
  assert.match(planBranch, /JSON\.stringify\(\{project,\s*actor_candidates:\s*actorCandidates\}\)/);
  assert.doesNotMatch(planBranch, /JSON\.stringify\(\{project,\s*actor_candidates\s*\}\)/);
});


test('Amazon plans populate required product URL arrays from research keywords', () => {
  const planBranch = backend.slice(backend.indexOf("if (action === 'plans.generate')"), backend.indexOf("if (action === 'plans.approve')"));
  assert.match(planBranch, /researchKeywords/);
  assert.match(planBranch, /https:\/\/www\.amazon\.com\/s\?k=/);
  assert.match(planBranch, /必填数组字段/);
  assert.match(planBranch, /categoryOrProductUrls/);
});

test('queued collection tasks start Apify before result synchronization', () => {
  assert.match(frontend, /task\.status==='queued'&&!task\.external_run_id/);
  assert.match(frontend, /api\('tasks\.execute',\{taskId:task\.id\}\)/);
  assert.match(frontend, /task\.status==='running'&&Boolean\(task\.external_run_id\)/);
});
