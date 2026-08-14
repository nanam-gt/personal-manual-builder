import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cloudflare";
import {
  listStoredManuals,
  saveStoredManual,
} from "@/lib/manuals/persistence";
import { requireAdmin } from "@/lib/auth/session";
import type { StoredManual } from "@/app/manuals/local-store";

export async function GET() {
  await requireAdmin();
  const env = await getCloudflareEnv();
  const manuals = await listStoredManuals(env.DB, env.MANUAL_IMAGES);
  return NextResponse.json({ manuals });
}

export async function POST(request: Request) {
  await requireAdmin();
  const env = await getCloudflareEnv();
  const manual = (await request.json()) as StoredManual;
  const saved = await saveStoredManual(env.DB, env.MANUAL_IMAGES, manual);
  return NextResponse.json({ manual: saved });
}
