-- Depends on trusted_product_match (signed actor predicate + locked match checker).
-- Immutable procurement snapshots; existing single-bid documents remain unchanged.
create table public.quote_comparison_routes (
 id uuid primary key default gen_random_uuid(),
 comparison_id uuid not null references public.quote_comparisons(id),
 request_id uuid references public.quote_requests(id),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 draft_revision integer not null, source_fingerprint text not null check(source_fingerprint ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid not null, source_snapshot jsonb not null,
 material_subtotal numeric(16,2) not null, delivery_total numeric(16,2) not null,
 supplier_tax_total numeric(16,2) not null, landed_total numeric(16,2) not null,
 unique(comparison_id,idempotency_key),unique(comparison_id,id)
);
create table public.quote_comparison_route_suppliers (
 route_id uuid not null references public.quote_comparison_routes(id),
 supplier_id text not null check(length(btrim(supplier_id)) between 1 and 160), bid_id uuid not null references public.quote_comparison_bids(id),
 supplier_name text not null, material_subtotal numeric(16,2) not null,
 delivery_charge numeric(16,2) not null check(delivery_charge >= 0), tax_percent numeric not null check(tax_percent between 0 and 100),
 tax_amount numeric(16,2) not null, landed_total numeric(16,2) not null, lead_time_days integer,
 tax_basis text not null default 'materials_and_delivery' check(tax_basis='materials_and_delivery'),
 primary key(route_id,supplier_id)
);
create table public.quote_comparison_route_items (
 route_id uuid not null references public.quote_comparison_routes(id), item_id uuid not null references public.quote_comparison_items(id),
 source_request_item_id uuid references public.quote_request_items(id), supplier_id text not null check(length(btrim(supplier_id)) between 1 and 160),
 bid_id uuid not null, quantity numeric not null check(quantity > 0), unit text not null,
 unit_cost numeric not null check(unit_cost >= 0), line_cost numeric(16,2) not null,
 source_snapshot jsonb not null, primary key(route_id,item_id),
 foreign key(bid_id,item_id) references public.quote_comparison_prices(bid_id,item_id),
 foreign key(route_id,supplier_id) references public.quote_comparison_route_suppliers(route_id,supplier_id)
);
alter table public.quote_comparisons add column active_route_id uuid;
alter table public.quote_comparison_routes add column client_send_token uuid, add column client_send_snapshot jsonb, add column client_send_started_at timestamptz;
alter table public.quote_comparison_routes add column client_send_actor_id uuid references auth.users(id), add column client_send_manifest jsonb,
 add column client_send_dispatch_started_at timestamptz, add column client_send_provider_id text;
alter table public.quote_comparison_routes add column sealed_at timestamptz;
alter table public.quote_comparisons add constraint quote_comparison_active_route_scope foreign key(id,active_route_id) references public.quote_comparison_routes(comparison_id,id);
create index quote_routes_request_idx on public.quote_comparison_routes(request_id);
create index quote_routes_actor_idx on public.quote_comparison_routes(created_by);
create index quote_route_items_source_idx on public.quote_comparison_route_items(source_request_item_id);
create index quote_route_items_supplier_idx on public.quote_comparison_route_items(supplier_id);
create index quote_route_items_price_idx on public.quote_comparison_route_items(bid_id,item_id);
create index quote_route_items_item_idx on public.quote_comparison_route_items(item_id);
create index quote_route_suppliers_supplier_idx on public.quote_comparison_route_suppliers(supplier_id);
create index quote_route_suppliers_bid_idx on public.quote_comparison_route_suppliers(bid_id);
alter table public.quote_comparison_routes enable row level security;
alter table public.quote_comparison_route_items enable row level security;
alter table public.quote_comparison_route_suppliers enable row level security;
revoke all on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers from public,anon,authenticated;
grant select on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers to authenticated;
grant all on public.quote_comparison_routes,public.quote_comparison_route_items,public.quote_comparison_route_suppliers to service_role;
create policy route_staff_read on public.quote_comparison_routes for select to authenticated using(public.can_review_product_match());
create policy route_item_staff_read on public.quote_comparison_route_items for select to authenticated using(public.can_review_product_match());
create policy route_supplier_staff_read on public.quote_comparison_route_suppliers for select to authenticated using(public.can_review_product_match());

create function public.staff_finalize_quote_comparison_route(p_comparison_id uuid,p_actor_id uuid,p_expected_revision integer,p_source_fingerprint text,p_idempotency_key uuid,p_expected_request_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_parent public.quote_comparisons%rowtype; v_item public.quote_comparison_items%rowtype;
 v_bid public.quote_comparison_bids%rowtype; v_price public.quote_comparison_prices%rowtype;
 v_route uuid; v_bid_id uuid; v_supplier_id text; v_raw jsonb; v_alloc jsonb := '[]'; v_source jsonb;
 v_group record; v_count integer; v_subtotal numeric; v_tax numeric;
 v_material numeric := 0; v_delivery numeric := 0; v_taxes numeric := 0;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 select * into v_parent from public.quote_comparisons where id=p_comparison_id for update;
 if not found then raise exception 'Comparison not found'; end if;
 select id into v_route from public.quote_comparison_routes where comparison_id=p_comparison_id and idempotency_key=p_idempotency_key;
 if found then
  if v_parent.active_route_id is distinct from v_route or v_parent.status<>'awarded' then raise exception 'Finalized route is no longer active'; end if;
  return jsonb_build_object('ok',true,'routeId',v_route,'alreadyFinalized',true);
 end if;
 if v_parent.status not in ('draft','review') or v_parent.active_route_id is not null or v_parent.product_choice_draft_revision is distinct from p_expected_revision
 or v_parent.product_choice_draft_source_fingerprint is distinct from p_source_fingerprint then raise exception 'Source or draft changed'; end if;
 if v_parent.request_id is not null then
  perform 1 from public.quote_requests where id=v_parent.request_id for update nowait;
  perform 1 from public.quote_request_items where request_id=v_parent.request_id order by id for update nowait;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) order by id),'[]'::jsonb) into v_raw from public.quote_request_items where request_id=v_parent.request_id;
  if v_raw is distinct from p_expected_request_items then raise exception 'Request changed'; end if;
 elsif p_expected_request_items is distinct from '[]'::jsonb then raise exception 'Unexpected request source'; end if;
 perform 1 from public.quote_comparison_items where comparison_id=p_comparison_id order by id for update nowait;
 perform 1 from public.quote_comparison_bids where comparison_id=p_comparison_id order by id for update nowait;
 perform 1 from public.quote_comparison_prices p join public.quote_comparison_items i on i.id=p.item_id where i.comparison_id=p_comparison_id order by p.bid_id,p.item_id for update of p nowait;
 perform 1 from public.quote_product_match_confirmations c join public.quote_comparison_items i on i.id=c.item_id where i.comparison_id=p_comparison_id order by c.id for update of c nowait;
 select count(*) into v_count from public.quote_comparison_items where comparison_id=p_comparison_id;
 if v_count=0 or v_count>1000 or coalesce(jsonb_typeof(v_parent.product_choice_draft->'selections'),'')<>'object'
 or (select count(*) from jsonb_object_keys(v_parent.product_choice_draft->'selections'))<>v_count then raise exception 'Full product coverage required'; end if;
 for v_item in select * from public.quote_comparison_items where comparison_id=p_comparison_id order by id loop
  v_bid_id := nullif(v_parent.product_choice_draft->'selections'->>v_item.id::text,'')::uuid;
  if v_bid_id is null or not public.quote_product_match_is_eligible(v_item.id,v_bid_id) then raise exception 'Product match requires review'; end if;
  select * into v_bid from public.quote_comparison_bids where id=v_bid_id and comparison_id=p_comparison_id;
  if not found or v_bid.status='declined' or v_bid.trust_level_snapshot='do-not-use' then raise exception 'Supplier unavailable'; end if;
  select * into v_price from public.quote_comparison_prices where bid_id=v_bid_id and item_id=v_item.id;
  if not found or not v_price.is_available or v_price.unit_price is null or v_price.unit_price::text in ('NaN','Infinity','-Infinity') or v_price.unit_price<0
   or v_item.quantity is null or v_item.quantity::text in ('NaN','Infinity','-Infinity') or v_item.quantity<=0 or nullif(btrim(v_item.unit),'') is null then raise exception 'Invalid product price'; end if;
  if v_bid.delivery_charge is null or v_bid.delivery_charge::text in ('NaN','Infinity','-Infinity') or v_bid.delivery_charge<0
   or v_bid.tax_percent is null or v_bid.tax_percent::text in ('NaN','Infinity','-Infinity') or v_bid.tax_percent not between 0 and 100 then raise exception 'Supplier freight and tax required'; end if;
  -- Imported bid identities are directoryId:quoteId; retain the real directory ID
  -- and separately snapshot the source bid. Never fabricate a supplier row.
  v_supplier_id:=split_part(v_bid.supplier_id,':',1);
  if nullif(btrim(v_supplier_id),'') is null then raise exception 'Supplier identity missing'; end if;
  if exists(select 1 from jsonb_array_elements(v_alloc) a where a->>'supplier_id'=v_supplier_id and a->>'bid_id'<>v_bid.id::text) then raise exception 'Resolve combined terms for multiple quotes from one supplier'; end if;
  v_alloc := v_alloc || jsonb_build_array(jsonb_build_object('item_id',v_item.id,'source_request_item_id',v_item.source_request_item_id,'supplier_id',v_supplier_id,'bid_id',v_bid.id,'quantity',v_item.quantity,'unit',v_item.unit,'unit_cost',v_price.unit_price,'line_cost',round(v_item.quantity*v_price.unit_price,2),'source_snapshot',jsonb_build_object('item',to_jsonb(v_item),'bid',to_jsonb(v_bid),'price',to_jsonb(v_price),'match_confirmations',(select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) from public.quote_product_match_confirmations c where c.bid_id=v_bid_id and c.item_id=v_item.id))));
 end loop;
 v_route := gen_random_uuid();
 v_source := jsonb_build_object('request_items',coalesce(v_raw,'[]'::jsonb),'allocations',v_alloc);
 insert into public.quote_comparison_routes(id,comparison_id,request_id,created_by,draft_revision,source_fingerprint,idempotency_key,source_snapshot,material_subtotal,delivery_total,supplier_tax_total,landed_total)
 values(v_route,p_comparison_id,v_parent.request_id,p_actor_id,p_expected_revision,p_source_fingerprint,p_idempotency_key,v_source,0,0,0,0);
 for v_group in select a->>'supplier_id' supplier_id,a->>'bid_id' bid_id,sum((a->>'line_cost')::numeric) subtotal from jsonb_array_elements(v_alloc) a group by a->>'supplier_id',a->>'bid_id' loop
  select * into v_bid from public.quote_comparison_bids where id=v_group.bid_id::uuid;
  v_subtotal:=v_group.subtotal; v_tax:=round((v_subtotal+v_bid.delivery_charge)*v_bid.tax_percent/100,2);
  insert into public.quote_comparison_route_suppliers(route_id,supplier_id,bid_id,supplier_name,material_subtotal,delivery_charge,tax_percent,tax_amount,landed_total,lead_time_days) values(v_route,v_group.supplier_id,v_bid.id,v_bid.supplier_name_snapshot,v_subtotal,v_bid.delivery_charge,v_bid.tax_percent,v_tax,v_subtotal+v_bid.delivery_charge+v_tax,case when v_bid.lead_time_days>=0 then v_bid.lead_time_days else null end);
  v_material:=v_material+v_subtotal; v_delivery:=v_delivery+v_bid.delivery_charge; v_taxes:=v_taxes+v_tax;
 end loop;
 insert into public.quote_comparison_route_items select v_route,(a->>'item_id')::uuid,(a->>'source_request_item_id')::uuid,a->>'supplier_id',(a->>'bid_id')::uuid,(a->>'quantity')::numeric,a->>'unit',(a->>'unit_cost')::numeric,(a->>'line_cost')::numeric,a->'source_snapshot' from jsonb_array_elements(v_alloc) a;
 update public.quote_comparison_routes set material_subtotal=v_material,delivery_total=v_delivery,supplier_tax_total=v_taxes,landed_total=v_material+v_delivery+v_taxes,sealed_at=clock_timestamp() where id=v_route;
 -- This is procurement selection only. Do not send, generate invoices or rewrite client prices.
 update public.quote_comparisons set active_route_id=v_route,status='awarded' where id=p_comparison_id;
 return jsonb_build_object('ok',true,'routeId',v_route,'alreadyFinalized',false);
end $$;
revoke all on function public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.staff_finalize_quote_comparison_route(uuid,uuid,integer,text,uuid,jsonb) to service_role;

create function public.quote_finalized_route_is_current(p_comparison_id uuid,p_route_id uuid)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare v_route public.quote_comparison_routes%rowtype; v_line public.quote_comparison_route_items%rowtype;
 v_item public.quote_comparison_items%rowtype; v_bid public.quote_comparison_bids%rowtype; v_price public.quote_comparison_prices%rowtype; v_raw jsonb;
begin
 if not exists(select 1 from public.quote_comparisons where id=p_comparison_id and active_route_id=p_route_id and status='awarded') then return false; end if;
 select * into v_route from public.quote_comparison_routes where id=p_route_id and comparison_id=p_comparison_id;
 if not found then return false; end if;
 if (select request_id from public.quote_comparisons where id=p_comparison_id) is distinct from v_route.request_id then return false; end if;
 if v_route.request_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'department',department,'quantity',quantity,'unit',unit,'metadata',metadata,'qualification_status',qualification_status) order by id),'[]'::jsonb) into v_raw from public.quote_request_items where request_id=v_route.request_id;
  if v_raw is distinct from v_route.source_snapshot->'request_items' then return false; end if;
 end if;
 if (select count(*) from public.quote_comparison_items where comparison_id=p_comparison_id)<>(select count(*) from public.quote_comparison_route_items where route_id=p_route_id) then return false; end if;
 for v_line in select * from public.quote_comparison_route_items where route_id=p_route_id loop
  select * into v_item from public.quote_comparison_items where id=v_line.item_id and comparison_id=p_comparison_id;
  if not found then return false; end if;
  select * into v_bid from public.quote_comparison_bids where id=v_line.bid_id and comparison_id=p_comparison_id;
  if not found then return false; end if;
  select * into v_price from public.quote_comparison_prices where item_id=v_line.item_id and bid_id=v_line.bid_id;
  if not found or not public.quote_product_match_is_eligible(v_line.item_id,v_line.bid_id) then return false; end if;
  if jsonb_build_array(v_item.id,v_item.source_request_item_id,v_item.description,v_item.specification,v_item.quantity,v_item.unit)
   is distinct from jsonb_build_array(v_line.source_snapshot->'item'->'id',v_line.source_snapshot->'item'->'source_request_item_id',v_line.source_snapshot->'item'->'description',v_line.source_snapshot->'item'->'specification',v_line.source_snapshot->'item'->'quantity',v_line.source_snapshot->'item'->'unit') then return false; end if;
  if jsonb_build_array(v_bid.id,v_bid.supplier_id,v_bid.delivery_charge,v_bid.tax_percent,v_bid.trust_level_snapshot,v_bid.lead_time_days)
   is distinct from jsonb_build_array(v_line.source_snapshot->'bid'->'id',v_line.source_snapshot->'bid'->'supplier_id',v_line.source_snapshot->'bid'->'delivery_charge',v_line.source_snapshot->'bid'->'tax_percent',v_line.source_snapshot->'bid'->'trust_level_snapshot',v_line.source_snapshot->'bid'->'lead_time_days') then return false; end if;
  if jsonb_build_array(v_price.unit_price,v_price.is_available,v_price.notes)
   is distinct from jsonb_build_array(v_line.source_snapshot->'price'->'unit_price',v_line.source_snapshot->'price'->'is_available',v_line.source_snapshot->'price'->'notes') then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function public.quote_finalized_route_is_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.quote_finalized_route_is_current(uuid,uuid) to service_role;

-- Lock the exact supplier/request evidence before client writes. NOWAIT avoids
-- deadlocking legacy child-first writers; no lock conflict becomes a partial save.
create function public.lock_finalized_route_evidence(p_comparison_id uuid,p_route_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_request uuid;
begin
 select request_id into v_request from public.quote_comparisons where id=p_comparison_id for update;
 if v_request is not null then
  perform 1 from public.quote_requests where id=v_request for update nowait;
  perform 1 from public.quote_request_items where request_id=v_request order by id for update nowait;
 end if;
 perform 1 from public.quote_comparison_items where comparison_id=p_comparison_id order by id for update nowait;
 perform 1 from public.quote_comparison_bids where comparison_id=p_comparison_id order by id for update nowait;
 perform 1 from public.quote_comparison_prices p join public.quote_comparison_items i on i.id=p.item_id where i.comparison_id=p_comparison_id order by p.bid_id,p.item_id for update of p nowait;
 perform 1 from public.quote_product_match_confirmations c join public.quote_comparison_items i on i.id=c.item_id where i.comparison_id=p_comparison_id order by c.id for update of c nowait;
 if public.quote_finalized_route_is_current(p_comparison_id,p_route_id) is not true then raise exception 'Supplier route changed. Reopen and review.'; end if;
end $$;
revoke all on function public.lock_finalized_route_evidence(uuid,uuid) from public,anon,authenticated;
grant execute on function public.lock_finalized_route_evidence(uuid,uuid) to service_role;

create function public.staff_save_finalized_route_client_quote(
 p_comparison_id uuid,p_route_id uuid,p_actor_id uuid,p_client_id uuid,p_quote_number text,p_expires_on date,
 p_client_message text,p_client_delivery_charge numeric,p_client_tax_percent numeric,p_items jsonb,p_expected_client jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_client public.profiles%rowtype; v_count integer;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 perform public.lock_finalized_route_evidence(p_comparison_id,p_route_id);
 if p_expected_client is null or public.finalized_route_client_snapshot(p_comparison_id) is distinct from p_expected_client then raise exception 'Client quote changed. Reload before saving.'; end if;
 if exists(select 1 from public.quote_comparison_routes where id=p_route_id and client_send_token is not null) then raise exception 'Client delivery already started. Check delivery history before changing this quote.'; end if;
 if exists(select 1 from public.quote_comparisons where id=p_comparison_id and client_quote_status in ('sent','accepted')) then raise exception 'Sent quote is immutable'; end if;
 select * into v_client from public.profiles where id=p_client_id and role='client' and is_active and nullif(btrim(email),'') is not null;
 if not found then raise exception 'client_not_found'; end if;
 if p_quote_number is null or length(btrim(p_quote_number))<3 or p_client_delivery_charge is null or p_client_delivery_charge<0
 or p_client_delivery_charge::text in ('NaN','Infinity','-Infinity') or p_client_tax_percent is null or p_client_tax_percent<0 or p_client_tax_percent>100
 or p_client_tax_percent::text in ('NaN','Infinity','-Infinity') or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid client quote'; end if;
 select count(*) into v_count from public.quote_comparison_items where comparison_id=p_comparison_id;
 if v_count=0 or jsonb_array_length(p_items)<>v_count or (select count(distinct q.item_id) from jsonb_to_recordset(p_items) q(item_id uuid,markup_percent numeric,client_unit_price numeric)
 join public.quote_comparison_items i on i.id=q.item_id and i.comparison_id=p_comparison_id where q.markup_percent>=0 and q.markup_percent::text not in ('NaN','Infinity','-Infinity')
 and q.client_unit_price>=0 and q.client_unit_price::text not in ('NaN','Infinity','-Infinity'))<>v_count then raise exception 'client_prices_incomplete'; end if;
 update public.quote_comparisons set client_id=p_client_id,client_name_snapshot=left(coalesce(nullif(btrim(v_client.full_name),''),v_client.email),200),
 client_email_snapshot=left(v_client.email,320),quote_number=left(btrim(p_quote_number),40),expires_on=p_expires_on,client_message=left(coalesce(p_client_message,''),4000),
 client_delivery_charge=p_client_delivery_charge,client_tax_percent=p_client_tax_percent,client_quote_status='ready',quote_sent_at=null where id=p_comparison_id;
 update public.quote_comparison_items i set markup_percent=q.markup_percent,client_unit_price=q.client_unit_price
 from jsonb_to_recordset(p_items) q(item_id uuid,markup_percent numeric,client_unit_price numeric) where i.id=q.item_id and i.comparison_id=p_comparison_id;
 return public.finalized_route_client_snapshot(p_comparison_id);
end $$;
revoke all on function public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_save_finalized_route_client_quote(uuid,uuid,uuid,uuid,text,date,text,numeric,numeric,jsonb,jsonb) to service_role;

create function public.staff_reopen_finalized_route(p_comparison_id uuid,p_actor_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_parent public.quote_comparisons%rowtype;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 select * into v_parent from public.quote_comparisons where id=p_comparison_id for update;
 if not found or v_parent.active_route_id is null then raise exception 'No finalized route'; end if;
 if exists(select 1 from public.quote_comparison_routes where id=v_parent.active_route_id and client_send_token is not null) then raise exception 'Client delivery already started. Check delivery history before reopening.'; end if;
 if v_parent.client_quote_status in ('sent','accepted') then raise exception 'Sent quote is immutable'; end if;
 update public.quote_comparisons set active_route_id=null,status='review',client_quote_status='draft' where id=p_comparison_id;
 -- Immutable allocation history and original declined supplier statuses survive reopening.
end $$;
revoke all on function public.staff_reopen_finalized_route(uuid,uuid) from public,anon,authenticated;
grant execute on function public.staff_reopen_finalized_route(uuid,uuid) to service_role;

create function public.finalized_route_client_snapshot(p_comparison_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('comparison',jsonb_build_object('active_route_id',c.active_route_id,'client_id',c.client_id,'client_name_snapshot',c.client_name_snapshot,
 'client_email_snapshot',c.client_email_snapshot,'quote_number',c.quote_number,'expires_on',c.expires_on,'client_message',c.client_message,'job_address',c.job_address,
 'client_delivery_charge',c.client_delivery_charge,'client_tax_percent',c.client_tax_percent,'client_quote_status',c.client_quote_status),
 'items',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'description',i.description,'specification',i.specification,'quantity',i.quantity,'unit',i.unit,'markup_percent',i.markup_percent,'client_unit_price',i.client_unit_price) order by i.id),'[]') from public.quote_comparison_items i where i.comparison_id=c.id))
 from public.quote_comparisons c where c.id=p_comparison_id
$$;
revoke all on function public.finalized_route_client_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.finalized_route_client_snapshot(uuid) to service_role;

create function public.staff_claim_finalized_route_send(p_comparison_id uuid,p_route_id uuid,p_actor_id uuid,p_expected jsonb,p_token uuid,p_loaded jsonb,p_manifest jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 perform public.lock_finalized_route_evidence(p_comparison_id,p_route_id);
 if p_token is null or p_expected is null or p_loaded is distinct from p_expected or public.finalized_route_client_snapshot(p_comparison_id) is distinct from p_expected then raise exception 'Client quote changed. Reload before sending.'; end if;
 if not exists(select 1 from public.quote_comparisons where id=p_comparison_id and client_quote_status='ready' and client_id is not null and nullif(btrim(client_email_snapshot),'') is not null) then raise exception 'Save the client quote first'; end if;
 if jsonb_typeof(p_manifest) is distinct from 'array' or jsonb_array_length(p_manifest) not between 1 and 11 then raise exception 'Invalid attachment manifest'; end if;
 if exists(select 1 from jsonb_array_elements(p_manifest) m where jsonb_typeof(m) is distinct from 'object' or nullif(btrim(m->>'filename'),'') is null
 or (m->>'sha256') is null or (m->>'sha256')!~'^[a-f0-9]{64}$' or (m->>'bytes') is null or (m->>'bytes')!~'^[0-9]+$' or (m->>'bytes')::numeric<=0 or (m->>'bytes')::numeric>26214400) then raise exception 'Invalid attachment manifest'; end if;
 update public.quote_comparison_routes set client_send_token=p_token,client_send_snapshot=p_expected,client_send_started_at=now(),client_send_actor_id=p_actor_id,client_send_manifest=p_manifest
 where id=p_route_id and comparison_id=p_comparison_id and client_send_token is null;
 if not found then raise exception 'Delivery already started. Check delivery history; do not send twice.'; end if;
 -- Retain this claim even on an ambiguous provider timeout. No blind duplicate send.
end $$;
revoke all on function public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_claim_finalized_route_send(uuid,uuid,uuid,jsonb,uuid,jsonb,jsonb) to service_role;

create function public.staff_start_finalized_route_delivery(p_comparison_id uuid,p_route_id uuid,p_token uuid,p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.quote_comparison_routes%rowtype;
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 select * into r from public.quote_comparison_routes where id=p_route_id and comparison_id=p_comparison_id and client_send_token=p_token and client_send_actor_id=p_actor_id for update;
 if not found then raise exception 'Delivery claim unavailable'; end if;
 if r.client_send_provider_id is not null then return jsonb_build_object('status','sent','providerId',r.client_send_provider_id); end if;
 if r.client_send_dispatch_started_at is not null then return jsonb_build_object('status','ambiguous'); end if;
 update public.quote_comparison_routes set client_send_dispatch_started_at=now() where id=r.id;
 return jsonb_build_object('status','claimed');
end $$;
revoke all on function public.staff_start_finalized_route_delivery(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.staff_start_finalized_route_delivery(uuid,uuid,uuid,uuid) to service_role;

create function public.staff_finish_finalized_route_delivery(p_comparison_id uuid,p_route_id uuid,p_token uuid,p_actor_id uuid,p_provider_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor_id and p.is_active and p.approval_status='approved'
 and ((p.role='admin' and lower(btrim(u.email))='avitanneto@gmail.com') or (p.role='staff' and lower(btrim(u.email)) in ('buildavantiap@gmail.com','info@fivetownsbuilders.com')))) then raise exception 'Not authorized'; end if;
 if nullif(btrim(p_provider_id),'') is null or length(p_provider_id)>300 then raise exception 'Provider receipt required'; end if;
 update public.quote_comparison_routes set client_send_provider_id=p_provider_id where id=p_route_id and comparison_id=p_comparison_id and client_send_token=p_token and client_send_actor_id=p_actor_id
 and client_send_dispatch_started_at is not null and (client_send_provider_id is null or client_send_provider_id=p_provider_id);
 if not found then raise exception 'Delivery claim unavailable'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.staff_finish_finalized_route_delivery(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.staff_finish_finalized_route_delivery(uuid,uuid,uuid,uuid,text) to service_role;

-- Close the older authenticated SECURITY DEFINER entry point for real routes.
-- Legacy single-bid comparisons retain their existing behavior.
create or replace function public.staff_reopen_quote_comparison(p_comparison_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not (select private.is_admin()) and not (select private.has_staff_capability('suppliers')) then raise exception 'Supplier management permission is required.'; end if;
 perform 1 from public.quote_comparisons where id=p_comparison_id for update;
 if not found then raise exception 'comparison_not_found'; end if;
 if exists(select 1 from public.quote_comparison_routes where comparison_id=p_comparison_id) then raise exception 'Use the reviewed product-route reopen action.'; end if;
 update public.quote_comparisons set awarded_bid_id=null,status='review' where id=p_comparison_id;
 update public.quote_comparison_bids set status='received' where comparison_id=p_comparison_id;
end $$;
revoke all on function public.staff_reopen_quote_comparison(uuid) from public,anon;
grant execute on function public.staff_reopen_quote_comparison(uuid) to authenticated;

create function public.guard_claimed_route_client_data() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_comparison uuid; v_claimed boolean;
begin
 if tg_table_name='quote_comparisons' then
  v_comparison:=old.id;
 else
  v_comparison:=case when tg_op='DELETE' then old.comparison_id else new.comparison_id end;
  if tg_op='UPDATE' and old.comparison_id is distinct from new.comparison_id and exists(select 1 from public.quote_comparison_routes where comparison_id=old.comparison_id and client_send_token is not null) then raise exception 'Client delivery snapshot is immutable. Create a new quote version.'; end if;
  -- Same parent fence as the send claim, but fail safely for a child-first writer.
  perform 1 from public.quote_comparisons where id=v_comparison for update nowait;
 end if;
 select exists(select 1 from public.quote_comparison_routes r where r.comparison_id=v_comparison and r.client_send_token is not null) into v_claimed;
 if v_claimed then
  if tg_table_name='quote_comparisons' and tg_op='UPDATE' then
   if old.client_quote_status is distinct from new.client_quote_status and new.client_quote_status not in ('sent','accepted','declined') then raise exception 'Client delivery already started.'; end if;
   -- Delivery recording and CAS bookkeeping may advance, never customer data.
   if (to_jsonb(old)-array['updated_at','product_choice_draft_revision','quote_sent_at','client_quote_status'])
      is distinct from (to_jsonb(new)-array['updated_at','product_choice_draft_revision','quote_sent_at','client_quote_status']) then raise exception 'Client delivery snapshot is immutable. Create a new quote version.'; end if;
  elsif tg_op<>'UPDATE' or (to_jsonb(old)-'updated_at') is distinct from (to_jsonb(new)-'updated_at') then
   raise exception 'Client delivery snapshot is immutable. Create a new quote version.';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_claimed_route_client_data() from public,anon,authenticated;
create trigger protect_claimed_route_parent before update or delete on public.quote_comparisons for each row execute function public.guard_claimed_route_client_data();
create trigger protect_claimed_route_items before insert or update or delete on public.quote_comparison_items for each row execute function public.guard_claimed_route_client_data();

create function public.guard_finalized_route_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' or tg_table_name<>'quote_comparison_routes' then raise exception 'Finalized supplier allocations are immutable'; end if;
 if old.sealed_at is null and new.sealed_at is not null and old.client_send_token is null then return new; end if;
 if (to_jsonb(old)-array['client_send_token','client_send_snapshot','client_send_started_at','client_send_actor_id','client_send_manifest','client_send_dispatch_started_at','client_send_provider_id'])
 is distinct from (to_jsonb(new)-array['client_send_token','client_send_snapshot','client_send_started_at','client_send_actor_id','client_send_manifest','client_send_dispatch_started_at','client_send_provider_id']) then raise exception 'Finalized supplier allocations are immutable'; end if;
 if old.client_send_token is not null and jsonb_build_array(old.client_send_token,old.client_send_snapshot,old.client_send_started_at,old.client_send_actor_id,old.client_send_manifest)
 is distinct from jsonb_build_array(new.client_send_token,new.client_send_snapshot,new.client_send_started_at,new.client_send_actor_id,new.client_send_manifest) then raise exception 'Delivery claim is immutable'; end if;
 if old.client_send_dispatch_started_at is not null and new.client_send_dispatch_started_at is distinct from old.client_send_dispatch_started_at then raise exception 'Delivery attempt cannot be reset'; end if;
 if old.client_send_provider_id is not null and new.client_send_provider_id is distinct from old.client_send_provider_id then raise exception 'Provider receipt is immutable'; end if;
 return new;
end $$;
revoke all on function public.guard_finalized_route_history() from public,anon,authenticated;
create trigger immutable_finalized_route before update or delete on public.quote_comparison_routes for each row execute function public.guard_finalized_route_history();
create trigger immutable_finalized_route_items before update or delete on public.quote_comparison_route_items for each row execute function public.guard_finalized_route_history();
create trigger immutable_finalized_route_suppliers before update or delete on public.quote_comparison_route_suppliers for each row execute function public.guard_finalized_route_history();
