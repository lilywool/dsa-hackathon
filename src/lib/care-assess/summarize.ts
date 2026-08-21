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
  objects?: Array<
    PredictedClassLike & {
      classes?: PredictedClassLike[];
    }
  >;
};

function flattenClasses(predictions: PredictionLike[]): PredictedClassLike[] {
  const out: PredictedClassLike[] = [];
  for (const prediction of predictions) {
    for (const entry of prediction.classes ?? []) {
      out.push(entry);
    }
    for (const object of prediction.objects ?? []) {
      out.push(object);
      for (const nested of object.classes ?? []) {
        out.push(nested);
      }
    }
  }
  return out;
}

function normalize(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function isNegativeLabel(label: string): boolean {
  return (
    /\b(none|no|negative|absent|healthy|clear|normal|not present)\b/.test(
      label,
    ) || label.includes("no jaundice") || label.includes("no wound")
  );
}

function pickBest(
  entries: PredictedClassLike[],
  match: (label: string, category: string) => boolean,
): PredictedClassLike | null {
  let best: PredictedClassLike | null = null;
  for (const entry of entries) {
    const label = normalize(entry.classLabel);
    const category = normalize(entry.category);
    if (!match(label, category)) continue;
    if (!best || (entry.confidence ?? 0) > (best.confidence ?? 0)) {
      best = entry;
    }
  }
  return best;
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

function severityFromLabel(label: string, confidence: number): string {
  if (/\b(severe|critical|high)\b/.test(label)) return "High";
  if (/\b(moderate|medium)\b/.test(label)) return "Moderate";
  if (/\b(mild|low|minor|superficial)\b/.test(label)) return "Low";
  return levelFromConfidence(confidence);
}

export function summarizeCarePredictions(
  predictions: PredictionLike[],
): CareFinding[] {
  const classes = flattenClasses(predictions);
  const findings: CareFinding[] = [];

  const jaundice = pickBest(
    classes,
    (label, category) =>
      category.includes("jaundice") || label.includes("jaundice"),
  );
  if (jaundice?.classLabel) {
    const label = normalize(jaundice.classLabel);
    const confidence = jaundice.confidence ?? 0;
    const negative = isNegativeLabel(label);
    const level = negative
      ? "None"
      : severityFromLabel(label, confidence);
    findings.push({
      kind: "jaundice",
      detected: !negative,
      label: jaundice.classLabel,
      confidence,
      level,
      immediateNeed: jaundiceNeed(level, negative),
    });
  }

  const wound = pickBest(
    classes,
    (label, category) =>
      category.includes("wound") ||
      label.includes("wound") ||
      label.includes("abrasion") ||
      label.includes("laceration") ||
      label.includes("scratch"),
  );
  if (wound?.classLabel) {
    const label = normalize(wound.classLabel);
    const confidence = wound.confidence ?? 0;
    const negative = isNegativeLabel(label);
    const severity = negative
      ? "None"
      : severityFromLabel(label, confidence);
    findings.push({
      kind: "wound",
      detected: !negative,
      label: wound.classLabel,
      confidence,
      level: severity,
      severity,
      immediateNeed: woundNeed(severity, negative),
    });
  }

  return findings;
}
