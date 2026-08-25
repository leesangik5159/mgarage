import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getBayConfig } from "@/lib/business";
import { fetchDayReservations, computeSlotsForBayType } from "@/lib/availability";

// GET /api/availability?date=YYYY-MM-DD&bayType=lift&duration=60
// 해당 날짜/베이종류/이용시간 기준으로 예약 가능한 시작 시각 목록을 반환합니다.
// (베이 종류 하나만 필요할 때 사용. 캘린더 예약 화면(날짜별 전체 베이 현황)은
// /api/availability/grid 를 사용합니다.)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // "YYYY-MM-DD"
    const bayType = searchParams.get("bayType");
    const duration = Number(searchParams.get("duration"));

    if (!date || !bayType || !duration) {
      return NextResponse.json(
        { error: "date, bayType, duration 파라미터가 모두 필요합니다." },
        { status: 400 }
      );
    }

    const config = getBayConfig(bayType); // 존재하지 않는 bayType이면 여기서 예외 발생

    const supabase = getSupabaseServerClient();
    const reservations = await fetchDayReservations({ supabase, date });
    const allSlots = computeSlotsForBayType({ date, bayType, duration, reservations });
    const slots = allSlots
      .filter((s) => s.availableCount > 0)
      .map((s) => ({ startTime: s.startTime, availableCount: s.availableCount }));

    return NextResponse.json({ slots, capacity: config.capacity });
  } catch (err) {
    console.error("[availability] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 가능 시간을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
