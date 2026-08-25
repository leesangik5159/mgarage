import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getBayConfig, SERVICE_TYPES } from "@/lib/business";
import { calcPrice } from "@/lib/pricing";

function generateOrderId() {
  // 토스페이먼츠 orderId 규칙: 영문 대소문자, 숫자, 특수문자(-_=.@) 6~64자
  const random = Math.random().toString(36).slice(2, 10);
  return `mgarage_${Date.now()}_${random}`;
}

function isValidPhone(phone) {
  return /^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ""));
}

// POST /api/reservations
// body: { phone, carNumber, carModel, serviceType, bayType, startTime(ISO), durationMinutes }
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      phone,
      carNumber,
      carModel,
      serviceType,
      bayType,
      startTime,
      durationMinutes,
    } = body || {};

    // ---- 입력값 검증 ----
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
        { status: 400 }
      );
    }
    if (!carNumber || carNumber.trim().length < 4) {
      return NextResponse.json(
        { error: "차량번호를 정확히 입력해주세요." },
        { status: 400 }
      );
    }
    if (!carModel || carModel.trim().length < 1) {
      return NextResponse.json(
        { error: "차종을 입력해주세요." },
        { status: 400 }
      );
    }
    if (!SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: "정비 종류를 선택해주세요." },
        { status: 400 }
      );
    }
    if (!startTime || Number.isNaN(new Date(startTime).getTime())) {
      return NextResponse.json(
        { error: "예약 시간이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const config = getBayConfig(bayType); // 잘못된 bayType이면 예외 발생 -> catch에서 500 처리
    const duration = Number(durationMinutes);
    const price = calcPrice(bayType, duration); // 잘못된 duration이면 여기서 에러 메시지 발생

    const start = new Date(startTime);
    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "이미 지난 시간은 예약할 수 없습니다." },
        { status: 400 }
      );
    }
    const end = new Date(start.getTime() + duration * 60000);

    const supabase = getSupabaseServerClient();

    // ---- 해당 시간대에 비어있는 베이 번호 찾기 ----
    const { data: overlapping, error: overlapError } = await supabase
      .from("reservations")
      .select("bay_number")
      .eq("bay_type", bayType)
      .in("status", ["pending_payment", "paid"])
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());

    if (overlapError) throw overlapError;

    const takenNumbers = new Set(overlapping.map((r) => r.bay_number));
    let bayNumber = null;
    for (let n = 1; n <= config.capacity; n++) {
      if (!takenNumbers.has(n)) {
        bayNumber = n;
        break;
      }
    }

    if (bayNumber === null) {
      return NextResponse.json(
        { error: "선택하신 시간에는 이미 예약이 마감되었습니다. 다른 시간을 선택해주세요." },
        { status: 409 }
      );
    }

    const orderId = generateOrderId();

    const { data: inserted, error: insertError } = await supabase
      .from("reservations")
      .insert({
        phone: phone.trim(),
        car_number: carNumber.trim(),
        car_model: carModel.trim(),
        service_type: serviceType,
        bay_type: bayType,
        bay_number: bayNumber,
        start_time: start.toISOString(),
        duration_minutes: duration,
        end_time: end.toISOString(),
        time_range: `[${start.toISOString()},${end.toISOString()})`,
        price,
        status: "pending_payment",
        order_id: orderId,
      })
      .select()
      .single();

    if (insertError) {
      // 동시에 같은 자리를 예약하려던 경우 DB의 중복 방지 제약이 걸림 (23P01)
      if (insertError.code === "23P01") {
        return NextResponse.json(
          { error: "방금 다른 고객이 같은 자리를 예약했습니다. 다시 시도해주세요." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      reservationId: inserted.id,
      orderId: inserted.order_id,
      amount: inserted.price,
      bayLabel: `${config.label} ${bayNumber}번`,
      orderName: `${config.label} ${duration}분 이용`,
    });
  } catch (err) {
    console.error("[reservations POST] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
