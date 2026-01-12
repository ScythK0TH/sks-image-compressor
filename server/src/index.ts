import cors from "cors";
import express, { Request, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { processImage } from "./imageProcessor";
import { listPresets, resolvePresetOptions } from "./presets";
import { ProcessOptions } from "./types";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/presets", (_req: Request, res: Response) => {
  res.json(listPresets());
});

app.post(
  "/api/process",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const parsedOptions: ProcessOptions = req.body.options
        ? JSON.parse(req.body.options)
        : {};

      const mergedOptions = resolvePresetOptions(
        parsedOptions.presetId,
        parsedOptions
      );

      const result = await processImage(req.file.buffer, mergedOptions);
      const extension = result.info.format || "jpg";

      res.setHeader("Content-Type", `image/${extension}`);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=processed-${uuid()}.${extension}`
      );
      res.send(result.buffer);
    } catch (error) {
      console.error("Processing error", error);
      res.status(500).json({ message: "Failed to process image" });
    }
  }
);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Image processing API running on http://localhost:${PORT}`);
});
