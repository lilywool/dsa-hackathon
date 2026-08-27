"use server";

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assessCareImage,
  assessCareUpload,
  type CareAssessResult,
} from "@/lib/care-assess/eyepop";
import { isCareAssessImageId } from "@/lib/care-assess/demo-images";

const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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

export async function runCareAssessUpload(
  formData: FormData,
): Promise<CareAssessActionResult> {
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }

  if (!acceptedTypes.has(file.type.toLowerCase())) {
    return { ok: false, error: "Upload a JPG, PNG, or HEIC image." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That image is too large. Choose one under 10 MB." };
  }

  const extension = file.type === "image/png" ? ".png" : file.type === "image/jpeg" ? ".jpg" : ".heic";
  const tempPath = path.join(
    os.tmpdir(),
    `haven-care-${crypto.randomUUID()}${extension}`,
  );

  try {
    await fs.writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
    return { ok: true, result: await assessCareUpload(tempPath) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not assess that upload.",
    };
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}
