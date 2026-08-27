import type { RequestStatus, ServiceKind } from "@/lib/supabase/database.types";
import {
  isServiceKind,
  needOptions,
  serviceLabels,
  serviceShortLabels,
} from "@/lib/services";

export const appName = "Haven";
export const appTagline = "Connecting people with organizations that help.";

export type NeedType = ServiceKind;
export type { RequestStatus };

export const needLabels = serviceLabels;
export const needShortLabels = serviceShortLabels;

export const currentParticipant = {
  firstName: "Lily",
};

export { needOptions, isServiceKind as isNeedType };
