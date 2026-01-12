import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { processImage } from "@/lib/imageProcessor";
import { resolvePresetOptions } from "@/lib/presets";
import { ProcessOptions } from "@/lib/types";

export const maxDuration = 60; // 60 seconds max execution time
export const runtime = "nodejs"; // Use Node.js runtime

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const optionsStr = formData.get("options") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const parsedOptions: ProcessOptions = optionsStr ? JSON.parse(optionsStr) : {};
    const mergedOptions = resolvePresetOptions(parsedOptions.presetId, parsedOptions);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processImage(buffer, mergedOptions);
    const extension = result.info.format || "jpg";

    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": `image/${extension}`,
        "Content-Disposition": `attachment; filename=processed-${uuid()}.${extension}`,
      },
    });
  } catch (error) {
    console.error("Processing error", error);
    return NextResponse.json({ message: "Failed to process image" }, { status: 500 });
  }
}
