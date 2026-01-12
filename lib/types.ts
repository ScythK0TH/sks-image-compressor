export type SupportedFormat = "jpeg" | "png" | "webp" | "gif" | "avif" | "tiff" | "svg";

export interface ProcessOptions {
  format?: SupportedFormat;
  quality?: number; // 1 - 100
  targetSizeKB?: number;
  width?: number;
  height?: number;
  keepAspectRatio?: boolean;
  stripMetadata?: boolean;
  presetId?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  options: ProcessOptions;
}

export interface ProcessResult {
  buffer: Buffer;
  info: {
    format: string;
    size: number;
    width?: number;
    height?: number;
  };
}
