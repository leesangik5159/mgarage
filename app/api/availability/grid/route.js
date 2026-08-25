import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { BAY_TYPES } from "@/lib/business";
import { fetchDayReservations, computeAllBayTypeSlots } from "@/lib/availability";

// GET /api/availability/grid?date=YYYY-MM-DD&duration=60
// 캘린더에서 날짜를 선택했을 때, 그 날짜의 "시간대별 x 베이종류별" 잔여 현황을
// 한 번에 반환합니다. (예약 마감된 시간대도 availableCount: 0 으로 포함해서
// 화면에 "마감"으로 표시할 수 있게 합니다.)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const duration = Number(searchParams.get("duration"));

    if (!date || !duration) {
      return NextResponse.json(
        { error: "date, duration 파라미터가 모두 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const reservations = await fetchDayReservations({ supabase, date });
    const byBayType = computeAllBayTypeSlots({ date, duration, reservations });

    const bayTypes = Object.values(BAY_TYPES).map((b) => ({
      key: b.key,
      label: b.label,
      capacity: b.capacity,
      slots: byBayType[b.key],
    }));

    return NextResponse.json({ date, duration, bayTypes });
  } catch (err) {
    console.error("[availability/grid] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 가능 현황을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
