import type { OrgCapacityRow } from "@/lib/data/types";
import { isServiceKind, type ServiceKind } from "@/lib/services";

function slugifyOrgName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Map directory org_id like SD-JACOBS-CUSHMAN-SAN-DIEGO-FOOD-BANK → jacobs-cushman-san-diego-food-bank */
export function orgIdToCapacityKey(orgId: string | null | undefined) {
  if (!orgId) {
    return null;
  }
  return orgId
    .replace(/^SD-/i, "")
    .toLowerCase()
    .replace(/_/g, "-");
}

export function matchCapacityRows<T extends OrgCapacityRow>(
  rows: T[],
  organization: { name: string; org_id?: string | null },
): T[] {
  const keyFromId = orgIdToCapacityKey(organization.org_id);
  const keyFromName = slugifyOrgName(organization.name);
  const nameLower = organization.name.trim().toLowerCase();

  return rows.filter((row) => {
    if (row.organization.trim().toLowerCase() === nameLower) {
      return true;
    }
    if (keyFromId && row.org_key === keyFromId) {
      return true;
    }
    if (row.org_key === keyFromName) {
      return true;
    }
    return false;
  });
}

/** capacity category_enum uses `work` / `healthcare`; app uses employment / healthcare */
export function capacityEnumToService(
  categoryEnum: string,
): ServiceKind | null {
  if (categoryEnum === "work") {
    return "employment";
  }
  if (isServiceKind(categoryEnum)) {
    return categoryEnum;
  }
  if (categoryEnum === "health") {
    return "healthcare";
  }
  return null;
}

export function formatCapacityValue(value: number) {
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
