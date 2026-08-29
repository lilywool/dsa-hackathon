export type CareFindingKind = "jaundice" | "wound";

export type CareFinding = {
  kind: CareFindingKind;
  detected: boolean;
  label: string;
  confidence: number;
  level: string;
  severity?: string;
  immediateNeed: string;
};

export type PredictedClassLike = {
  classLabel?: string;
  category?: string;
  confidence?: number;
};

export type PredictionLike = {
  classes?: PredictedClassLike[];
  texts?: Array<{ text?: string; category?: string; confidence?: number }>;
  labels?: Array<{ label?: string; text?: string; classLabel?: string; category?: string; confidence?: number } | string>;
  objects?: Array<
    PredictedClassLike & {
      classes?: PredictedClassLike[];
      texts?: Array<{ text?: string; category?: string; confidence?: number }>;
      labels?: Array<{ label?: string; text?: string; classLabel?: string; category?: string; confidence?: number } | string>;
    }
  >;
};

function normalize(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

export function isStringTrue(text: string | undefined): boolean {
  if (!text) return false;
  const raw = text.trim().toUpperCase();
  if (raw === "FALSE" || raw.includes("FALSE")) {
    return false;
  }
  if (raw === "TRUE" || raw.includes("TRUE")) {
    return true;
  }
  return false;
}

type ExtractedText = {
  text: string;
  confidence: number;
  category?: string;
};

function collectTexts(predictions: PredictionLike[]): ExtractedText[] {
  const items: ExtractedText[] = [];
  for (const pred of predictions ?? []) {
    if (pred.texts) {
      for (const t of pred.texts) {
        if (t.text) {
          items.push({
            text: t.text.trim(),
            confidence: t.confidence ?? 0.9,
            category: t.category,
          });
        }
      }
    }
    if (pred.classes) {
      for (const c of pred.classes) {
        if (c.classLabel) {
          items.push({
            text: c.classLabel.trim(),
            confidence: c.confidence ?? 0.9,
            category: c.category,
          });
        }
      }
    }
    if (pred.labels) {
      for (const l of pred.labels) {
        const str = typeof l === "string" ? l : l.label ?? l.classLabel ?? l.text;
        if (str) {
          items.push({
            text: str.trim(),
            confidence: typeof l === "object" ? l.confidence ?? 0.9 : 0.9,
            category: typeof l === "object" ? l.category : undefined,
          });
        }
      }
    }
    if (pred.objects) {
      for (const obj of pred.objects) {
        if (obj.classLabel) {
          items.push({
            text: obj.classLabel.trim(),
            confidence: obj.confidence ?? 0.9,
            category: obj.category,
          });
        }
        if (obj.texts) {
          for (const t of obj.texts) {
            if (t.text) {
              items.push({
                text: t.text.trim(),
                confidence: t.confidence ?? 0.9,
                category: t.category,
              });
            }
          }
        }
      }
    }
  }
  return items;
}

function levelFromConfidence(confidence: number): string {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.7) return "Moderate";
  return "Low";
}

function jaundiceNeed(level: string, negative: boolean): string {
  if (negative) return "No urgent jaundice follow-up indicated from this photo";
  if (level === "High") return "Seek medical care now";
  if (level === "Moderate") return "Seek care soon (same day if possible)";
  return "Monitor and check in with a clinic when you can";
}

function woundNeed(level: string, negative: boolean): string {
  if (negative) return "No urgent wound care indicated from this photo";
  if (level === "High") return "Seek wound care now — clean and cover if possible";
  if (level === "Moderate") return "Seek care soon for cleaning and dressing";
  return "Clean gently and monitor; ask for supplies if needed";
}

export function summarizeCarePredictions(
  predictions: PredictionLike[],
): CareFinding[] {
  const items = collectTexts(predictions);
  const findings: CareFinding[] = [];

  const hasCategories = items.some((i) => i.category);

  // Component completion order isn't guaranteed, so match by category when
  // available. Only fall back to array position if no result carries one.
  const jaundiceItem = hasCategories
    ? items.find((i) => i.category && normalize(i.category).includes("jaundice"))
    : items[0];

  const woundItem = hasCategories
    ? items.find((i) => i.category && normalize(i.category).includes("wound"))
    : items.length >= 2
      ? items[1]
      : items[0];

  if (jaundiceItem) {
    const detected = isStringTrue(jaundiceItem.text);
    const confidence = jaundiceItem.confidence;
    const level = detected ? levelFromConfidence(confidence) : "None";
    if (detected) {
      findings.push({
        kind: "jaundice",
        detected: true,
        label: jaundiceItem.text,
        confidence,
        level,
        immediateNeed: jaundiceNeed(level, false),
      });
    }
  }

  if (woundItem && (items.length >= 2 || woundItem !== jaundiceItem || items[0]?.category?.includes("wound"))) {
    const detected = isStringTrue(woundItem.text);
    const confidence = woundItem.confidence;
    const level = detected ? levelFromConfidence(confidence) : "None";
    if (detected) {
      findings.push({
        kind: "wound",
        detected: true,
        label: woundItem.text,
        confidence,
        level,
        severity: level,
        immediateNeed: woundNeed(level, false),
      });
    }
  }

  return findings;
}
