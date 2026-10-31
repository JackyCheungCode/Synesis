alter table public.collection_tasks
  add column if not exists progress integer not null default 0 check (progress between 0 and 100),
  add column if not exists result_dataset_id text,
  add column if not exists result_count integer not null default 0 check (result_count >= 0),
  add column if not exists result_data jsonb not null default '[]'::jsonb,
  add column if not exists run_status text,
  add column if not exists synced_at timestamptz;
create index if not exists collection_tasks_user_status_created_idx
  on public.collection_tasks (user_id, status, created_at desc);
