import sharp from "sharp";
import { ProcessOptions, ProcessResult, SupportedFormat } from "./types";

const DEFAULT_QUALITY = 85;
const MIN_QUALITY = 10;
const MAX_QUALITY = 100;

const isQualityDrivenFormat = (format: SupportedFormat): boolean =>
  ["jpeg", "png", "webp", "avif", "tiff"].includes(format);

const formatFromMetadata = (format?: string | null): SupportedFormat => {
  if (!format) return "jpeg";
  const normalized = format.toLowerCase();
  if (["jpg", "jpeg"].includes(normalized)) return "jpeg";
  if (["png"].includes(normalized)) return "png";
  if (["webp"].includes(normalized)) return "webp";
  if (["gif"].includes(normalized)) return "gif";
  if (["avif"].includes(normalized)) return "avif";
  if (["tiff"].includes(normalized)) return "tiff";
  if (["svg"].includes(normalized)) return "svg";
  return "jpeg";
};

const applyFormat = (
  pipeline: sharp.Sharp,
  format: SupportedFormat,
  quality: number
): sharp.Sharp => {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
    case "png":
      return pipeline.png({ quality, compressionLevel: 9, adaptiveFiltering: true });
    case "webp":
      return pipeline.webp({ quality, effort: 6 });
    case "gif":
      return pipeline.gif({ effort: 5 });
    case "avif":
      return pipeline.avif({ quality, effort: 6 });
    case "tiff":
      return pipeline.tiff({ quality, compression: "lzw" });
    case "svg":
      return pipeline; // sharp cannot encode SVG; return as-is
    default:
      return pipeline.jpeg({ quality });
  }
};

const buildPipeline = (
  buffer: Buffer,
  options: ProcessOptions,
  quality: number,
  format: SupportedFormat
): sharp.Sharp => {
  const resizeNeeded = Boolean(options.width || options.height);
  const base = sharp(buffer, { animated: true });

  let pipeline = resizeNeeded
    ? base.resize({
        width: options.width,
        height: options.height,
        fit: options.keepAspectRatio === false ? "fill" : "inside",
        withoutEnlargement: true,
      })
    : base;

  if (options.stripMetadata === false) {
    pipeline = pipeline.withMetadata();
  }

  return applyFormat(pipeline, format, quality);
};

const render = async (
  buffer: Buffer,
  options: ProcessOptions,
  quality: number,
  format: SupportedFormat
): Promise<ProcessResult> => {
  const pipeline = buildPipeline(buffer, options, quality, format);
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, info: { format: info.format ?? format, size: info.size, width: info.width, height: info.height } };
};

export const processImage = async (
  buffer: Buffer,
  options: ProcessOptions
): Promise<ProcessResult> => {
  const metadata = await sharp(buffer).metadata();
  const format = options.format ?? formatFromMetadata(metadata.format);
  const qualityBase = options.quality ?? DEFAULT_QUALITY;
  const qualityCap = Math.min(Math.max(qualityBase, MIN_QUALITY), MAX_QUALITY);

  // Formats where "quality" is ignored should be processed in a single pass.
  if (!isQualityDrivenFormat(format) || !options.targetSizeKB) {
    return render(buffer, options, qualityCap, format);
  }

  const targetBytes = options.targetSizeKB * 1024;

  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let bestQuality = qualityCap;
  let bestResult = await render(buffer, options, bestQuality, format);

  for (let i = 0; i < 6; i += 1) {
    const mid = Math.round((low + high) / 2);
    const result = await render(buffer, options, mid, format);
    const diff = Math.abs(result.info.size - targetBytes);
    const bestDiff = Math.abs(bestResult.info.size - targetBytes);

    if (diff < bestDiff) {
      bestResult = result;
      bestQuality = mid;
    }

    if (result.info.size > targetBytes) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Final pass with the best quality found.
  if (bestQuality !== qualityCap) {
    bestResult = await render(buffer, options, bestQuality, format);
  }

  return bestResult;
};
