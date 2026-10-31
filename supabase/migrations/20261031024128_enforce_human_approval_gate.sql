-- Prevent the browser client from approving its own AI collection plans.
drop policy if exists "Users manage their own AI research plans" on public.ai_research_plans;

create policy "Users read their own AI research plans"
  on public.ai_research_plans for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users submit unapproved AI research plans"
  on public.ai_research_plans for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status in ('draft','pending_approval')
    and approved_at is null
    and approved_by is null
  );

create policy "Users edit unapproved AI research plans"
  on public.ai_research_plans for update to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('draft','pending_approval')
  )
  with check (
    (select auth.uid()) = user_id
    and status in ('draft','pending_approval')
    and approved_at is null
    and approved_by is null
  );

create policy "Users delete unapproved AI research plans"
  on public.ai_research_plans for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('draft','pending_approval')
  );

drop policy if exists "Users manage their own collection tasks" on public.collection_tasks;

create policy "Users read their own collection tasks"
  on public.collection_tasks for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.collection_tasks from authenticated;
