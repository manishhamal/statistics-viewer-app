
alter table sources enable row level security;
alter table documents enable row level security;
alter table indicators enable row level security;
alter table periods enable row level security;
alter table observations enable row level security;
create policy public_sources_read on sources for select using (true);
create policy public_indicators_read on indicators for select using (true);
create policy public_periods_read on periods for select using (true);
create policy public_published_observations_read on observations for select using (status='published');
