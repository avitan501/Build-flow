-- Preserve the installed dispatch implementation and its access controls.
-- Provider (90s) < worker (120s) < dispatch (135s) < Edge idle limit (150s).
do $$
declare
  definition text := pg_get_functiondef('public.dispatch_client_material_list_jobs()'::regprocedure);
begin
  if position('timeout_milliseconds := 135000' in definition) > 0 then return; end if;
  if position('timeout_milliseconds := 55000' in definition) = 0 then
    raise exception 'Unexpected material-list dispatch timeout; review before migrating';
  end if;
  execute replace(definition, 'timeout_milliseconds := 55000', 'timeout_milliseconds := 135000');
end;
$$;
