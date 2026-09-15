-- Preserve profile-only CAS edits when Auth changes an unrelated metadata key.
-- Exact installed-body fence: no role, bootstrap, email, company or ACL changes.
do $migration$
declare
  definition text;
  body text;
  field text;
  before_assignment text;
  after_assignment text;
begin
  select p.prosrc, pg_get_functiondef(p.oid) into body, definition
  from pg_proc p where p.oid = 'private.handle_new_user()'::regprocedure;
  if md5(body) is distinct from '642c6b42639d8e538506cf3666ca223c' then
    raise exception 'Profile bootstrap changed; review before applying this migration';
  end if;
  foreach field in array array['full_name', 'phone'] loop
    before_assignment := format('%1$s = coalesce(excluded.%1$s, public.profiles.%1$s)', field);
    after_assignment := format('%1$s = case when TG_OP = ''UPDATE'' and (new.raw_user_meta_data ->> %2$L) is not distinct from (old.raw_user_meta_data ->> %2$L) then public.profiles.%1$s else coalesce(excluded.%1$s, public.profiles.%1$s) end', field, field);
    if (length(definition) - length(replace(definition, before_assignment, ''))) / length(before_assignment) <> 1 then
      raise exception 'Profile assignment changed; review before applying this migration';
    end if;
    definition := replace(definition, before_assignment, after_assignment);
  end loop;
  execute definition;
end;
$migration$;
