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

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: `File size exceeds limit of ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    let parsedOptions: ProcessOptions = {};
    try {
      parsedOptions = optionsStr ? JSON.parse(optionsStr) : {};
    } catch (parseError) {
      console.error("Failed to parse options", parseError);
      return NextResponse.json({ message: "Invalid options format" }, { status: 400 });
    }

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
    console.error("Processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json(
      { 
        message: "Failed to process image",
        error: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
