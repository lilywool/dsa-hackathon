export const careAssessImageIds = ["jaundice", "wounds"] as const;

export type CareAssessImageId = (typeof careAssessImageIds)[number];

export type CareAssessDemoImage = {
  id: CareAssessImageId;
  label: string;
  description: string;
  publicPath: string;
  fileName: string;
};

export const careAssessDemoImages: CareAssessDemoImage[] = [
  {
    id: "jaundice",
    label: "Face photo",
    description: "Demo photo for jaundice screening",
    publicPath: "/demo/care-assess/jaundice.png",
    fileName: "jaundice.png",
  },
  {
    id: "wounds",
    label: "Skin photo",
    description: "Demo photo for open wound screening",
    publicPath: "/demo/care-assess/wounds.png",
    fileName: "wounds.png",
  },
];

export function isCareAssessImageId(value: string): value is CareAssessImageId {
  return (careAssessImageIds as readonly string[]).includes(value);
}

export function getCareAssessDemoImage(
  id: CareAssessImageId,
): CareAssessDemoImage {
  const image = careAssessDemoImages.find((entry) => entry.id === id);
  if (!image) {
    throw new Error(`Unknown care assess image: ${id}`);
  }
  return image;
}
