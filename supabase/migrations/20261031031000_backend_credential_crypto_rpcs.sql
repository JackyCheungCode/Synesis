-- Backend-only access to credential ciphertext and a Vault-managed AES-256 key.
-- Functions are callable only with the Supabase secret/service role from the authenticated Edge Function.
create or replace function public.synesis_get_encryption_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'synesis_credential_encryption_key'
  limit 1;
$$;

create or replace function public.synesis_store_credential(
  p_kind text,
  p_config_id uuid,
  p_ciphertext text,
  p_nonce text,
  p_key_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'provider' then
    insert into private.ai_provider_credentials(config_id, ciphertext, nonce, key_version, updated_at)
    values (p_config_id, decode(p_ciphertext, 'base64'), decode(p_nonce, 'base64'), p_key_version, now())
    on conflict (config_id) do update set
      ciphertext = excluded.ciphertext,
      nonce = excluded.nonce,
      key_version = excluded.key_version,
      updated_at = now();
  elsif p_kind = 'integration' then
    insert into private.integration_credentials(connection_id, ciphertext, nonce, key_version, updated_at)
    values (p_config_id, decode(p_ciphertext, 'base64'), decode(p_nonce, 'base64'), p_key_version, now())
    on conflict (connection_id) do update set
      ciphertext = excluded.ciphertext,
      nonce = excluded.nonce,
      key_version = excluded.key_version,
      updated_at = now();
  else
    raise exception 'invalid credential kind';
  end if;
end;
$$;

create or replace function public.synesis_get_credential(p_kind text, p_config_id uuid)
returns table(ciphertext text, nonce text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'provider' then
    return query select encode(c.ciphertext, 'base64'), encode(c.nonce, 'base64')
      from private.ai_provider_credentials c where c.config_id = p_config_id;
  elsif p_kind = 'integration' then
    return query select encode(c.ciphertext, 'base64'), encode(c.nonce, 'base64')
      from private.integration_credentials c where c.connection_id = p_config_id;
  else
    raise exception 'invalid credential kind';
  end if;
end;
$$;

revoke all on function public.synesis_get_encryption_key() from public, anon, authenticated;
revoke all on function public.synesis_store_credential(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.synesis_get_credential(text, uuid) from public, anon, authenticated;
grant execute on function public.synesis_get_encryption_key() to service_role;
grant execute on function public.synesis_store_credential(text, uuid, text, text, text) to service_role;
grant execute on function public.synesis_get_credential(text, uuid) to service_role;
