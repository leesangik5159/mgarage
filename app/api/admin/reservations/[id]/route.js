import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getAdminCookieName, isValidAdminToken } from "@/lib/adminAuth";

async function requireAdmin() {
  const cookieStore = await cookies(); // Next.js 15+: cookies()는 비동기 API입니다.
  const token = cookieStore.get(getAdminCookieName())?.value;
  return isValidAdminToken(token);
}

const ALLOWED_STATUS = ["pending_payment", "paid", "cancelled", "completed"];

// PATCH /api/admin/reservations/:id   body: { status }
export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { id } = await params; // Next.js 15+: 동적 라우트의 params는 Promise입니다.
    const { status } = await request.json();

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: "올바르지 않은 상태값입니다." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reservation: data });
  } catch (err) {
    console.error("[admin/reservations PATCH] error:", err);
    return NextResponse.json(
      { error: err.message || "상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
