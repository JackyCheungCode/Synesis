alter table public.products enable row level security;
alter table public.product_source_records enable row level security;
alter table public.product_price_history enable row level security;

revoke all on public.products from anon;
revoke all on public.product_source_records from anon;
revoke all on public.product_price_history from anon;
revoke insert, update, delete on public.products from authenticated;
revoke insert, update, delete on public.product_source_records from authenticated;
revoke insert, update, delete on public.product_price_history from authenticated;
grant select on public.products to authenticated;
grant select on public.product_source_records to authenticated;
grant select on public.product_price_history to authenticated;

drop policy if exists "Users can read their own canonical products" on public.products;
create policy "Users can read their own canonical products"
  on public.products for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own product source records" on public.product_source_records;
create policy "Users can read their own product source records"
  on public.product_source_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own product price history" on public.product_price_history;
create policy "Users can read their own product price history"
  on public.product_price_history for select to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists product_price_history_source_task_idx
  on public.product_price_history (source_task_id);
