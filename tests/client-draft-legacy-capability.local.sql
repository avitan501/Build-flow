-- Existing capability-only staff remains on the legacy manual workflow.
insert into auth.users values('00000000-0000-4000-8000-000000000201','capability-only@example.invalid'),('00000000-0000-4000-8000-000000000202','legacy-client@example.invalid');
insert into profiles(id,email,role,approval_status,full_name) values('00000000-0000-4000-8000-000000000201','capability-only@example.invalid','staff','approved','Capability staff'),('00000000-0000-4000-8000-000000000202','legacy-client@example.invalid','client','approved','Legacy client');
insert into staff_access_grants values('capability-only@example.invalid',true,false,true);
insert into quote_comparisons(id,created_by,title,status) values('00000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000001','Legacy compatibility fixture','review');
insert into quote_comparison_items(id,comparison_id,description,quantity) values('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000210','Legacy material',1);
insert into quote_comparison_bids(id,comparison_id,supplier_id,supplier_name_snapshot,trust_level_snapshot) values('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000210','legacy-capability-supplier','Legacy supplier','verified');
insert into quote_comparison_prices(bid_id,item_id,unit_price,notes) values('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000211',10,'Legacy material');
update quote_comparisons set status='awarded',awarded_bid_id='00000000-0000-4000-8000-000000000212' where id='00000000-0000-4000-8000-000000000210';
set test.actor='00000000-0000-4000-8000-000000000201';set role authenticated;
select staff_save_quote_comparison_client_quote('00000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000202','LEGACY-CAPABILITY',null,'Legacy authorized',0,0,'[{"item_id":"00000000-0000-4000-8000-000000000211","markup_percent":20,"client_unit_price":12}]');
do $$begin
 assert (select client_quote_status='ready' and client_message='Legacy authorized' from quote_comparisons where id='00000000-0000-4000-8000-000000000210');
 assert (select client_unit_price=12 from quote_comparison_items where id='00000000-0000-4000-8000-000000000211');
 assert not has_table_privilege('authenticated','quote_comparison_client_drafts','select');
 assert not has_function_privilege('anon','assert_no_shared_client_quote_draft(uuid)','execute');
end$$;
reset role;
do $$begin assert request_staff_actor_label('00000000-0000-4000-8000-000000000201') is null,'New mixed permission broadened';end$$;
set role service_role;
do $$begin
 begin perform staff_load_client_quote_draft('00000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000201');raise exception 'Named mixed actor check bypassed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update staff_access_grants set active=false where email='capability-only@example.invalid';
set role authenticated;
do $$begin
 begin perform assert_no_shared_client_quote_draft('00000000-0000-4000-8000-000000000210');raise exception 'Revoked capability accepted';exception when raise_exception then assert sqlerrm='Supplier management permission is required.';end;
end$$;
reset role;
-- Null-returning dependency regression, rolled back without changing the fixture.
begin;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select null::boolean$$;
create or replace function private.has_staff_capability(capability text) returns boolean language sql stable security definer set search_path='' as $$select null::boolean$$;
set role authenticated;
do $$begin
 begin perform assert_no_shared_client_quote_draft('00000000-0000-4000-8000-000000000210');raise exception 'Null capability accepted';exception when raise_exception then assert sqlerrm='Supplier management permission is required.';end;
end$$;
reset role;
rollback;
