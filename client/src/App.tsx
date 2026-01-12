import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";

type Preset = {
  id: string;
  name: string;
  description: string;
};

type Dimensions = { width: number; height: number };

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

function App() {
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
    const fetchPresets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/presets`);
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
      const response = await fetch(`${API_BASE}/api/process`, {
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
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300 uppercase tracking-wide">Image Compressor</p>
          <h1 className="text-3xl font-semibold text-white">Next-gen Image Toolkit</h1>
          <p className="text-slate-400 max-w-xl mt-2">
            Compress, resize, convert, and strip metadata with production-ready presets. Drag an image and fine-tune the output.
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200 text-sm">
            Supports JPEG, PNG, WebP, GIF, SVG, AVIF, TIFF
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/70 p-6 hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-medium text-white">Drag & Drop your image</p>
                <p className="text-sm text-slate-400">or click below to browse files</p>
              </div>
              <label className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 cursor-pointer rounded-lg text-white text-sm shadow-card">
                Browse
                <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
              </label>
            </div>
            {file && (
              <div className="mt-4 text-slate-300 text-sm">
                Selected: <span className="text-white font-medium">{file.name}</span> ({formatBytes(file.size)})
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Original</h3>
                <span className="text-xs text-slate-400">
                  {formatBytes(originalInfo.size)}{" "}
                  {originalInfo.width && originalInfo.height ? `• ${originalInfo.width}x${originalInfo.height}px` : ""}
                </span>
              </div>
              {originalUrl ? (
                <img src={originalUrl} alt="Original preview" className="rounded-xl border border-slate-800 w-full max-h-96 object-contain bg-slate-950/70" />
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex items-center justify-center text-slate-500">
                  Add an image to see preview
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Processed</h3>
                <span className="text-xs text-slate-400">
                  {formatBytes(processedInfo.size)}{" "}
                  {processedInfo.width && processedInfo.height ? `• ${processedInfo.width}x${processedInfo.height}px` : ""}
                </span>
              </div>
              {processedUrl ? (
                <img src={processedUrl} alt="Processed preview" className="rounded-xl border border-slate-800 w-full max-h-96 object-contain bg-slate-950/70" />
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex items-center justify-center text-slate-500">
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
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-card space-y-4">
            <div>
              <label className="text-sm text-slate-300">Preset</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleOptionChange("presetId", preset.id)}
                    className={`text-left px-3 py-2 rounded-lg border ${
                      options.presetId === preset.id
                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                        : "border-slate-700 bg-slate-800/70 text-slate-200 hover:border-indigo-400"
                    } text-sm`}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-xs text-slate-400">{preset.description}</div>
                  </button>
                ))}
                <button
                  onClick={() => handleOptionChange("presetId", "")}
                  className={`text-left px-3 py-2 rounded-lg border ${
                    options.presetId === ""
                      ? "border-emerald-500 bg-emerald-500/20 text-white"
                      : "border-slate-700 bg-slate-800/70 text-slate-200 hover:border-emerald-400"
                  } text-sm`}
                >
                  <div className="font-semibold">Custom</div>
                  <div className="text-xs text-slate-400">Use your own settings</div>
                </button>
              </div>
              {presetDescription && (
                <p className="mt-2 text-xs text-amber-300/80">Preset note: {presetDescription}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-slate-300">Format</label>
                <select
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
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
                <label className="text-sm text-slate-300">Quality</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={options.quality}
                  onChange={(e) => handleOptionChange("quality", Number(e.target.value))}
                  className="accent-indigo-500"
                />
                <div className="text-xs text-slate-400">Target: {options.quality}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-slate-300">Target size (KB)</label>
                <input
                  type="number"
                  min={50}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={options.targetSizeKB}
                  onChange={(e) => handleOptionChange("targetSizeKB", Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-slate-300">Strip metadata</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.stripMetadata}
                    onChange={(e) => handleOptionChange("stripMetadata", e.target.checked)}
                    className="accent-indigo-500 h-4 w-4"
                  />
                  <span className="text-sm text-slate-300">Remove EXIF and other metadata</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-slate-300">Width (px)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="auto"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={options.width ?? ""}
                  onChange={(e) => handleDimensionChange("width", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-slate-300">Height (px)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="auto"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={options.height ?? ""}
                  onChange={(e) => handleDimensionChange("height", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.keepAspectRatio}
                  onChange={(e) => handleOptionChange("keepAspectRatio", e.target.checked)}
                  className="accent-indigo-500 h-4 w-4"
                />
                <span className="text-sm text-slate-300">Lock aspect ratio</span>
              </div>
              <button
                onClick={onProcess}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold shadow-card disabled:opacity-60"
              >
                {loading ? "Processing..." : "Process Image"}
              </button>
            </div>
            {error && <p className="text-sm text-amber-300">{error}</p>}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 mt-10 text-sm text-slate-500">
        © ScythK0TH
      </footer>
    </div>
  );
}

export default App;
