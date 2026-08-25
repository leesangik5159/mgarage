import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  OPEN_TIME,
  CLOSE_TIME,
  SLOT_INTERVAL_MINUTES,
  getBayConfig,
  kstDate,
} from "@/lib/business";

// GET /api/availability?date=YYYY-MM-DD&bayType=lift&duration=60
// 해당 날짜/베이종류/이용시간 기준으로 예약 가능한 시작 시각 목록을 반환합니다.
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

    const [openH, openM] = OPEN_TIME.split(":").map(Number);
    const [closeH, closeM] = CLOSE_TIME.split(":").map(Number);

    // 매장은 한국 시간(KST) 기준으로 운영되므로, 서버가 어느 시간대에서 돌아가든
    // 항상 한국 시간 기준으로 날짜 경계/영업시간을 계산합니다.
    const dayStart = kstDate(date, 0, 0, 0);
    const dayEnd = kstDate(date, 23, 59, 59);

    const supabase = getSupabaseServerClient();
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("start_time, end_time, bay_number")
      .eq("bay_type", bayType)
      .in("status", ["pending_payment", "paid"])
      .lt("start_time", dayEnd.toISOString())
      .gt("end_time", dayStart.toISOString());

    if (error) throw error;

    const slots = [];
    const openTime = kstDate(date, openH, openM, 0);
    const closeTime = kstDate(date, closeH, closeM, 0);

    const now = new Date();

    for (
      let slotStart = new Date(openTime);
      slotStart.getTime() + duration * 60000 <= closeTime.getTime();
      slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60000)
    ) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // 과거 시간은 예약 불가
      if (slotStart <= now) continue;

      const overlappingCount = reservations.filter((r) => {
        const rStart = new Date(r.start_time);
        const rEnd = new Date(r.end_time);
        return rStart < slotEnd && rEnd > slotStart;
      }).length;

      const availableCount = config.capacity - overlappingCount;

      if (availableCount > 0) {
        slots.push({
          startTime: slotStart.toISOString(),
          availableCount,
        });
      }
    }

    return NextResponse.json({ slots, capacity: config.capacity });
  } catch (err) {
    console.error("[availability] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 가능 시간을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
