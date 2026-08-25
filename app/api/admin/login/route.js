import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkAdminPassword, getAdminCookieName, getAdminToken } from "@/lib/adminAuth";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!checkAdminPassword(password)) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = getAdminToken();
    const cookieStore = await cookies(); // Next.js 15+: cookies()는 비동기 API입니다.
    cookieStore.set(getAdminCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12시간
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/login] error:", err);
    return NextResponse.json(
      { error: err.message || "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
