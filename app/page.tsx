"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";

type Preset = {
  id: string;
  name: string;
  description: string;
  options: {
    format?: string;
    quality?: number;
    targetSizeKB?: number;
    width?: number;
    height?: number;
    keepAspectRatio?: boolean;
    stripMetadata?: boolean;
  };
};

type Dimensions = { width: number; height: number };

const formatBytes = (bytes?: number) => {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
};

const readDimensions = (source: Blob | string): Promise<Dimensions> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = typeof source === "string" ? source : URL.createObjectURL(source);
  });

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [originalInfo, setOriginalInfo] = useState<Partial<Dimensions> & { size?: number }>({});
  const [processedInfo, setProcessedInfo] = useState<Partial<Dimensions> & { size?: number }>({});
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState({
    presetId: "",
    format: "webp",
    quality: 85,
    targetSizeKB: 500,
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    keepAspectRatio: true,
    stripMetadata: true,
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(initialTheme);
    document.body.classList.remove("light", "dark");
    document.body.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    document.body.classList.remove("light", "dark");
    document.body.classList.add(newTheme);
  };

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await fetch("/api/presets");
        if (res.ok) {
          const data = await res.json();
          setPresets(data);
        }
      } catch (err) {
        console.error("Failed to load presets", err);
      }
    };
    fetchPresets();
  }, []);

  const handleFile = async (incoming: File) => {
    setError(null);
    setFile(incoming);
    setProcessedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const objectUrl = URL.createObjectURL(incoming);
    setOriginalUrl(objectUrl);
    const size = incoming.size;

    try {
      const dims = await readDimensions(objectUrl);
      setAspectRatio(dims.width / dims.height);
      setOriginalInfo({ ...dims, size });
      if (options.keepAspectRatio && options.width && !options.height) {
        setOptions((prev) => ({
          ...prev,
          height: Math.round((prev.width ?? dims.width) / (dims.width / dims.height)),
        }));
      }
    } catch (e) {
      console.error("Dimension read failed", e);
      setOriginalInfo({ size });
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleOptionChange = (key: keyof typeof options, value: string | number | boolean) => {
    setOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePresetSelect = (presetId: string) => {
    if (!presetId) {
      // Reset to default values for Custom preset
      setOptions({
        presetId: "",
        format: "webp",
        quality: 85,
        targetSizeKB: 500,
        width: undefined,
        height: undefined,
        keepAspectRatio: true,
        stripMetadata: true,
      });
      return;
    }

    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    // Apply preset options to UI state
    setOptions((prev) => ({
      ...prev,
      presetId,
      ...preset.options,
      // Preserve width/height if they were manually set, unless preset specifies them
      width: preset.options.width !== undefined ? preset.options.width : prev.width,
      height: preset.options.height !== undefined ? preset.options.height : prev.height,
    }));
  };

  const handleDimensionChange = (key: "width" | "height", value: number | undefined) => {
    if (!options.keepAspectRatio || !aspectRatio) {
      setOptions((prev) => ({ ...prev, [key]: value }));
      return;
    }

    if (key === "width" && value) {
      setOptions((prev) => ({
        ...prev,
        width: value,
        height: Math.round(value / aspectRatio),
      }));
    } else if (key === "height" && value) {
      setOptions((prev) => ({
        ...prev,
        height: value,
        width: Math.round(value * aspectRatio),
      }));
    } else {
      setOptions((prev) => ({ ...prev, [key]: value }));
    }
  };

  const onProcess = async () => {
    if (!file) {
      setError("Please add an image to process.");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const payload = {
      ...options,
      width: options.width ? Number(options.width) : undefined,
      height: options.height ? Number(options.height) : undefined,
      quality: Number(options.quality),
      targetSizeKB: Number(options.targetSizeKB),
      presetId: options.presetId || undefined,
    };
    formData.append("options", JSON.stringify(payload));

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Processing failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      const dims = await readDimensions(url).catch(() => undefined);
      setProcessedInfo({
        size: blob.size,
        width: dims?.width,
        height: dims?.height,
      });
    } catch (err) {
      console.error(err);
      setError("Unable to process image. Please verify the inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const presetDescription = useMemo(
    () => presets.find((p) => p.id === options.presetId)?.description,
    [presets, options.presetId]
  );

  return (
    <div className="min-h-screen pb-16">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm uppercase tracking-wide dark:text-slate-300 text-slate-600">Image Compressor</p>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg dark:bg-slate-800 bg-slate-200 hover:dark:bg-slate-700 hover:bg-slate-300 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 dark:text-yellow-400 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold dark:text-white text-slate-900">Next-gen Image Toolkit</h1>
            <p className="text-sm sm:text-base dark:text-slate-400 text-slate-600 max-w-xl mt-2">
              Compress, resize, convert, and strip metadata with production-ready presets. Drag an image and fine-tune the output.
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full dark:bg-slate-900/70 bg-white/70 dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-700 text-xs sm:text-sm shadow-sm">
              Supports JPEG, PNG, WebP, GIF, SVG, AVIF, TIFF
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed dark:border-slate-700 border-slate-300 rounded-xl sm:rounded-2xl dark:bg-slate-900/70 bg-white/70 p-4 sm:p-6 hover:dark:border-indigo-400 hover:border-indigo-500 transition-colors"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <p className="text-base sm:text-lg font-medium dark:text-white text-slate-900">Drag & Drop your image</p>
                <p className="text-xs sm:text-sm dark:text-slate-400 text-slate-600">or click below to browse files</p>
              </div>
              <label className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 cursor-pointer rounded-lg text-white text-sm font-medium shadow-sm transition-colors w-full sm:w-auto text-center">
                Browse
                <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
              </label>
            </div>
            {file && (
              <div className="mt-4 dark:text-slate-300 text-slate-700 text-xs sm:text-sm">
                Selected: <span className="font-medium dark:text-white text-slate-900">{file.name}</span> ({formatBytes(file.size)})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl sm:rounded-2xl dark:bg-slate-900/70 bg-white/70 dark:border-slate-800 border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold dark:text-white text-slate-900">Original</h3>
                <span className="text-xs dark:text-slate-400 text-slate-600">
                  {formatBytes(originalInfo.size)}{" "}
                  {originalInfo.width && originalInfo.height ? `• ${originalInfo.width}x${originalInfo.height}px` : ""}
                </span>
              </div>
              {originalUrl ? (
                <img src={originalUrl} alt="Original preview" className="rounded-lg sm:rounded-xl dark:border-slate-800 border-slate-200 w-full max-h-64 sm:max-h-96 object-contain dark:bg-slate-950/70 bg-slate-50/70" />
              ) : (
                <div className="h-40 sm:h-48 rounded-lg sm:rounded-xl border border-dashed dark:border-slate-700 border-slate-300 dark:bg-slate-950/60 bg-slate-50/60 flex items-center justify-center dark:text-slate-500 text-slate-400 text-sm">
                  Add an image to see preview
                </div>
              )}
            </div>

            <div className="rounded-xl sm:rounded-2xl dark:bg-slate-900/70 bg-white/70 dark:border-slate-800 border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold dark:text-white text-slate-900">Processed</h3>
                <span className="text-xs dark:text-slate-400 text-slate-600">
                  {formatBytes(processedInfo.size)}{" "}
                  {processedInfo.width && processedInfo.height ? `• ${processedInfo.width}x${processedInfo.height}px` : ""}
                </span>
              </div>
              {processedUrl ? (
                <img src={processedUrl} alt="Processed preview" className="rounded-lg sm:rounded-xl dark:border-slate-800 border-slate-200 w-full max-h-64 sm:max-h-96 object-contain dark:bg-slate-950/70 bg-slate-50/70" />
              ) : (
                <div className="h-40 sm:h-48 rounded-lg sm:rounded-xl border border-dashed dark:border-slate-700 border-slate-300 dark:bg-slate-950/60 bg-slate-50/60 flex items-center justify-center dark:text-slate-500 text-slate-400 text-sm">
                  Run processing to view result
                </div>
              )}
              {processedUrl && (
                <a
                  className="mt-3 inline-flex items-center justify-center w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                  href={processedUrl}
                  download
                >
                  Download processed image
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl sm:rounded-2xl dark:bg-slate-900/70 bg-white/70 dark:border-slate-800 border-slate-200 p-4 shadow-sm space-y-4">
            <div>
              <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Preset</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors ${
                      options.presetId === preset.id
                        ? "border-indigo-500 bg-indigo-500/20 dark:text-white text-slate-900"
                        : "dark:border-slate-700 border-slate-300 dark:bg-slate-800/70 bg-slate-100/70 dark:text-slate-200 text-slate-700 hover:dark:border-indigo-400 hover:border-indigo-500"
                    }`}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-xs dark:text-slate-400 text-slate-600 line-clamp-2">{preset.description}</div>
                  </button>
                ))}
                <button
                  onClick={() => handlePresetSelect("")}
                  className={`text-left px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors ${
                    options.presetId === ""
                      ? "border-emerald-500 bg-emerald-500/20 dark:text-white text-slate-900"
                      : "dark:border-slate-700 border-slate-300 dark:bg-slate-800/70 bg-slate-100/70 dark:text-slate-200 text-slate-700 hover:dark:border-emerald-400 hover:border-emerald-500"
                  }`}
                >
                  <div className="font-semibold">Custom</div>
                  <div className="text-xs dark:text-slate-400 text-slate-600">Use your own settings</div>
                </button>
              </div>
              {presetDescription && (
                <p className="mt-2 text-xs dark:text-amber-300/80 text-amber-700">Preset note: {presetDescription}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Format</label>
                <select
                  className="dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={options.format}
                  onChange={(e) => handleOptionChange("format", e.target.value)}
                >
                  {["jpeg", "png", "webp", "gif", "svg", "avif", "tiff"].map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Quality</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={options.quality}
                  onChange={(e) => handleOptionChange("quality", Number(e.target.value))}
                  className="accent-indigo-500"
                />
                <div className="text-xs dark:text-slate-400 text-slate-600">Target: {options.quality}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Target size (KB)</label>
                <input
                  type="number"
                  min={50}
                  className="dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={options.targetSizeKB}
                  onChange={(e) => handleOptionChange("targetSizeKB", Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Strip metadata</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.stripMetadata}
                    onChange={(e) => handleOptionChange("stripMetadata", e.target.checked)}
                    className="accent-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Remove EXIF and other metadata</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Width (px)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="auto"
                  className="dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={options.width ?? ""}
                  onChange={(e) => handleDimensionChange("width", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Height (px)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="auto"
                  className="dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={options.height ?? ""}
                  onChange={(e) => handleDimensionChange("height", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.keepAspectRatio}
                  onChange={(e) => handleOptionChange("keepAspectRatio", e.target.checked)}
                  className="accent-indigo-500 h-4 w-4"
                />
                <span className="text-xs sm:text-sm dark:text-slate-300 text-slate-700">Lock aspect ratio</span>
              </div>
              <button
                onClick={onProcess}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors w-full sm:w-auto justify-center"
              >
                {loading ? "Processing..." : "Process Image"}
              </button>
            </div>
            {error && <p className="text-xs sm:text-sm dark:text-amber-300 text-amber-700">{error}</p>}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10 text-xs sm:text-sm dark:text-slate-500 text-slate-600">
        © ScythK0TH
      </footer>
    </div>
  );
}
