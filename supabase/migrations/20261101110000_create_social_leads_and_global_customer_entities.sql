-- Social Leads Finder and unified global lead identity/evidence foundation
create table if not exists public.social_discovery_projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, objective text not null default 'buyer_and_business_discovery',
  criteria jsonb not null default '{}'::jsonb, platform_slugs text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','paused','completed','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists social_discovery_projects_user_updated_idx on public.social_discovery_projects(user_id, updated_at desc);
create table if not exists public.social_collection_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.social_discovery_projects(id) on delete cascade,
  platform_slug text not null, actor_id text not null, actor_title text, input jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  external_run_id text, dataset_id text, result_count integer not null default 0 check (result_count >= 0),
  error_message text, started_at timestamptz, finished_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists social_collection_tasks_project_created_idx on public.social_collection_tasks(project_id, created_at desc);
create index if not exists social_collection_tasks_user_status_idx on public.social_collection_tasks(user_id, status, created_at desc);
create unique index if not exists social_collection_tasks_run_id_uidx on public.social_collection_tasks(user_id, external_run_id) where external_run_id is not null;
create table if not exists public.social_collection_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.social_collection_tasks(id) on delete cascade,
  item_index integer not null check (item_index >= 0), external_record_key text, source_url text,
  raw_data jsonb not null, collected_at timestamptz not null default now(), unique(task_id, item_index)
);
create index if not exists social_collection_records_user_task_idx on public.social_collection_records(user_id, task_id, item_index);
create table if not exists public.global_leads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  customer_type text not null default 'unknown' check (customer_type in ('company','person','unknown')),
  canonical_key text not null, display_name text not null, country text, industry text, business_role text,
  intent_type text, intent_strength text check (intent_strength is null or intent_strength in ('explicit','strong','potential','interest','unknown')),
  lead_score smallint check (lead_score is null or lead_score between 0 and 100),
  score_details jsonb not null default '{}'::jsonb, profile_url text, website_url text,
  contact_channels jsonb not null default '[]'::jsonb, attributes jsonb not null default '{}'::jsonb,
  lifecycle_status text not null default 'new' check (lifecycle_status in ('new','qualified','contacted','in_progress','converted','disqualified','archived')),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, canonical_key)
);
create index if not exists global_leads_user_type_score_idx on public.global_leads(user_id, customer_type, lead_score desc nulls last, last_seen_at desc);
create index if not exists global_leads_user_name_idx on public.global_leads(user_id, lower(display_name));
create table if not exists public.global_lead_sources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.global_leads(id) on delete cascade,
  source_system text not null, source_platform text not null,
  source_project_id uuid references public.social_discovery_projects(id) on delete set null,
  social_task_id uuid references public.social_collection_tasks(id) on delete set null,
  social_record_id uuid references public.social_collection_records(id) on delete set null,
  source_record_key text not null, source_url text, source_content text, raw_data jsonb not null default '{}'::jsonb,
  observed_at timestamptz, created_at timestamptz not null default now(),
  unique(user_id, source_system, source_platform, source_record_key)
);
create index if not exists global_lead_sources_lead_idx on public.global_lead_sources(user_id, lead_id, created_at desc);
create table if not exists public.global_lead_evidence (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.global_leads(id) on delete cascade,
  source_id uuid references public.global_lead_sources(id) on delete set null,
  evidence_type text not null, content text not null, evidence_url text, observed_at timestamptz,
  analysis jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists global_lead_evidence_lead_idx on public.global_lead_evidence(user_id, lead_id, created_at desc);
alter table public.social_discovery_projects enable row level security;
alter table public.social_collection_tasks enable row level security;
alter table public.social_collection_records enable row level security;
alter table public.global_leads enable row level security;
alter table public.global_lead_sources enable row level security;
alter table public.global_lead_evidence enable row level security;
create policy "Users manage own social discovery projects" on public.social_discovery_projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own social collection tasks" on public.social_collection_tasks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read own social collection records" on public.social_collection_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read own global leads" on public.global_leads for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read own global lead sources" on public.global_lead_sources for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read own global lead evidence" on public.global_lead_evidence for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.social_discovery_projects, public.social_collection_tasks, public.social_collection_records, public.global_leads, public.global_lead_sources, public.global_lead_evidence from anon;
grant select, insert, update, delete on public.social_discovery_projects, public.social_collection_tasks to authenticated;
grant select on public.social_collection_records, public.global_leads, public.global_lead_sources, public.global_lead_evidence to authenticated;
grant all on public.social_discovery_projects, public.social_collection_tasks, public.social_collection_records, public.global_leads, public.global_lead_sources, public.global_lead_evidence to service_role;
comment on table public.global_leads is 'User-scoped canonical customer entities shared across all Synesis discovery sources.';
comment on column public.global_leads.canonical_key is 'Deterministic identity key used for cross-platform and cross-source deduplication within a user workspace.';
comment on table public.global_lead_sources is 'Every original source reference is retained when multiple records resolve to one global lead.';
comment on table public.global_lead_evidence is 'Traceable source evidence supporting customer identity and commercial-intent analysis.';
