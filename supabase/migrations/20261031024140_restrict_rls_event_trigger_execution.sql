-- Keep the automatic RLS DDL event trigger active, but prevent direct RPC execution.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
