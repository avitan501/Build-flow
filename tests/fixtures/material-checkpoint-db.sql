-- Disposable local PostgreSQL fixture only; never run on a Supabase project.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role;end if;
end $$;
create schema auth; create schema private;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table public.quote_requests(id uuid primary key);
create table public.quote_request_items(
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.quote_requests,
 project_id uuid,owner_id uuid,name text not null,department text,item_type text,
 quantity numeric not null check(quantity>0),unit text,unit_price numeric,
 qualification_status text,answers jsonb,metadata jsonb,created_at timestamptz not null default now()
);
create table public.client_material_list_jobs(
 id bigint primary key,request_id uuid references public.quote_requests,generation bigint not null default 1,
 status text not null,attempts integer default 1,max_attempts integer default 5,
 force_requested boolean default false,available_at timestamptz,locked_at timestamptz,
 completed_at timestamptz,result_status text,item_count integer,review_count integer,last_error text,
 updated_at timestamptz default now()
);
create table public.quote_request_attachments(id uuid primary key default gen_random_uuid(),request_id uuid,item_id uuid,file_path text,file_name text,file_size bigint,file_type text,source_party text);
create table public.quote_comparison_items(id uuid default gen_random_uuid(),source_request_item_id uuid);
create table public.supplier_packages(id uuid default gen_random_uuid(),request_id uuid);
