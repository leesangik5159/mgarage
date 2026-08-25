import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// GET /api/my-reservations?phone=010-1234-5678&carNumber=12가3456
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = (searchParams.get("phone") || "").trim();
    const carNumber = (searchParams.get("carNumber") || "").trim();

    if (!phone || !carNumber) {
      return NextResponse.json(
        { error: "휴대폰 번호와 차량번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("phone", phone)
      .eq("car_number", carNumber)
      .order("start_time", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reservations: data });
  } catch (err) {
    console.error("[my-reservations] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
