-- Restrict encrypted credential storage to the trusted backend service role.
create policy "Backend service manages encrypted AI credentials"
  on private.ai_provider_credentials for all to service_role
  using (true) with check (true);

create policy "Backend service manages encrypted integration credentials"
  on private.integration_credentials for all to service_role
  using (true) with check (true);

-- Cover foreign keys used by owner-scoped lookups and joins.
create index if not exists ai_research_plans_user_idx on public.ai_research_plans(user_id);
create index if not exists ai_research_plans_approved_by_idx on public.ai_research_plans(approved_by);
create index if not exists collection_tasks_user_idx on public.collection_tasks(user_id);
create index if not exists collection_tasks_plan_idx on public.collection_tasks(plan_id);
create index if not exists market_reports_project_idx on public.market_reports(project_id);
