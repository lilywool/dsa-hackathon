"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, LoaderCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  runCareAssess,
  runCareAssessUpload,
} from "@/lib/care-assess/actions";
import {
  careAssessDemoImages,
  type CareAssessImageId,
} from "@/lib/care-assess/demo-images";
import type { CareAssessResult } from "@/lib/care-assess/eyepop";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function findingTitle(kind: "jaundice" | "wound"): string {
  return kind === "jaundice" ? "Jaundice" : "Skin wound";
}

export function CareAssessCallout() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<CareAssessImageId | null>(null);
  const [selectedUpload, setSelectedUpload] = useState(false);
  const [result, setResult] = useState<CareAssessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending || result || error) {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pending, result, error]);

  function onSelect(imageId: CareAssessImageId) {
    setPickerOpen(false);
    setSelectedId(imageId);
    setSelectedUpload(false);
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await runCareAssess(imageId);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
    });
  }

  function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is too large. Choose one under 10 MB.");
      setResult(null);
      return;
    }

    setPickerOpen(false);
    setSelectedId(null);
    setSelectedUpload(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      try {
        const response = await runCareAssessUpload(formData);
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setResult(response.result);
      } catch {
        setError("We could not upload that image. Please try a smaller file.");
      }
    });
  }

  const selectedImage = careAssessDemoImages.find(
    (image) => image.id === selectedId,
  );

  return (
    <section className="space-y-4 pb-12">
      <div className="rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/15">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-xl">Upload a picture to assess care</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                We screen for jaundice and open wounds, then show level of
                need.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 px-4 text-sm"
            onClick={() => setPickerOpen(true)}
            disabled={pending}
          >
            {pending ? "Assessing…" : "Choose a picture"}
          </Button>
        </div>
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="bottom-8 mx-auto max-h-[calc(100dvh-4rem)] max-w-lg overflow-y-auto rounded-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Choose a picture</SheetTitle>
            <SheetDescription>
              Chose a sample image trained by our model, or upload your own
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4 pb-6 sm:grid-cols-2">
            {careAssessDemoImages.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(image.id)}
                className="overflow-hidden rounded-2xl bg-card text-left ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={image.publicPath}
                    alt={image.description}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 280px"
                  />
                </div>
                <div className="p-3">
                  <p className="font-medium">{image.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tap to assess
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 pb-2">
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 text-sm font-medium transition-colors hover:bg-primary/10">
              <Upload className="size-5 text-primary" aria-hidden="true" />
              <span>
                Upload your own image
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  JPG, PNG, or HEIC · up to 10 MB
                </span>
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                className="sr-only"
                onChange={onUpload}
              />
            </label>
          </div>
        </SheetContent>
      </Sheet>

      {pending ? (
        <div
          ref={responseRef}
          className="scroll-mt-6 flex items-center gap-3 rounded-2xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Running care screening on your selected picture…
        </div>
      ) : null}

      {error ? (
        <p
          ref={responseRef}
          className="scroll-mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/20"
        >
          {error}
        </p>
      ) : null}

      {result && !pending ? (
        <div
          ref={responseRef}
          className="scroll-mt-6 space-y-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-lg">Care assessment</h3>
            {selectedImage || selectedUpload ? (
              <p className="text-xs text-muted-foreground">
                From {selectedImage?.label.toLowerCase() ?? "your uploaded picture"}
                {result.source === "demo" ? " · demo model output" : ""}
              </p>
            ) : null}
          </div>

          {result.findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jaundice or open wound signals above the screening threshold.
            </p>
          ) : (
            <ul className="space-y-3">
              {result.findings.map((finding) => (
                <li
                  key={finding.kind}
                  className={cn(
                    "rounded-xl px-4 py-3 ring-1",
                    finding.kind === "jaundice"
                      ? "bg-amber-500/8 ring-amber-500/20"
                      : "bg-rose-500/8 ring-rose-500/20",
                  )}
                >
                  <p className="font-medium">{findingTitle(finding.kind)}</p>
                  <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Level</dt>
                      <dd>{finding.level}</dd>
                    </div>
                    {finding.kind === "wound" && finding.severity ? (
                      <div>
                        <dt className="text-muted-foreground">Severity</dt>
                        <dd>{finding.severity}</dd>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Immediate need</dt>
                      <dd className="font-medium">{finding.immediateNeed}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Model label</dt>
                      <dd className="text-muted-foreground">
                        {finding.label} ({Math.round(finding.confidence * 100)}
                        % confidence)
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {result.error ? (
            <p className="text-xs text-muted-foreground">
              Live EyePop call failed ({result.error}); showing demo-derived
              output for this picture.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
