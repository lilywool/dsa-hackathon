import path from "node:path";

import EyePop, {
  InferenceType,
  PopComponentType,
  type Pop,
} from "@eyepop.ai/eyepop";

import {
  getCareAssessDemoImage,
  type CareAssessImageId,
} from "@/lib/care-assess/demo-images";
import {
  summarizeCarePredictions,
  type CareFinding,
  type PredictionLike,
} from "@/lib/care-assess/summarize";

const CARE_ASSESS_POP: Pop = {
  components: [
    {
      type: PopComponentType.INFERENCE,
      inferenceTypes: [InferenceType.IMAGE_CLASSIFICATION],
      ability:
        "ucsd-edu-malsaiari.image-classify.Jaundice-Classification---Face-and-Body---Aug-2026:latest",
      categoryName:
        "image-classify.Jaundice-Classification---Face-and-Body---Aug-2026",
      confidenceThreshold: 0.7,
    },
    {
      type: PopComponentType.INFERENCE,
      inferenceTypes: [InferenceType.IMAGE_CLASSIFICATION],
      ability:
        "ucsd-edu-malsaiari.image-classify.wound-triage-classification:latest",
      categoryName: "image-classify.wound-triage-classification",
      confidenceThreshold: 0.7,
    },
  ],
};

function demoPredictions(imageId: CareAssessImageId): PredictionLike[] {
  if (imageId === "jaundice") {
    return [
      {
        classes: [
          {
            category:
              "image-classify.Jaundice-Classification---Face-and-Body---Aug-2026",
            classLabel: "jaundice",
            confidence: 0.94,
          },
          {
            category: "image-classify.wound-triage-classification",
            classLabel: "no wound",
            confidence: 0.88,
          },
        ],
      },
    ];
  }

  return [
    {
      classes: [
        {
          category:
            "image-classify.Jaundice-Classification---Face-and-Body---Aug-2026",
          classLabel: "no jaundice",
          confidence: 0.91,
        },
        {
          category: "image-classify.wound-triage-classification",
          classLabel: "open wound moderate",
          confidence: 0.9,
        },
      ],
    },
  ];
}

async function runEyePop(imagePath: string): Promise<PredictionLike[]> {
  const apiKey = process.env.EYEPOP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EYEPOP_API_KEY");
  }

  const endpoint = EyePop.workerEndpoint({
    pop: CARE_ASSESS_POP,
    auth: { apiKey },
  });

  await endpoint.connect();
  try {
    const results = await endpoint.process({
      source: { path: imagePath },
    });
    const predictions: PredictionLike[] = [];
    for await (const prediction of results) {
      predictions.push(prediction as PredictionLike);
    }
    return predictions;
  } finally {
    await endpoint.disconnect();
  }
}

export type CareAssessResult = {
  imageId: CareAssessImageId;
  source: "eyepop" | "demo";
  findings: CareFinding[];
  raw: PredictionLike[];
  error?: string;
};

export async function assessCareImage(
  imageId: CareAssessImageId,
): Promise<CareAssessResult> {
  const image = getCareAssessDemoImage(imageId);
  const imagePath = path.join(
    process.cwd(),
    "public",
    "demo",
    "care-assess",
    image.fileName,
  );

  if (!process.env.EYEPOP_API_KEY) {
    const raw = demoPredictions(imageId);
    return {
      imageId,
      source: "demo",
      findings: summarizeCarePredictions(raw).filter((finding) => finding.detected),
      raw,
    };
  }

  try {
    const raw = await runEyePop(imagePath);
    const findings = summarizeCarePredictions(raw).filter(
      (finding) => finding.detected,
    );
    return { imageId, source: "eyepop", findings, raw };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EyePop assessment failed";
    const raw = demoPredictions(imageId);
    return {
      imageId,
      source: "demo",
      findings: summarizeCarePredictions(raw).filter((finding) => finding.detected),
      raw,
      error: message,
    };
  }
}
