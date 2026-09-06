do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'aura_communications'
  ) then
    alter publication supabase_realtime add table public.aura_communications;
  end if;
end
$$;
