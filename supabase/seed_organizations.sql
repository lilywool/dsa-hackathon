-- Seed directory organizations with the six service categories:
-- shelter, food, healthcare, work, clothing, other
--
-- owner_id is null for these directory listings. Approved orgs that sign up
-- still attach an owner. Re-run safely: upserts on org_id.

insert into public.organizations (org_id, name, location, services, owner_id)
values
  (
    'DEV-ORG',
    'Harbor House',
    'Midtown, San Diego',
    array['shelter', 'food', 'clothing']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-FOOD',
    'St. Martin''s Kitchen',
    'East Village, San Diego',
    array['food']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-HEALTH',
    'River Clinic',
    'Downtown, San Diego',
    array['healthcare']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-WORK',
    'WorkBridge',
    'Midtown, San Diego',
    array['work']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-CLOTHES',
    'Threads of Hope',
    'North Park, San Diego',
    array['clothing']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-OTHER',
    'Civic Resource Desk',
    'Downtown, San Diego',
    array['other']::public.service_kind[],
    null
  ),
  (
    'HVN-SEED-FAMILY',
    'North Star Family Shelter',
    'West End, San Diego',
    array['shelter', 'food', 'healthcare']::public.service_kind[],
    null
  )
on conflict (org_id) do update
set
  name = excluded.name,
  location = excluded.location,
  services = excluded.services;
