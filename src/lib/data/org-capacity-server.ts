import { readFile } from "fs/promises";
import path from "path";

import type { OrgCapacityRow } from "@/lib/data/types";

/** Server-only: read capacity JSON from disk (do not import from client components). */
export async function loadOrgCapacityRows(): Promise<OrgCapacityRow[]> {
  const filePath = path.join(process.cwd(), "public/data/org_capacity.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as OrgCapacityRow[];
}
