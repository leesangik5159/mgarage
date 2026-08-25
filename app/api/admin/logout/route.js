import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminCookieName } from "@/lib/adminAuth";

export async function POST() {
  const cookieStore = await cookies(); // Next.js 15+: cookies()는 비동기 API입니다.
  cookieStore.set(getAdminCookieName(), "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
