-- Generated from san_diego_homelessness_resources.csv
-- Run: node scripts/generate-org-seed.mjs

delete from public.organizations
where org_id in (
  'DEV-ORG',
  'HVN-SEED-FOOD',
  'HVN-SEED-HEALTH',
  'HVN-SEED-WORK',
  'HVN-SEED-CLOTHES',
  'HVN-SEED-OTHER',
  'HVN-SEED-FAMILY',
  'HVN-0D6F48'
)
or owner_id is null;

insert into public.organizations (org_id, name, location, services, owner_id, website, phone, notes)
values
  ('SD-FATHER-JOES-VILLAGES', 'Father Joe''s Villages', '3350 E St, San Diego, CA 92102', array['shelter', 'food', 'healthcare', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://my.neighbor.org/', '800-466-3537', 'Large homelessness-services provider. Shelter/housing navigation, meals, Village Health Center, employment services, showers/mail/storage and other basic-needs services. General service entry points vary by program.'),
  ('SD-ALPHA-PROJECT-FOR-THE-HOMELESS', 'Alpha Project for the Homeless', '3737 Fifth Ave, Suite 203, San Diego, CA 92103', array['shelter', 'food', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://alphaproject.org/', '619-542-1877', 'Emergency/bridge and family shelters, food support, transitional employment through Take Back the Streets, supportive services and clothing support in some programs. Shelter intake may require coordinated referral.'),
  ('SD-SAN-DIEGO-RESCUE-MISSION', 'San Diego Rescue Mission', '120 Elm St, San Diego, CA 92101', array['shelter', 'food', 'healthcare', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://www.sdrescue.org/', '619-687-3720', 'Emergency shelter, residential recovery, meals, clothing/necessities, wellness/medical-dental connections, education and employment/housing support. Programs are generally referral-based; call 2-1-1 or SDRM.'),
  ('SD-THIRD-AVENUE-CHARITABLE-ORGANIZATION-TACO', 'Third Avenue Charitable Organization (TACO)', '1420 Third Ave, San Diego, CA 92101', array['food', 'healthcare', 'clothing', 'other']::public.service_kind[], null, 'https://www.tacosd.org/', '619-235-9445', 'Serves people experiencing homelessness and poverty with warm meals, clothing, device charging, mail services, help recovering ID documents, and a free medical/pharmacy clinic.'),
  ('SD-YOUTH-ASSISTANCE-COALITION', 'Youth Assistance Coalition', '2801 B St #238, San Diego, CA 92102', array['shelter', 'food', 'healthcare', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://www.yacsd.org/', '619-458-6588', 'Focused on youth experiencing homelessness. Provides or connects youth to meals, clothing/bedding, housing/shelter, health, counseling, job training, education, transportation and other resources.'),
  ('SD-INTERFAITH-COMMUNITY-SERVICES', 'Interfaith Community Services', '550 W Washington Ave, Escondido, CA 92025', array['shelter', 'food', 'healthcare', 'employment', 'other']::public.service_kind[], null, 'https://www.interfaithservices.org/', '760-489-6380', 'North County provider offering shelter/housing, emergency food/basic needs, employment/economic development, behavioral health/substance-use services, medical respite and case management.'),
  ('SD-COMMUNITY-CHRISTIAN-SERVICE-AGENCY-CCSA', 'Community Christian Service Agency (CCSA)', '4167 Rappahannock Ave, San Diego, CA 92117', array['shelter', 'food', 'healthcare', 'clothing', 'other']::public.service_kind[], null, 'https://www.ccsasandiego.org/', '858-274-2271', 'Emergency food and clothing, temporary housing/emergency shelter referrals, transportation help, ID/birth certificate assistance, resource counseling; Pacific Beach site has volunteer nursing/first-aid referrals.'),
  ('SD-NEW-DAY-URBAN-MINISTRIES', 'New Day Urban Ministries', '2459 Market St, San Diego, CA 92102', array['food', 'clothing', 'other']::public.service_kind[], null, 'https://newdayurbanministries.org/', '619-232-2753', 'Basic-needs support for people experiencing homelessness and poverty, including groceries/food, clothing, hygiene kits, casework and resource support.'),
  ('SD-SHARIAS-CLOSET', 'Sharia''s Closet', '6244 El Cajon Blvd, Suite 5, San Diego, CA 92115', array['clothing', 'other']::public.service_kind[], null, 'https://shariascloset.org/', '619-808-4979', 'Free emergency clothing and hygiene items for individuals and families in crisis. Personalized Bags of Hope; requests may be submitted directly or through caseworkers/referring agencies.'),
  ('SD-FEEDING-SAN-DIEGO', 'Feeding San Diego', '9477 Waples St, Suite 100, San Diego, CA 92121', array['food', 'other']::public.service_kind[], null, 'https://feedingsandiego.org/', '858-452-3663', 'Countywide hunger-relief and food-rescue nonprofit. Offers free food distributions, an on-site Marketplace, partner food sites, and CalFresh application assistance.'),
  ('SD-JACOBS-CUSHMAN-SAN-DIEGO-FOOD-BANK', 'Jacobs & Cushman San Diego Food Bank', '9850 Distribution Ave, San Diego, CA 92121', array['food', 'other']::public.service_kind[], null, 'https://www.sandiegofoodbank.org/', '858-527-1419', 'Major countywide food bank. Connects individuals to partner distributions and supports CalFresh outreach. Main warehouse is not necessarily a standard walk-in pantry; use distribution locator/partners.'),
  ('SD-SAN-DIEGO-HUNGER-COALITION', 'San Diego Hunger Coalition', '845 15th St, Suite 103, San Diego, CA 92101', array['food', 'other']::public.service_kind[], null, 'https://www.sdhunger.org/', '619-501-7917', 'Food-access organization focused on connecting people and systems to food assistance through research, education, advocacy and resource navigation rather than operating as a traditional shelter.'),
  ('SD-FAMILY-HEALTH-CENTERS-OF-SAN-DIEGO', 'Family Health Centers of San Diego', 'Multiple San Diego County locations', array['food', 'healthcare', 'employment', 'other']::public.service_kind[], null, 'https://www.fhcsd.org/', '619-515-2300', 'Community health network serving people experiencing homelessness; medical, dental, behavioral health, benefits enrollment and case-management/referral services. Reentry support also includes housing navigation and job training/employment referrals.'),
  ('SD-SAN-YSIDRO-HEALTH', 'San Ysidro Health', 'Multiple San Diego County locations', array['healthcare', 'other']::public.service_kind[], null, 'https://www.syhealth.org/', '619-662-4100', 'Community health provider offering accessible primary and specialty care, dental, pharmacy and other services. Call/text main line for appointments and service routing.'),
  ('SD-SAN-DIEGO-AMERICAN-INDIAN-HEALTH-CENTER', 'San Diego American Indian Health Center', '2630 First Ave, San Diego, CA 92103', array['healthcare', 'other']::public.service_kind[], null, 'https://www.sdaihc.org/', '619-234-2158', 'Community health center providing medical, dental, behavioral health and wellness services for all people; IHS-funded and FQHC.'),
  ('SD-SAN-DIEGO-WORKFORCE-PARTNERSHIP', 'San Diego Workforce Partnership', 'Career centers throughout San Diego County', array['employment', 'other']::public.service_kind[], null, 'https://workforce.org/', '619-319-9675', 'Free job-search, career-development, training, apprenticeship and employment programs for San Diego County job seekers; career centers serve ages 16+ and specialized populations.'),
  ('SD-THE-HUB---HOMELESSNESS-RESPONSE-CENTER', 'The Hub - Homelessness Response Center', 'San Diego, CA', array['shelter', 'food', 'healthcare', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://www.sandiego.gov/homelessness-strategies-and-solutions/services/homelessness-response-center', '211', 'System-navigation hub connecting unhoused individuals and families to housing/shelter, employment readiness, basic-needs assistance, case management and community resources. Referrals available through 2-1-1.'),
  ('SD-2-1-1-SAN-DIEGO', '2-1-1 San Diego', 'San Diego County, CA', array['shelter', 'food', 'healthcare', 'employment', 'clothing', 'other']::public.service_kind[], null, 'https://211sandiego.org/', '211', 'Countywide information and referral system. Useful as a fallback/router for shelter, food, health, employment, clothing and other social services when a direct provider is unavailable.')
on conflict (org_id) do update
set
  name = excluded.name,
  location = excluded.location,
  services = excluded.services,
  website = excluded.website,
  phone = excluded.phone,
  notes = excluded.notes;
