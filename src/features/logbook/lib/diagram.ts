/**
 * The API has no file storage; a week's diagram is persisted in the entry's
 * `supporting_evidence_url` column as an image data URL. Images are downscaled
 * and re-encoded client-side to keep each entry payload small.
 */
const MAX_DIMENSION = 1400;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DIAGRAM_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This file could not be read as an image."));
    image.src = src;
  });
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("This file could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function prepareDiagram(file: File): Promise<string> {
  if (!ACCEPTED_DIAGRAM_TYPES.includes(file.type)) {
    throw new Error("Use a PNG, JPG, WEBP or SVG image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Images must be smaller than 10 MB.");
  }

  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.round((image.naturalWidth || MAX_DIMENSION) * scale);
  const height = Math.round((image.naturalHeight || MAX_DIMENSION) * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;

  // White matte so transparent PNG/SVG diagrams stay legible as JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Only render evidence that is an image we can display safely. */
export function isDisplayableImage(url: string | null | undefined): url is string {
  return Boolean(url && (url.startsWith("data:image/") || /^https?:\/\//.test(url)));
}
