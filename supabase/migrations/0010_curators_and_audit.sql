-- 0010: multi-curator access, four-eyes publishing, and an audit log.
--
-- * curators     – who may use /admin. Managed by owners from /admin/curators.
--                  Owners are bootstrapped from the OWNER_EMAILS / CURATOR_EMAILS env var.
-- * staged_by    – who entered each value; registered_by – who registered each PDF.
-- * four-eyes    – the person who entered a value can never be the one who publishes it.
--                  Enforced here as well as in the app, so a code bug cannot bypass it.
-- * audit_log    – append-only record of every curator action.
--
-- RLS is enabled with NO policies on the new tables: the public (anon) key cannot
-- read or write them; only the server (service role) can.

begin;

create table if not exists curators (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  role           text not null default 'curator' check (role in ('owner', 'curator')),
  active         boolean not null default true,
  invited_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  deactivated_at timestamptz
);
alter table curators enable row level security;

alter table observations add column if not exists staged_by uuid references auth.users(id) on delete set null;
alter table documents    add column if not exists registered_by uuid references auth.users(id) on delete set null;

create table if not exists audit_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at desc);
alter table audit_log enable row level security;

-- Audit entries can be added but never changed or removed.
create or replace function audit_log_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log
  for each row execute function audit_log_append_only();

-- Four-eyes: block publishing a value by the same person who entered it.
create or replace function observations_four_eyes() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and old.status is distinct from 'published'
     and new.staged_by is not null and new.reviewed_by = new.staged_by then
    raise exception 'four-eyes: a value must be published by a different curator than the one who entered it';
  end if;
  return new;
end $$;
drop trigger if exists observations_four_eyes on observations;
create trigger observations_four_eyes before update on observations
  for each row execute function observations_four_eyes();

commit;
