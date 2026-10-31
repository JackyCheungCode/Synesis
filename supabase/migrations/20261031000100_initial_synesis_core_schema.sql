-- Initial Synesis core schema
-- Provider secrets are encrypted by the Cloudflare Worker and stored only in the private schema.
-- Never expose private schema through the Supabase Data API.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_slug text not null,
  display_name text not null,
  enabled boolean not null default false,
  default_model text,
  base_url text,
  connection_status text not null default 'not_configured'
    check (connection_status in ('not_configured','configured','validated','error')),
  key_last4 text,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_slug)
);
create index if not exists ai_provider_configs_user_idx on public.ai_provider_configs(user_id);

create table if not exists private.ai_provider_credentials (
  config_id uuid primary key references public.ai_provider_configs(id) on delete cascade,
  ciphertext bytea not null,
  nonce bytea not null,
  key_version text not null,
  updated_at timestamptz not null default now()
);
alter table private.ai_provider_credentials enable row level security;
revoke all on private.ai_provider_credentials from public, anon, authenticated;
grant select, insert, update, delete on private.ai_provider_credentials to service_role;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_slug text not null,
  display_name text not null,
  enabled boolean not null default false,
  connection_status text not null default 'not_configured'
    check (connection_status in ('not_configured','configured','validated','error')),
  key_last4 text,
  metadata jsonb not null default '{}'::jsonb,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_slug)
);
create index if not exists integration_connections_user_idx on public.integration_connections(user_id);

create table if not exists private.integration_credentials (
  connection_id uuid primary key references public.integration_connections(id) on delete cascade,
  ciphertext bytea not null,
  nonce bytea not null,
  key_version text not null,
  updated_at timestamptz not null default now()
);
alter table private.integration_credentials enable row level security;
revoke all on private.integration_credentials from public, anon, authenticated;
grant select, insert, update, delete on private.integration_credentials to service_role;

create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  objective text not null,
  target_regions text[] not null default '{}',
  platform_slugs text[] not null default '{}',
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','planning','awaiting_approval','active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_projects_user_updated_idx
  on public.research_projects(user_id, updated_at desc);

create table if not exists public.ai_research_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  plan jsonb not null,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','rejected','running','completed','failed','cancelled')),
  estimated_cost numeric(12,4),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_research_plans_project_idx on public.ai_research_plans(project_id, created_at desc);

create table if not exists public.collection_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  plan_id uuid not null references public.ai_research_plans(id) on delete restrict,
  platform_slug text not null,
  actor_id text,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('awaiting_approval','queued','running','succeeded','failed','cancelled')),
  external_run_id text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collection_tasks_project_created_idx on public.collection_tasks(project_id, created_at desc);
create index if not exists collection_tasks_status_idx on public.collection_tasks(status, created_at);

create table if not exists public.market_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete set null,
  title text not null,
  report_type text not null default 'market_research',
  content jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','generated','reviewed','published','failed')),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_reports_user_created_idx on public.market_reports(user_id, created_at desc);

alter table public.ai_provider_configs enable row level security;
alter table public.integration_connections enable row level security;
alter table public.research_projects enable row level security;
alter table public.ai_research_plans enable row level security;
alter table public.collection_tasks enable row level security;
alter table public.market_reports enable row level security;

create policy "Users manage their own AI provider configs"
  on public.ai_provider_configs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own integration connections"
  on public.integration_connections for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own research projects"
  on public.research_projects for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own AI research plans"
  on public.ai_research_plans for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own collection tasks"
  on public.collection_tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own market reports"
  on public.market_reports for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.ai_provider_configs to authenticated;
grant select, insert, update, delete on public.integration_connections to authenticated;
grant select, insert, update, delete on public.research_projects to authenticated;
grant select, insert, update, delete on public.ai_research_plans to authenticated;
grant select, insert, update, delete on public.collection_tasks to authenticated;
grant select, insert, update, delete on public.market_reports to authenticated;

comment on schema private is 'Internal-only schema. Never expose through Supabase Data API.';
comment on table private.ai_provider_credentials is 'AES-GCM encrypted provider credentials; accessible only to trusted backend service role.';
comment on table private.integration_credentials is 'AES-GCM encrypted integration credentials; accessible only to trusted backend service role.';
