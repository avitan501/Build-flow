create role authenticated nologin;
create role anon nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.is_admin',true),'false')::boolean $$;
grant usage on schema public, auth, private to authenticated, anon, service_role;
