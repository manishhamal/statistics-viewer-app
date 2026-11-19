
alter table observations add column if not exists reviewed_by uuid;
alter table observations add column if not exists reviewed_at timestamptz;
alter table observations add column if not exists rejection_reason text;
