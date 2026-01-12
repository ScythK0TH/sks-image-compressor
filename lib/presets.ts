import { Preset, ProcessOptions } from "./types";

const presets: Preset[] = [
  {
    id: "size-first",
    name: "Size Saver",
    description: "Reduce file size aggressively while keeping perceived quality high.",
    options: {
      quality: 70,
      targetSizeKB: 300,
      stripMetadata: true,
    },
  },
  {
    id: "quality-first",
    name: "Quality Focus",
    description: "Preserve maximum quality; minimal compression, metadata kept.",
    options: {
      quality: 95,
      stripMetadata: false,
    },
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Medium compression balancing file size and clarity.",
    options: {
      quality: 85,
      stripMetadata: true,
    },
  },
  {
    id: "thumbnail",
    name: "Thumbnail",
    description: "Small preview images with metadata stripped.",
    options: {
      width: 320,
      height: 320,
      keepAspectRatio: true,
      quality: 70,
      stripMetadata: true,
    },
  },
  {
    id: "web-optimized",
    name: "Web Optimized",
    description: "Convert to WebP, strip metadata, and keep size small for fast loading.",
    options: {
      format: "webp",
      quality: 75,
      targetSizeKB: 400,
      stripMetadata: true,
    },
  },
  {
    id: "archive",
    name: "Professional Archive",
    description: "TIFF format for long-term archival storage. Lossless quality, all metadata preserved, industry standard format.",
    options: {
      format: "tiff",
      quality: 100,
      stripMetadata: false,
    },
  },
  {
    id: "format-converter",
    name: "Format Converter",
    description: "Convert file format only (e.g., WebP to PNG). Preserves original quality, dimensions, and metadata.",
    options: {
      quality: 100,
      stripMetadata: false,
      // No width/height - preserves original dimensions
      // No targetSizeKB - no compression, just format conversion
    },
  },
];

export const listPresets = (): Preset[] => presets;

export const resolvePresetOptions = (
  presetId: string | undefined,
  options: ProcessOptions
): ProcessOptions => {
  if (!presetId) return options;

  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return options;

  return {
    ...preset.options,
    ...options,
  };
};
