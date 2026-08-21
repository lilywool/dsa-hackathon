import fs from "node:fs";
import path from "node:path";

const csvPath = path.join(process.cwd(), "san_diego_homelessness_resources.csv");
const raw = fs.readFileSync(csvPath, "utf8");
const lines = raw.trim().split("\n");
const headers = parseCsvLine(lines[0]);

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function slug(name) {
  const base = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase()
    .slice(0, 48);
  return `SD-${base}`;
}

const serviceMap = {
  shelter: "shelter",
  food: "food",
  health: "healthcare",
  employment: "employment",
  clothes: "clothing",
  other: "other",
};

function servicesFromRow(row) {
  const services = [];
  for (const col of Object.keys(serviceMap)) {
    const val = (row[col] || "").trim().toLowerCase();
    if (val && val !== "no") {
      services.push(serviceMap[col]);
    }
  }
  return services;
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? ""]));
});

const valuesSql = rows
  .map((row) => {
    const services = servicesFromRow(row);
    const orgId = slug(row.organization);
    return `  (${sqlString(orgId)}, ${sqlString(row.organization)}, ${sqlString(row.address)}, array[${services.map((service) => `'${service}'`).join(", ")}]::public.service_kind[], null, ${sqlString(row.website)}, ${sqlString(row.phone)}, ${sqlString(row.notes)})`;
  })
  .join(",\n");

const sql = `-- Generated from san_diego_homelessness_resources.csv
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
${valuesSql}
on conflict (org_id) do update
set
  name = excluded.name,
  location = excluded.location,
  services = excluded.services,
  website = excluded.website,
  phone = excluded.phone,
  notes = excluded.notes;
`;

fs.writeFileSync(path.join(process.cwd(), "supabase/seed_organizations.sql"), sql);
console.log(`Wrote ${rows.length} organizations to supabase/seed_organizations.sql`);
