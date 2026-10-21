// VYBE — Client-side dominant-color extraction from item photos.
//
// Answers "can we coordinate from images, not just text?" — yes, at least for
// color: the photo is sampled on a <canvas>, pixels are quantized into hue
// buckets + neutral buckets, and the dominant ones are mapped to VYBE's
// color families. No server, no AI, no extra dependency — it runs instantly
// in the browser during upload.
//
// This extracts COLOR only. Recognizing patterns, cuts or garment types from
// photos would need a vision model — deliberately out of scope here.

import { hexToHsl, nearestFamily, hslToHex } from "@/lib/colors";

export interface ExtractedColor {
  hex: string;
  name: string; // nearest VYBE color family
  share: number; // 0..1 of sampled pixels
}

const SAMPLE_SIZE = 72;
const MIN_SHARE = 0.05;

interface Bucket {
  count: number;
  hueCos: number;
  hueSin: number;
  satSum: number;
  lightSum: number;
  key: string;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

function bucketKeyFor(h: number, s: number, l: number): string {
  if (s <= 14) {
    // Neutral sub-buckets — fashion cares about white vs cream vs charcoal.
    if (l >= 93) return "neutral:white";
    if (l >= 82) return "neutral:ivory";
    if (l >= 62) return "neutral:grey";
    if (l >= 34) return "neutral:charcoal";
    return "neutral:black";
  }
  return `hue:${Math.floor(h / 15) * 15}`;
}

async function loadSource(
  source: File | Blob | string
): Promise<{ width: number; height: number; data: ImageData } | null> {
  let width = 0;
  let height = 0;
  let drawable: CanvasImageSource | null = null;
  let release: (() => void) | null = null;

  if (typeof source === "string") {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load image"));
      image.src = source;
    });
    width = image.naturalWidth;
    height = image.naturalHeight;
    drawable = image;
  } else {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(source);
    width = bitmap.width;
    height = bitmap.height;
    drawable = bitmap;
    release = () => bitmap.close();
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(drawable, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return { width, height, data: context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE) };
  } finally {
    release?.();
  }
}

/**
 * Extract the dominant colors of a clothing photo, most-present first.
 * Backgrounds are not segmented — plain backgrounds simply land in the
 * neutral buckets, which fashion palettes treat as pairable anyway.
 */
export async function extractClothingColors(
  source: File | Blob | string,
  maxColors = 3
): Promise<ExtractedColor[]> {
  try {
    const frame = await loadSource(source);
    if (!frame) return [];

    const buckets = new Map<string, Bucket>();
    let sampled = 0;
    const pixels = frame.data.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha < 125) continue;
      const { h, s, l } = rgbToHsl(pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255);
      const key = bucketKeyFor(h, s, l);
      const bucket = buckets.get(key) ?? {
        count: 0,
        hueCos: 0,
        hueSin: 0,
        satSum: 0,
        lightSum: 0,
        key,
      };
      const radians = (h * Math.PI) / 180;
      bucket.count += 1;
      bucket.hueCos += Math.cos(radians);
      bucket.hueSin += Math.sin(radians);
      bucket.satSum += s;
      bucket.lightSum += l;
      buckets.set(key, bucket);
      sampled += 1;
    }

    if (sampled === 0) return [];

    const extracted: ExtractedColor[] = [];
    for (const bucket of [...buckets.values()].sort((a, b) => b.count - a.count)) {
      const share = bucket.count / sampled;
      if (share < MIN_SHARE) break;
      if (extracted.length >= maxColors) break;
      const meanSat = bucket.satSum / bucket.count;
      const meanLight = bucket.lightSum / bucket.count;
      let hex: string;
      if (bucket.key.startsWith("neutral:")) {
        hex = hslToHex(40, Math.min(meanSat, 18), meanLight);
      } else {
        const meanHue = ((Math.atan2(bucket.hueSin, bucket.hueCos) * 180) / Math.PI + 360) % 360;
        hex = hslToHex(meanHue, meanSat, meanLight);
      }
      const family = nearestFamily(hex);
      // Map to the family's canonical hex for a cleaner, consistent swatch.
      if (!extracted.some((existing) => existing.name === family.name)) {
        extracted.push({ hex: family.hex, name: family.name, share });
      }
    }
    return extracted;
  } catch {
    // Extraction is a bonus feature — never let it break the upload flow.
    return [];
  }
}
