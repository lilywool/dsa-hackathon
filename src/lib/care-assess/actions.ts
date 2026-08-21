"use server";

import { assessCareImage, type CareAssessResult } from "@/lib/care-assess/eyepop";
import { isCareAssessImageId } from "@/lib/care-assess/demo-images";

export type CareAssessActionResult =
  | { ok: true; result: CareAssessResult }
  | { ok: false; error: string };

export async function runCareAssess(
  imageId: string,
): Promise<CareAssessActionResult> {
  if (!isCareAssessImageId(imageId)) {
    return { ok: false, error: "Choose one of the demo pictures." };
  }

  try {
    const result = await assessCareImage(imageId);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not assess that picture.",
    };
  }
}
