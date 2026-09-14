\set ON_ERROR_STOP on
-- Run after finalized-route.local.sql in a disposable database only.
insert into public.profiles(id,is_active,approval_status,role,full_name,email) values('00000000-0000-4000-8000-000000000040',true,'approved','client','Test client','client@example.invalid');
create function public.test_route_client_save(p_items jsonb default '[{"item_id":"00000000-0000-4000-8000-000000000011","markup_percent":50,"client_unit_price":30},{"item_id":"00000000-0000-4000-8000-000000000012","markup_percent":100,"client_unit_price":60}]') returns void language sql as $$
select public.staff_save_finalized_route_client_quote('00000000-0000-4000-8000-000000000010',(select active_route_id from public.quote_comparisons where id='00000000-0000-4000-8000-000000000010'),'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000040','MIX-001',null,'Test',10,10,p_items)
$$;
do $$declare r uuid;begin
 select active_route_id into r from public.quote_comparisons where id='00000000-0000-4000-8000-000000000010';
 assert public.quote_finalized_route_is_current('00000000-0000-4000-8000-000000000010',r),'new route stale';
 update public.quote_comparison_bids set lead_time_days=2 where supplier_name_snapshot='Supplier A';
 assert not public.quote_finalized_route_is_current('00000000-0000-4000-8000-000000000010',r),'changed delivery promise remained current';
 update public.quote_comparison_bids set lead_time_days=null where supplier_name_snapshot='Supplier A';
 update public.quote_comparisons set request_id='00000000-0000-4000-8000-000000000099';
 assert not public.quote_finalized_route_is_current('00000000-0000-4000-8000-000000000010',r),'relinked source remained current';
 update public.quote_comparisons set request_id=null;
 update public.quote_comparison_prices set unit_price=21 where bid_id='00000000-0000-4000-8000-000000000021';
 begin perform public.test_route_client_save();raise exception 'stale save allowed';exception when raise_exception then assert sqlerrm='Supplier route changed. Reopen and review.';end;
 update public.quote_comparison_prices set unit_price=20 where bid_id='00000000-0000-4000-8000-000000000021';
 begin perform public.test_route_client_save('[{"item_id":"00000000-0000-4000-8000-000000000011","markup_percent":0,"client_unit_price":30},{"item_id":"00000000-0000-4000-8000-000000000011","markup_percent":0,"client_unit_price":30}]');raise exception 'duplicate coverage allowed';exception when raise_exception then assert sqlerrm='client_prices_incomplete';end;
end $$;
set role service_role;
select public.test_route_client_save();
reset role;
do $$declare r uuid;s jsonb;begin
 select active_route_id into r from public.quote_comparisons where id='00000000-0000-4000-8000-000000000010';
 assert public.quote_finalized_route_is_current('00000000-0000-4000-8000-000000000010',r),'client markup invalidated supplier route';
 assert (select sum(quantity*client_unit_price)=120 from public.quote_comparison_items),'client price changed';
 s:=public.finalized_route_client_snapshot('00000000-0000-4000-8000-000000000010');
 begin perform public.staff_claim_finalized_route_send('00000000-0000-4000-8000-000000000010',r,'00000000-0000-4000-8000-000000000001','{}','00000000-0000-4000-8000-000000000050');raise exception 'stale send passed';exception when raise_exception then assert sqlerrm='Client quote changed. Reload before sending.';end;
 -- Reopen retains real allocations but invalidates old idempotency success.
 perform public.staff_reopen_finalized_route('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001');
 assert (select count(*)=1 from public.quote_comparison_routes),'reopen erased financial history';
 begin perform public.test_finalize();raise exception 'inactive retry passed';exception when raise_exception then assert sqlerrm='Finalized route is no longer active';end;
 update public.quote_comparisons set active_route_id=r,status='awarded',client_quote_status='ready';
 perform public.staff_claim_finalized_route_send('00000000-0000-4000-8000-000000000010',r,'00000000-0000-4000-8000-000000000001',s,'00000000-0000-4000-8000-000000000050');
 begin perform public.staff_claim_finalized_route_send('00000000-0000-4000-8000-000000000010',r,'00000000-0000-4000-8000-000000000001',s,'00000000-0000-4000-8000-000000000051');raise exception 'duplicate send passed';exception when raise_exception then assert sqlerrm='Delivery already started. Check delivery history; do not send twice.';end;
 begin perform public.test_route_client_save();raise exception 'inflight overwrite passed';exception when raise_exception then assert sqlerrm like 'Client delivery already started%';end;
 begin perform public.staff_reopen_finalized_route('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001');raise exception 'inflight reopen passed';exception when raise_exception then assert sqlerrm like 'Client delivery already started%';end;
 assert (select client_send_snapshot=s from public.quote_comparison_routes where id=r),'send snapshot not retained';
 assert not has_function_privilege('authenticated','public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid)','execute'),'untrusted direct send claim';
end $$;
select 'mixed route client draft/source/send guard checks passed';
