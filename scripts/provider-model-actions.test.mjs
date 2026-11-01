import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const frontend=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const finder=readFileSync(new URL('../src/features/leads/ImportExportLeadsFinder.tsx',import.meta.url),'utf8');
const dynamicForm=readFileSync(new URL('../src/features/leads/DynamicActorForm.tsx',import.meta.url),'utf8');
const router=readFileSync(new URL('../src/lib/router.ts',import.meta.url),'utf8');
const backend=readFileSync(new URL('../supabase/functions/synesis-api/index.ts',import.meta.url),'utf8');
const nav=readFileSync(new URL('../src/components/WorkspaceNavigation.tsx',import.meta.url),'utf8');
const social=readFileSync(new URL('../src/features/leads/SocialLeadsFinder.tsx',import.meta.url),'utf8');
const globalLeads=readFileSync(new URL('../src/features/leads/GlobalLeads.tsx',import.meta.url),'utf8');
const socialMigration=readFileSync(new URL('../supabase/migrations/20261101023111_create_social_leads_and_global_customer_entities.sql',import.meta.url),'utf8');

test('API and AI credential configuration remains connected to encrypted backend actions',()=>{
 assert.match(frontend,/api\('credentials\.list'\)/);
 assert.match(frontend,/api\('credentials\.save'/);
 assert.match(frontend,/api\('models\.list'/);
 assert.match(frontend,/api\('models\.select'/);
 assert.match(frontend,/api\('connection\.test'/);
 assert.match(backend,/crypto\.subtle\.importKey\('raw', raw, 'AES-GCM'/);
 assert.match(backend,/synesis_store_credential/);
 assert.match(backend,/synesis_get_credential/);
});

test('all supported AI providers retain model catalogue adapters',()=>{
 for(const slug of ['openai','googlegemini','deepseek','anthropic','cloudflare','mistral','x']) assert.ok(backend.includes(`slug === '${slug}'`),`missing ${slug}`);
 assert.match(backend,/default_model:model/);
 assert.match(backend,/selected_model:config\.default_model/);
});

test('Apify integration credentials remain testable and server-side only',()=>{
 assert.match(backend,/kind === 'integration' && slug === 'apify'/);
 assert.match(backend,/https:\/\/api\.apify\.com\/v2\/users\/me/);
 assert.match(backend,/getCredential\('apify','integration'\)/);
});

test('Global Customer Discovery exposes trade leads, social leads, global leads and configuration routes',()=>{
 assert.match(router,/WorkspacePage = 'leads' \| 'social' \| 'global-leads' \| 'vault'/);
 assert.match(router,/return \{ page: 'leads' \}/);
 assert.match(nav,/全球客户发现/);
 assert.match(nav,/Import Export Leads Finder/);
 assert.match(nav,/Social Leads Finder/);
 assert.match(nav,/全球客户线索库/);
 assert.match(nav,/API 与 AI 配置/);
 assert.doesNotMatch(frontend,/ResearchWizard|WorkspaceDashboard|ProductLibrary|CollectionSettingsPage/);
});

test('lead intake captures trade, geography, company, shipment, contact, and buyer filters',()=>{
 for(const field of ['productKeywords','hsCodes','targetCountries','originCountries','shipmentDateFrom','shipmentDateTo','minShipments','minImportValue','maxImportValue','companyTypes','industries','knownImporters','knownSuppliers','destinationPorts','originPorts','excludeKeywords','employeeRange','requireEmail','requirePhone','requireWebsite','requireLinkedin','decisionMakerTitles','maxResults']) assert.ok(finder.includes(field),`missing criteria field ${field}`);
});

test('Actor recommendations are schema-aware and show unsupported criteria explicitly',()=>{
 assert.match(finder,/leads\.actors\.recommend/);
 assert.match(finder,/input_schema/);
 assert.match(finder,/supported_fields/);
 assert.match(finder,/unsupported_fields/);
 assert.match(finder,/DynamicActorForm/);
 assert.match(finder,/leads\.actor\.schema/);
 assert.match(finder,/高级模式：编辑原始 JSON/);
 assert.match(dynamicForm,/definition\.enum/);
 assert.match(dynamicForm,/definition\.minimum/);
 assert.match(dynamicForm,/definition\.items/);
 assert.match(dynamicForm,/definition\.description/);
 assert.ok(backend.includes("action === 'leads.actor.schema'"));
 assert.match(backend,/readActorInputSchema/);
 assert.match(backend,/actor-builds/);
 assert.doesNotMatch(backend,/\/v2\/acts\/[^'`]+\/input-schema/);
 assert.ok(backend.includes("action === 'leads.actor.schema'"));
 assert.match(backend,/schema_hash/);
 assert.match(backend,/crypto\.subtle\.digest/);
 assert.match(backend,/explicitMappings/);
 assert.match(backend,/supportedFields/);
 assert.match(backend,/unsupportedFields/);
});

test('Actor execution validates real input schema before starting a run',()=>{
 assert.match(backend,/function validateActorInput/);
 assert.match(backend,/缺少必填字段/);
 assert.match(backend,/不在 Actor 允许的枚举值内/);
 assert.match(backend,/action === 'leads\.run'/);
 assert.match(backend,/validateActorInput\(input,schema\)/);
 assert.match(backend,/\/runs\?waitForFinish=0/);
});

test('lead results retrieve run status and dataset items',()=>{
 assert.match(finder,/leads\.results/);
 assert.match(backend,/action === 'leads\.results'/);
 assert.match(backend,/actor-runs/);
 assert.match(backend,/datasets/);
 assert.match(backend,/run\.status==='SUCCEEDED'/);
});

test('Social Leads Finder requires explicit platform and Actor selection and persists task execution',()=>{
 assert.match(social,/const defaults:string\[\]=\[\]/);
 assert.doesNotMatch(social,/await loadSchema\(list\[0\]\)/);
 assert.match(social,/social\.project\.create/);
 assert.match(social,/social\.run/);
 assert.match(social,/social\.results/);
 assert.match(social,/social\.tasks\.list/);
 assert.ok(backend.includes("action === 'social.project.create'"));
 assert.ok(backend.includes("action === 'social.run'"));
 assert.ok(backend.includes("action === 'social.results'"));
});

test('global customer identity, source evidence and BYOK AI analysis are user-scoped',()=>{
 for(const table of ['social_discovery_projects','social_collection_tasks','social_collection_records','global_leads','global_lead_sources','global_lead_evidence']) assert.ok(socialMigration.includes('create table if not exists public.'+table),`missing table ${table}`);
 assert.match(socialMigration,/unique\(user_id, canonical_key\)/);
 assert.match(socialMigration,/enable row level security/);
 assert.ok(backend.includes("action === 'global.leads.list'"));
 assert.ok(backend.includes("action === 'global.leads.detail'"));
 assert.ok(backend.includes("action === 'social.ai.analyze'"));
 assert.match(globalLeads,/social\.ai\.analyze/);
 assert.match(globalLeads,/查看证据/);
});

test('legacy market research, collection task, and product API actions are retired',()=>{
 for(const action of ['research.parse','plans.generate','plans.approve','tasks.execute','tasks.sync','tasks.results','products.list','products.history']) assert.doesNotMatch(backend,new RegExp(`action === '${action.replace('.','\\.')}'`));
});
