alter table public.collection_tasks
  add column if not exists result_synced_count integer not null default 0 check (result_synced_count >= 0);

create table if not exists public.collection_task_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.collection_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_index integer not null check (item_index >= 0),
  raw_data jsonb not null,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (task_id, item_index)
);

create index if not exists collection_task_results_user_task_idx
  on public.collection_task_results (user_id, task_id, item_index);

alter table public.collection_task_results enable row level security;
revoke all on public.collection_task_results from anon;
grant select on public.collection_task_results to authenticated;

drop policy if exists "Users can read their own collection task results" on public.collection_task_results;
create policy "Users can read their own collection task results"
  on public.collection_task_results
  for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.collection_task_results is
  'Complete, paginated Apify dataset items. raw_data preserves the original source object without field loss.';