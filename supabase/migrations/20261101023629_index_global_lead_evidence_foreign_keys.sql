create index if not exists global_lead_sources_lead_id_idx on public.global_lead_sources(lead_id);
create index if not exists global_lead_sources_project_id_idx on public.global_lead_sources(source_project_id);
create index if not exists global_lead_sources_social_task_id_idx on public.global_lead_sources(social_task_id);
create index if not exists global_lead_sources_social_record_id_idx on public.global_lead_sources(social_record_id);
create index if not exists global_lead_evidence_lead_id_idx on public.global_lead_evidence(lead_id);
create index if not exists global_lead_evidence_source_id_idx on public.global_lead_evidence(source_id);
