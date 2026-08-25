import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// POST /api/reservations/:id/cancel
// body: { phone, carNumber } - 본인 확인용 (전화번호+차량번호가 일치해야 취소 가능)
// 정책: 예약 시작 1시간 이전까지만 고객이 직접 취소할 수 있습니다.
export async function POST(request, { params }) {
  try {
    const { id } = await params; // Next.js 15+: 동적 라우트의 params는 Promise입니다.
    const { phone, carNumber } = await request.json();

    const supabase = getSupabaseServerClient();
    const { data: reservation, error: findError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !reservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (reservation.phone !== phone || reservation.car_number !== carNumber) {
      return NextResponse.json(
        { error: "본인 확인 정보가 일치하지 않습니다." },
        { status: 403 }
      );
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json({ reservation });
    }

    if (reservation.status === "completed") {
      return NextResponse.json(
        { error: "이미 정비가 완료된 예약은 취소할 수 없습니다." },
        { status: 400 }
      );
    }

    const oneHourBefore = new Date(reservation.start_time).getTime() - 60 * 60000;
    if (Date.now() > oneHourBefore) {
      return NextResponse.json(
        {
          error:
            "예약 시작 1시간 전까지만 취소할 수 있습니다. 매장으로 직접 문의해주세요.",
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 참고: 이미 결제(paid)된 건을 취소하는 경우, 토스페이먼츠 결제취소(환불) API도
    // 함께 호출해야 실제 환불이 이루어집니다. 사업자등록 후 실결제 연동 시
    // POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel 호출 로직을 추가하세요.

    return NextResponse.json({ reservation: updated });
  } catch (err) {
    console.error("[reservations cancel] error:", err);
    return NextResponse.json(
      { error: err.message || "예약 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
