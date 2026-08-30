import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { TEST_DOWNLOADS } from "@/lib/downloads";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ entitlements: [] });

  const entitlements = await prisma.entitlement.findMany({
    where: { userId: sessionUser.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    entitlements: entitlements.map((e) => ({
      itemId: e.itemId,
      title: TEST_DOWNLOADS[e.itemId]?.title ?? e.itemId,
    })),
  });
}
