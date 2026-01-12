import { NextResponse } from "next/server";
import { listPresets } from "@/lib/presets";

export async function GET() {
  return NextResponse.json(listPresets());
}
