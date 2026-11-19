
create index if not exists observations_indicator_period_idx on observations(indicator_id,period_id);
create index if not exists observations_status_idx on observations(status);
create unique index if not exists observations_active_key on observations(indicator_id,period_id,breakdown_key,status) where status in ('staged','verified','published');
