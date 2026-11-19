-- 0009: make breakdown_key canonical so observations_active_key really blocks duplicates.
--
-- Problem: seeded rows stored an empty breakdown as '' (the column default) while the
-- staging code stored it as '{}'. The unique index saw those as different keys, which let
-- two published values exist for the same indicator and period.
--
-- Step 1 keeps the EARLIEST published value in each duplicate group and marks the later
-- ones 'superseded'. On the live data (2026-11-19) this supersedes:
--   * broad_money_m2 2078/79 = 22           (test value, added 2026-11-10)
--   * broad_money_m2 2079/80 = 5829600.5    (repeat of the original row, added 2026-11-07)
-- Review that this is what you want before running it.

begin;

with ranked as (
  select id,
         row_number() over (
           partition by indicator_id, period_id,
                        case when breakdown_key in ('', '{}') then '' else breakdown_key end
           order by created_at, id
         ) as rn
  from observations
  where status = 'published'
)
update observations o
set status = 'superseded'
from ranked r
where o.id = r.id and r.rn > 1;

-- Step 2: one spelling for "no breakdown".
update observations set breakdown_key = '' where breakdown_key = '{}';

-- Step 3: stop the non-canonical form from coming back.
alter table observations
  add constraint observations_breakdown_key_canonical check (breakdown_key <> '{}');

commit;
