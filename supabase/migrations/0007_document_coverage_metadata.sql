
alter table documents add column if not exists coverage_type text not null default 'other';
alter table documents add column if not exists calendar_system text not null default 'not_applicable';
