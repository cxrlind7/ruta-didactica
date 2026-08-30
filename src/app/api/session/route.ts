import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
