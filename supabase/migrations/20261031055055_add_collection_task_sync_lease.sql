alter table public.collection_tasks
  add column if not exists sync_lock_token uuid,
  add column if not exists sync_lock_expires_at timestamptz;

create index if not exists collection_tasks_sync_lock_expires_at_idx
  on public.collection_tasks (sync_lock_expires_at)
  where sync_lock_expires_at is not null;
