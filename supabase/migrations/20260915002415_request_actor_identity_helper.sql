-- Narrow identity lookup only: business writes remain SECURITY INVOKER.
-- Production service_role cannot SELECT auth.users or use private schema.
create function public.request_staff_actor_label(p_actor_id uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when lower(btrim(u.email))='avitanneto@gmail.com' then 'David'
   when lower(btrim(u.email))='buildavantiap@gmail.com' then 'Carlos' else 'Staff' end
 from public.profiles p join auth.users u on u.id=p.id
 where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com')
   or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))
$$;
revoke all on function public.request_staff_actor_label(uuid) from public,anon,authenticated;
grant execute on function public.request_staff_actor_label(uuid) to service_role;

-- Replace only the exact actor preamble, preserving installed source fences,
-- lock ordering, immutable history, CAS and send-claim bodies byte-for-byte.
do $$
declare signature text; target regprocedure; original text; repaired text; matched text; start_at integer; end_at integer;
begin
 foreach signature in array array[
  'public.staff_apply_request_item_edit(uuid,uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb,boolean)',
  'public.staff_confirm_product_match(uuid,uuid,uuid,uuid,jsonb,text,text)',
  'public.staff_award_reviewed_product_bid(uuid,uuid,uuid,jsonb)',
  'public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb)',
  'public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb)',
  'public.staff_reopen_finalized_route(uuid,uuid)',
  'public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb)',
  'public.staff_start_finalized_route_delivery(uuid,uuid,uuid,uuid)',
  'public.staff_finish_finalized_route_delivery(uuid,uuid,uuid,uuid,text)'
 ] loop
  target:=to_regprocedure(signature);
  if target is null then raise exception 'Required request RPC missing: %',signature; end if;
  if (select prosecdef from pg_proc where oid=target) then raise exception 'Business RPC must remain invoker: %',signature; end if;
  original:=pg_get_functiondef(target);
  if signature like 'public.staff_confirm_product_match(%' then
   start_at:=position('select case when lower' in original);
   end_at:=position('if v_label is null' in substring(original from start_at));
   matched:=substring(original from start_at for end_at+length('if v_label is null')-1);
   repaired:=replace(original,matched,'v_label := public.request_staff_actor_label(p_actor_id);' || chr(10) || ' if v_label is null');
  else
   start_at:=position('if not exists' in original);
   end_at:=position('then raise exception' in substring(original from start_at));
   matched:=substring(original from start_at for end_at+length('then raise exception')-1);
   repaired:=replace(original,matched,'if public.request_staff_actor_label(p_actor_id) is null then raise exception');
  end if;
  if start_at=0 or end_at=0 or matched is null or position('auth.users' in matched)=0 or position('p_actor_id' in matched)=0 or position('avitanneto@gmail.com' in matched)=0
   or position('info@fivetownsbuilders.com' in matched)=0 or position('approval_status' in matched)=0
   or repaired is null or repaired=original or position('auth.users' in repaired)>0 then
   raise exception 'Actor predicate changed unexpectedly; refusing to replace %',signature;
  end if;
  execute repaired;
  if (select prosecdef from pg_proc where oid=target) then raise exception 'Business RPC privilege changed: %',signature; end if;
 end loop;
end $$;
