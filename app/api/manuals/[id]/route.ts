import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cloudflare";
import {
  deleteStoredManual,
  getStoredManual,
} from "@/lib/manuals/persistence";
import { requireAdmin } from "@/lib/auth/session";

type ManualRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ManualRouteProps) {
  await requireAdmin();
  const { id } = await params;
  const env = await getCloudflareEnv();
  const manual = await getStoredManual(env.DB, env.MANUAL_IMAGES, id);

  if (!manual) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ manual });
}

export async function DELETE(_request: Request, { params }: ManualRouteProps) {
  await requireAdmin();
  const { id } = await params;
  const env = await getCloudflareEnv();
  await deleteStoredManual(env.DB, id);
  return NextResponse.json({ ok: true });
}
