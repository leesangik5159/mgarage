import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getAdminCookieName, isValidAdminToken } from "@/lib/adminAuth";
import { kstDate } from "@/lib/business";

async function requireAdmin() {
  const cookieStore = await cookies(); // Next.js 15+: cookies()는 비동기 API입니다.
  const token = cookieStore.get(getAdminCookieName())?.value;
  return isValidAdminToken(token);
}

// GET /api/admin/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("reservations")
      .select("*")
      .order("start_time", { ascending: true });

    if (from) query = query.gte("start_time", kstDate(from, 0, 0, 0).toISOString());
    if (to) query = query.lte("start_time", kstDate(to, 23, 59, 59).toISOString());

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ reservations: data });
  } catch (err) {
    console.error("[admin/reservations GET] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
