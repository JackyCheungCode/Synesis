create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_key text not null,
  title text,
  brand text,
  category text,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_user_canonical_key_key unique (user_id, canonical_key)
);

create table if not exists public.product_source_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  platform_slug text not null,
  external_product_id text not null,
  source_url text,
  source_sku text,
  raw_data jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint product_source_records_identity_key unique (user_id, platform_slug, external_product_id)
);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  source_record_id uuid not null references public.product_source_records(id) on delete cascade,
  source_task_id uuid not null references public.collection_tasks(id) on delete cascade,
  source_item_index integer not null check (source_item_index >= 0),
  price numeric(20,6) not null check (price >= 0),
  currency text not null,
  observed_at timestamptz not null default now(),
  constraint product_price_history_source_item_key unique (source_record_id, source_task_id, source_item_index)
);

create index if not exists products_user_updated_idx on public.products (user_id, updated_at desc);
create index if not exists product_source_records_product_idx on public.product_source_records (product_id, last_seen_at desc);
create index if not exists product_price_history_product_observed_idx on public.product_price_history (product_id, observed_at desc);
create index if not exists product_price_history_user_currency_idx on public.product_price_history (user_id, currency, observed_at desc);

alter table public.products enable row level security;
alter table public.product_source_records enable row level security;
alter table public.product_price_history enable row level security;

comment on table public.products is 'User-scoped canonical product entities; source payloads remain preserved separately.';
comment on table public.product_source_records is 'Platform identity and original source payload for each canonical product.';
comment on table public.product_price_history is 'Append-only observed price snapshots linked to source task items.';
