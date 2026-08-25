// ============================================
// 예약 가능 현황 계산 공통 로직
// - /api/availability (특정 베이 종류 하나만) 와
// - /api/availability/grid (모든 베이 종류를 한 번에, 캘린더 예약용)
// 두 API가 이 파일의 함수를 공유해서 씁니다. (로직이 두 곳에서 따로 놀며
// 서로 어긋나는 것을 방지하기 위함입니다.)
// ============================================

import {
  OPEN_TIME,
  CLOSE_TIME,
  SLOT_INTERVAL_MINUTES,
  BAY_TYPES,
  kstDate,
} from "./business.js";

// 해당 날짜의 영업 시작/종료 시각을 계산합니다.
// CLOSE_TIME이 "24:00"(24시간 운영)인 경우 시(hour)가 24가 되어 kstDate로 바로
// 만들 수 없으므로, 당일 자정 + 24시간(=다음날 자정)으로 별도 계산합니다.
export function getOpenCloseTime(date) {
  const [openH, openM] = OPEN_TIME.split(":").map(Number);
  const [closeH, closeM] = CLOSE_TIME.split(":").map(Number);

  const openTime = kstDate(date, openH, openM, 0);
  const closeTime =
    closeH >= 24
      ? new Date(kstDate(date, 0, 0, 0).getTime() + 24 * 60 * 60000)
      : kstDate(date, closeH, closeM, 0);

  return { openTime, closeTime };
}

// 해당 날짜에 걸쳐있는 예약(취소되지 않은 것)을 모두 가져옵니다.
export async function fetchDayReservations({ supabase, date }) {
  const dayStart = kstDate(date, 0, 0, 0);
  const dayEnd = kstDate(date, 23, 59, 59);

  const { data, error } = await supabase
    .from("reservations")
    .select("start_time, end_time, bay_number, bay_type")
    .in("status", ["pending_payment", "paid"])
    .lt("start_time", dayEnd.toISOString())
    .gt("end_time", dayStart.toISOString());

  if (error) throw error;
  return data || [];
}

// 하나의 베이 종류에 대해, 해당 날짜/이용시간 기준 시작 시각별 잔여 대수를 계산합니다.
export function computeSlotsForBayType({ date, bayType, duration, reservations }) {
  const config = BAY_TYPES[bayType];
  if (!config) throw new Error(`알 수 없는 베이 종류입니다: ${bayType}`);

  const { openTime, closeTime } = getOpenCloseTime(date);
  const now = new Date();
  const slots = [];

  for (
    let slotStart = new Date(openTime);
    slotStart.getTime() + duration * 60000 <= closeTime.getTime();
    slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60000)
  ) {
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    const isPast = slotStart <= now;

    const overlappingCount = reservations.filter((r) => {
      if (r.bay_type !== bayType) return false;
      const rStart = new Date(r.start_time);
      const rEnd = new Date(r.end_time);
      return rStart < slotEnd && rEnd > slotStart;
    }).length;

    const availableCount = isPast ? 0 : Math.max(config.capacity - overlappingCount, 0);

    slots.push({
      startTime: slotStart.toISOString(),
      availableCount,
      isPast,
    });
  }

  return slots;
}

// 모든 베이 종류에 대해 한 번에 계산합니다. (캘린더 예약용 - 시간별 잔여 베이 현황표)
export function computeAllBayTypeSlots({ date, duration, reservations }) {
  const result = {};
  Object.keys(BAY_TYPES).forEach((bayType) => {
    result[bayType] = computeSlotsForBayType({ date, bayType, duration, reservations });
  });
  return result;
}
