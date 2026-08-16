create type public.affiliate_program_status as enum (
  'Not Applied', 'Applied', 'In Progress', 'Approved', 'Set Up',
  'Rejected', 'Waitlisted', 'Paused', 'Closed'
);

create table public.affiliate_programs (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null unique,
  priority text not null check (priority in ('A', 'B', 'C')),
  affiliate_status public.affiliate_program_status not null default 'Not Applied',
  api_status text not null default 'Not Started',
  category text not null,
  new_york_access text not null,
  affiliate_network text not null,
  published_commission text not null,
  commission_min numeric(6,2),
  commission_max numeric(6,2),
  cookie_window text not null,
  cookie_days integer,
  application_difficulty integer not null check (application_difficulty between 1 and 5),
  approval_outlook text not null,
  avantia_fit integer not null check (avantia_fit between 1 and 5),
  application_url text not null,
  retailer_url text,
  application_date date,
  application_email text,
  confirmation_received boolean,
  last_contact_date date,
  next_follow_up_date date,
  approval_date date,
  setup_date date,
  assigned_owner text,
  next_action text not null,
  notes text not null default '',
  application_requirements text not null default '',
  program_restrictions text not null default '',
  approved_commission text,
  approved_promotional_methods text,
  safe_tracking_id text,
  product_feeds_allowed boolean,
  deep_links_allowed boolean,
  api_allowed boolean,
  product_images_allowed boolean,
  affiliate_test_url text,
  affiliate_tested_at timestamptz,
  last_verified_date date not null default date '2026-08-16',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.affiliate_program_activities (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.affiliate_programs(id) on delete cascade,
  activity_type text not null check (activity_type in ('status', 'note', 'contact', 'follow_up', 'link_test')),
  title text not null,
  details text not null default '',
  old_status public.affiliate_program_status,
  new_status public.affiliate_program_status,
  activity_date timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.affiliate_program_checklist (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.affiliate_programs(id) on delete cascade,
  item_key text not null,
  label text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  sort_order integer not null,
  unique(program_id, item_key)
);

create table public.affiliate_program_attachments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.affiliate_programs(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.affiliate_integrations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.affiliate_programs(id) on delete set null,
  supplier_name text not null,
  relationship_type text not null,
  status text not null,
  submitted_at date,
  submission_result text not null,
  current_stage text not null,
  requested_capabilities text[] not null default '{}',
  next_action text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.affiliate_tracker_settings (
  id text primary key default 'global' check (id = 'global'),
  readiness jsonb not null default '{}'::jsonb,
  application_description text not null default 'AvantiaBuild helps builders and remodelers organize material lists, compare retailer options, and continue to approved retailers for final pricing and purchase.',
  audience_description text not null default 'Builders, remodelers, contractors, property owners, and construction managers in the United States.',
  promotion_description text not null default 'Original construction guides, material planning tools, product comparisons, and clearly disclosed retailer links.',
  updated_at timestamptz not null default now()
);

create index affiliate_programs_status_idx on public.affiliate_programs(affiliate_status);
create index affiliate_programs_priority_idx on public.affiliate_programs(priority);
create index affiliate_programs_follow_up_idx on public.affiliate_programs(next_follow_up_date);
create index affiliate_program_activities_program_idx on public.affiliate_program_activities(program_id, activity_date desc);
create index affiliate_program_checklist_program_idx on public.affiliate_program_checklist(program_id, sort_order);

alter table public.affiliate_programs enable row level security;
alter table public.affiliate_program_activities enable row level security;
alter table public.affiliate_program_checklist enable row level security;
alter table public.affiliate_program_attachments enable row level security;
alter table public.affiliate_integrations enable row level security;
alter table public.affiliate_tracker_settings enable row level security;

create policy affiliate_programs_owner_all on public.affiliate_programs for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy affiliate_activities_owner_all on public.affiliate_program_activities for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy affiliate_checklist_owner_all on public.affiliate_program_checklist for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy affiliate_attachments_owner_all on public.affiliate_program_attachments for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy affiliate_integrations_owner_all on public.affiliate_integrations for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy affiliate_settings_owner_all on public.affiliate_tracker_settings for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select, insert, update, delete on public.affiliate_programs, public.affiliate_program_activities, public.affiliate_program_checklist, public.affiliate_program_attachments, public.affiliate_integrations, public.affiliate_tracker_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('affiliate-confirmations', 'affiliate-confirmations', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy affiliate_confirmation_owner_read on storage.objects for select to authenticated using (bucket_id = 'affiliate-confirmations' and (select private.is_admin()));
create policy affiliate_confirmation_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'affiliate-confirmations' and (select private.is_admin()) and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy affiliate_confirmation_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'affiliate-confirmations' and (select private.is_admin()));

create or replace function private.prevent_incomplete_affiliate_setup()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.affiliate_status = 'Set Up' and old.affiliate_status is distinct from 'Set Up' and exists (
    select 1 from public.affiliate_program_checklist where program_id = new.id and not completed
  ) then raise exception 'Complete every setup checklist item before marking this program Set Up'; end if;
  return new;
end;
$$;
create trigger affiliate_setup_guard before update of affiliate_status on public.affiliate_programs for each row execute function private.prevent_incomplete_affiliate_setup();

insert into public.affiliate_programs
(supplier_name,priority,category,affiliate_network,published_commission,commission_min,commission_max,cookie_window,cookie_days,application_difficulty,approval_outlook,avantia_fit,new_york_access,application_url,next_action,api_status)
values
('Ferguson Home','A','Plumbing, HVAC, kitchen, bathroom, appliances, lighting, hardware','Impact','Up to 6% professionals; up to 2% creators',2,6,'15 days',15,4,'Medium-High',5,'Serves and delivers to New York','https://www.fergusonhome.com/','Apply as a professional builder/remodeler platform','Not Started'),
('HVACDirect','A','HVAC systems, furnaces, air conditioners, heat pumps and equipment','In-house','5%',5,5,'Confirm during registration',null,5,'High',5,'Ships to New York','https://hvacdirect.com/affiliates-home','Create account and activate affiliate program','Not Started'),
('The Tool Nut','A','Professional power tools and accessories','Impact','Approximately 3%; verify current offer',3,3,'Approximately 15 days; verify',15,4,'Medium-High',5,'Yorktown Heights, New York location','https://www.toolnut.com/pages/affiliate-program','Apply through Impact','Not Started'),
('Lowe''s Creator','A','Construction materials, tools, appliances and home improvement','Lowe''s Creator','Up to 20%, based on category',null,20,'30 days',30,3,'Medium',5,'Physical stores in New York','https://www.lowes.com/l/creator/joinlowescreator','Ask whether API product links may include affiliate attribution','In Progress'),
('Home Depot','A','Full construction and home-improvement catalog','Official Home Depot affiliate program','1% standard; 8% select decor',1,8,'24 hours',1,4,'Medium-High',5,'Physical stores in New York','https://www.homedepot.com/c/SF_MS_The_Home_Depot_Affiliate_Program','Apply after disclosure and original content are public','Not Started'),
('The RTA Store','A','Cabinets, closets and garage storage','Impact','Not publicly displayed',null,null,'Not publicly displayed',null,4,'Medium-High',5,'Hopewell Junction, New York showroom','https://www.thertastore.com/partner-with-us','Apply through Impact','Not Started'),
('KC Tool','A','Professional and German tools','Refersion','10% base',10,10,'30 days',30,5,'High',4,'Ships to New York','https://kctool.com/pages/affiliate-program','Apply through Refersion','Not Started'),
('U.S. Electrical Services','A','Electrical supplies, wire, lighting, controls and solar','AvantLink','8%',8,8,'Confirm in AvantLink',null,4,'Medium-High',5,'Serves or ships to New York','https://store.ladesupply.com/affiliate','Apply through AvantLink','Not Started'),
('Acme Tools','A','Power tools, woodworking tools and heavy equipment','Impact','Up to 3%',null,3,'15 days',15,4,'Medium-High',5,'Ships to New York','https://www.acmetools.com/affiliates.html','Apply through Impact','Not Started'),
('Rara RTA Cabinets','A','Kitchen and bathroom cabinets','Direct/in-house','Up to 5%',null,5,'45 days',45,4,'Medium-High',5,'Ships to New York; Long Island contact','https://www.rarartacabinets.com/create-affiliate-program/','Submit direct application','Not Started'),
('Ace Hardware','A','Hardware, tools, paint, plumbing and maintenance supplies','Impact','Not publicly displayed',null,null,'14 days',14,4,'Medium-High',5,'Physical stores in New York','https://www.acehardware.com/affiliates','Apply through Impact','Not Started'),
('Amazon Associates','A','Tools, home improvement, industrial supplies and accessories','Amazon Associates','3% home improvement, tools and industrial',3,3,'Generally 24 hours',1,4,'Medium',4,'Delivery throughout New York','https://affiliate-program.amazon.com/','Apply after original content and disclosure are live','Not Started'),
('Factory Buys Direct','B','Heating, fireplaces, outdoor and home equipment','AvantLink','7%',7,7,'60 days',60,4,'Medium-High',4,'Ships to New York','https://www.factorybuysdirect.com/pages/affiliates','Apply through AvantLink','Not Started'),
('Ohio Power Tool','B','Professional tools and equipment','Awin','Not public; verify current offer',null,null,'60 days',60,4,'Medium-High',5,'Ships to New York','https://ui.awin.com/merchant-profile/89545','Apply through Awin','Not Started'),
('Plumbing Deals','B','Plumbing supplies and fixtures','Awin','5%',5,5,'30 days',30,4,'Medium-High',5,'Ships to New York','https://ui.awin.com/merchant-profile/119209/commission-groups','Apply through Awin','Not Started'),
('Kingston Brass','B','Faucets, fixtures and plumbing products','Verify current Awin migration','Up to 5%',null,5,'45 days',45,4,'Medium-High',4,'Ships to New York','https://www.kingstonbrass.com/pages/affiliate-program','Follow current network link','Not Started'),
('Blinds.com','B','Blinds, shades and window coverings','Impact','Up to 7%',null,7,'30 days',30,4,'Medium-High',4,'Ships to New York','https://www.blinds.com/affiliates','Apply through Impact','Not Started'),
('Blindsgalore','B','Blinds, shades and shutters','Verify current Awin migration','5% to 10%',5,10,'90 days',90,4,'Medium-High',4,'Ships to New York','https://www.blindsgalore.com/affiliate-programs','Follow official current application link','Not Started'),
('Lumens','B','Lighting, ceiling fans, furniture and design products','Impact','3% to 10% starting rate',3,10,'Confirm in Impact',null,4,'Medium',4,'Ships to New York','https://www.lumens.com/affiliate-application/','Apply through Impact','Not Started'),
('Tile Club','B','Tile, mosaics and surface finishes','Verify current network','5% trade referral; general rate not public',5,5,'Not public',null,3,'Medium',5,'Ships to New York','https://www.tileclub.com/pages/affiliate-program','Confirm current network','Not Started'),
('Carter Bay','B','Door hardware, locks and security products','Awin','10%',10,10,'30 days',30,4,'Medium-High',4,'Ships to New York','https://ui.awin.com/merchant-profile/116869','Apply through Awin','Not Started'),
('US Door & More','B','Interior and exterior doors','Direct','10%',10,10,'Confirm during application',null,4,'Medium-High',5,'Ships to New York','https://www.doornmore.com/help/doornmore-customer-service/affiliate-program.html','Submit direct application','Not Started'),
('Door Armor','B','Door reinforcement and security','Official program link','Up to 15%',null,15,'Confirm in program',null,5,'High',4,'Ships to New York','https://doorarmor.com/pages/affiliate-program','Apply through official link','Not Started'),
('Würth Tool','B','Tools, fasteners, automotive chemicals and electrical supplies','Direct','5%',5,5,'Not public',null,4,'Medium-High',5,'Ships to New York','https://wurthtool.com/pages/affiliate','Submit direct application','Not Started'),
('Tractor Supply','B','Tools, outdoor power, farm and job-site supplies','Partnerize','Not publicly displayed',null,null,'Not publicly displayed',null,4,'Medium-High',4,'Physical stores in New York','https://www.tractorsupply.com/tsc/cms/policies-information/affiliate-program','Apply through Partnerize','Not Started'),
('CPO Outlets','B','New and reconditioned power tools','Verify official network','2% base; up to 6%',2,6,'Confirm in network',null,4,'Medium-High',5,'Ships to New York','https://www.cpopowertools.com/outlets-affiliate.html','Verify network and commission','Not Started'),
('Northern Tool','B','Tools, generators, equipment and material handling','CJ','Not publicly displayed',null,null,'30 days',30,4,'Medium-High',5,'Ships to New York','https://www.northerntool.com/affiliate-program','Apply through CJ','Not Started'),
('MegaDepot','B','Industrial, safety, laboratory and measurement equipment','Awin','2%',2,2,'7 days',7,4,'Medium-High',4,'New York-based company','https://ui.awin.com/merchant-profile/89059','Apply through Awin','Not Started'),
('ADM Flooring','B','Flooring','Direct agreement','5%, exclusions apply',5,5,'Affiliate-code/direct attribution',null,3,'Medium',5,'Ships to New York','https://admflooring.com/wp-content/uploads/2025/05/ADM-FLOORING-AFFILIATE-MARKETING-AGREEMENT.pdf','Request current instructions','Not Started'),
('WinSoon Hardware','B','Barn doors, sliding doors and door hardware','In-house','5%',5,5,'Not public',null,5,'High',4,'Ships to New York','https://www.winsoonhardware.com/affiliate/login','Create affiliate account','Not Started'),
('Target Partners','C','Home, storage, decor and limited tools','Impact','Up to 8%',null,8,'7 days',7,4,'Medium-High',3,'Physical stores in New York','https://partners.target.com/','Apply after core programs','Not Started'),
('Walmart Creator','C','Tools, home improvement and supplies','Walmart Creator','Rates vary after joining',null,null,'Confirm in portal',null,4,'Medium',4,'Physical stores in New York','https://creator.walmart.com/','Confirm web application placements are permitted','Not Started'),
('Wayfair','C','Fixtures, furniture, storage and renovation finishes','Wayfair affiliate or creator','Not publicly displayed',null,null,'Confirm current U.S. offer',null,3,'Medium',3,'Ships to New York','https://www.aboutwayfair.com/partner-with-us','Apply after core categories','Not Started'),
('eBay Partner Network','C','Tools, equipment, parts and used construction items','eBay Partner Network','3% Home & Garden; up to 4% others',3,4,'24 hours Buy It Now',1,5,'High',3,'Marketplace delivery in New York','https://partnernetwork.ebay.com/our-program/rate-card','Apply if marketplace products are supported','Not Started'),
('Lamps Plus','C','Lighting, fans and furnishings','Official network link','Not public',null,null,'Not public',null,2,'Medium-Low',3,'Ships to New York','https://www.lampsplus.com/partners/','Apply after original lighting content','Not Started'),
('IpeDepot','C','Decking, siding, fencing and outdoor wood','Direct','Not public',null,null,'Not public',null,3,'Medium-Low',5,'Ships to New York','https://buy.ipedepot.com/pages/affiliates','Develop outdoor-material content','Not Started'),
('Specialized Industrial Materials','C','Specialized industrial materials','In-house','5%',5,5,'Not public',null,5,'High',3,'Ships to New York','https://www.simaterials.com/products/affiliate/login','Create account if catalog matches projects','Not Started'),
('Door to Door','C','Doors, door hardware and flooring','Awin','3% to 4%',3,4,'45 days',45,4,'Medium-High',5,'Nationwide delivery','https://ui.awin.com/merchant-profile/89973/commission-groups','Apply through Awin','Not Started'),
('DoorFoto','C','Decorative door products','Official current network','12%',12,12,'90 days',90,4,'Medium-High',2,'Ships to New York','https://doorfoto.com/pages/affiliate-program','Apply only if decorative products are added','Not Started'),
('1620 Workwear','C','Contractor and skilled-trade workwear','AvantLink','3% to 7%',3,7,'30 days',30,3,'Medium',3,'Ships to New York','https://www.avantlink.com/programs/22169/1620-workwear-affiliate-program','Apply after core material suppliers','Not Started');

with items(item_key,label,sort_order) as (values
('approval','Affiliate approval received',1),('terms','Final terms reviewed',2),('commission','Commission rate recorded',3),('cookie','Cookie window recorded',4),('promotion','Approved promotional methods recorded',5),('tracking','Affiliate or publisher ID recorded safely',6),('disclosure','Affiliate disclosure enabled',7),('test_link','Test product link created',8),('test_click','Test click recorded',9),('redirect','Redirect works correctly',10),('retailer_name','Retailer name displayed correctly',11),('price_disclaimer','Final retailer price disclaimer displayed',12),('image_permission','Product-image permission confirmed',13),('feed_permission','Product-feed or API permission confirmed when applicable',14),('mobile','Mobile behavior tested',15),('desktop','Desktop behavior tested',16),('purchase_button','Purchase button opens the correct retailer',17),('no_secrets','No retailer password or secret stored',18),('integration_notes','Integration notes completed',19)
)
insert into public.affiliate_program_checklist(program_id,item_key,label,sort_order)
select p.id,i.item_key,i.label,i.sort_order from public.affiliate_programs p cross join items i;

insert into public.affiliate_integrations(program_id,supplier_name,relationship_type,status,submitted_at,submission_result,current_stage,requested_capabilities,next_action,notes)
select id,'Lowe''s','Developer/API Integration','In Progress',date '2026-08-16','Application Submitted Successfully','Review and Assignment',array['Product Discovery','Product Catalog','Product Detail API','Product descriptions','Product specifications','Product images','Local pricing','Promotions','ZIP- or store-level availability','Sandbox credentials','Production onboarding requirements'],'Monitor the business email used in the application.','Waiting for Lowe''s review and Business Owner assignment. Affiliate participation remains separate.' from public.affiliate_programs where supplier_name='Lowe''s Creator';

insert into public.affiliate_tracker_settings(id,readiness) values ('global', jsonb_build_object(
'Publicly accessible AvantiaBuild website',false,'Professional domain-based business email',false,'About AvantiaBuild page',false,'Privacy Policy',false,'Terms of Use',false,'Affiliate Disclosure',false,'Accurate business and contact information',false,'Original construction content',false,'Secure HTTPS',false,'Working desktop design',false,'Working mobile design',false,'U.S. bank account or supported payment method',false,'Completed W-9 or tax profile when requested',false,'Legal authorization to apply for AvantiaBuild',false,'No unfinished placeholder pages',false,'No broken links',false,'No copied retailer content without permission',false
));
