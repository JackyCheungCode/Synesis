create table if not exists public.research_normalized_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  task_id uuid not null references public.collection_tasks(id) on delete cascade,
  item_index integer not null check (item_index >= 0),
  platform_slug text not null,
  entity_type text not null check (entity_type in ('product','social_content','search_result','company','job','property','news','app','public_record','generic')),
  canonical_key text,
  normalized_data jsonb not null default '{}'::jsonb,
  field_sources jsonb not null default '{}'::jsonb,
  quality_score smallint not null default 0 check (quality_score between 0 and 100),
  warnings text[] not null default '{}'::text[],
  normalization_version smallint not null default 1 check (normalization_version >= 1),
  normalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint research_normalized_records_task_item_key unique (task_id, item_index),
  constraint research_normalized_records_source_result_fkey
    foreign key (task_id, item_index)
    references public.collection_task_results(task_id, item_index)
    on delete cascade
);

create index if not exists research_normalized_records_user_project_idx
  on public.research_normalized_records (user_id, project_id, normalized_at desc);
create index if not exists research_normalized_records_project_entity_idx
  on public.research_normalized_records (project_id, entity_type, normalized_at desc);
create index if not exists research_normalized_records_canonical_key_idx
  on public.research_normalized_records (user_id, canonical_key)
  where canonical_key is not null;
create index if not exists research_normalized_records_data_gin_idx
  on public.research_normalized_records using gin (normalized_data);

alter table public.research_normalized_records enable row level security;
revoke all on public.research_normalized_records from anon;
revoke insert, update, delete on public.research_normalized_records from authenticated;
grant select on public.research_normalized_records to authenticated;
grant all on public.research_normalized_records to service_role;

drop policy if exists "Users can read their own normalized research records" on public.research_normalized_records;
create policy "Users can read their own normalized research records"
  on public.research_normalized_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.research_normalized_records is
  'Versioned cross-platform canonical records. Original payloads remain in collection_task_results.raw_data.';
comment on column public.research_normalized_records.field_sources is
  'Maps canonical field names to their original source field names for traceability.';
comment on column public.research_normalized_records.quality_score is
  'Completeness score against the entity-type field profile; not a factual confidence score.';
