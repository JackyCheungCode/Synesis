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
  assert.equal((backend.match(/cloudflareModelPath\(config\.default_model \|\| '@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast'/g) ?? []).length, 2);
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
  assert.match(backend, /必填数组字段/);
  assert.match(planBranch, /categoryOrProductUrls/);
});

test('queued collection tasks start Apify before result synchronization', () => {
  assert.match(frontend, /task\.status==='queued'&&!task\.external_run_id/);
  assert.match(frontend, /api\('tasks\.execute',\{taskId:task\.id\}\)/);
  assert.match(frontend, /task\.status==='running'&&Boolean\(task\.external_run_id\)/);
});


test('research intake extracts JSON from fenced or prose-wrapped model output', () => {
  assert.match(backend, /function parseJsonObject\(raw: string\)/);
  assert.match(backend, /Find the first balanced JSON object/);
  assert.match(backend, /parseJsonObject\(first\.raw\)/);
});

test('research intake retries malformed JSON through the selected provider', () => {
  const branch = backend.slice(backend.indexOf("if (action === 'research.parse')"), backend.indexOf("if (action === 'plans.generate')"));
  assert.match(branch, /async function requestResearchText/);
  assert.match(branch, /const repaired=await requestResearchText\(repairPrompt\)/);
  assert.match(branch, /max_tokens:8000/);
  assert.match(branch, /generationConfig:\{responseMimeType:'application\/json',maxOutputTokens:8000\}/);
  assert.match(branch, /selectedModel=model/);
  assert.match(branch, /缺少 dimensions 数组/);
});


test('Apify plan generation extracts and repairs malformed Cloudflare JSON', () => {
  const planBranch = backend.slice(backend.indexOf("if (action === 'plans.generate')"), backend.indexOf("if (action === 'plans.approve')"));
  assert.match(planBranch, /parseJsonObject\(raw\)/);
  assert.match(planBranch, /Repair the model output into one complete valid JSON object/);
  assert.match(planBranch, /repairResponse=await fetch/);
  assert.match(planBranch, /cloudflareModelPath\(cloudflareModel\)/);
  assert.match(planBranch, /max_tokens:8000/);
  assert.match(planBranch, /缺少 research_questions、platform_tasks 或 deliverables 数组/);
});


test('Amazon Apify inputs normalize cutoff dates and product URLs', () => {
  assert.match(backend, /cutoffPattern\.test\('1 year'\)/);
  assert.match(backend, /已移除不符合 Actor URL 规范的 productUrls 条目/);
  assert.match(backend, /Amazon 搜索入口补齐 URL/);
  assert.match(backend, /definition\.items\.pattern/);
  assert.match(backend, /reviewsCutoffDate/);
});


test('Amazon queued task execution sanitizes legacy categoryOrProductUrls before Apify run', () => {
  const executeBranch = backend.slice(backend.indexOf("if (action === 'tasks.execute')"), backend.indexOf("if (action === 'tasks.sync')"));
  assert.match(executeBranch, /amazonUrlFields=\['categoryOrProductUrls','productUrls','startUrls','urls'\]/);
  assert.match(executeBranch, /executionInput\[field\]=keywords\.length\?/);
  assert.match(executeBranch, /https:\/\/www\.amazon\.com\//);
  assert.match(executeBranch, /body:JSON\.stringify\(executionInput\)/);
  assert.match(executeBranch, /executionInput\.reviewsCutoffDate='1 year'/);
});
