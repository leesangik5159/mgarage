import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// POST /api/payments/confirm
// 토스페이먼츠 successUrl 로 리다이렉트된 후, 프론트엔드가 이 API를 호출해서
// 실제 결제 승인을 서버에서 완료시킵니다. (시크릿 키는 절대 브라우저에 노출되면 안되므로
// 이 승인 절차는 반드시 서버에서 이루어져야 합니다.)
// body: { paymentKey, orderId, amount }
export async function POST(request) {
  try {
    const { paymentKey, orderId, amount } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: "결제 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1) 우리 DB에 있는 예약과 금액이 일치하는지 먼저 확인 (위변조 방지)
    const { data: reservation, error: findError } = await supabase
      .from("reservations")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (findError || !reservation) {
      return NextResponse.json(
        { error: "해당 주문 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (reservation.status === "paid") {
      // 이미 승인된 결제 (새로고침 등으로 중복 호출된 경우)
      return NextResponse.json({ reservation });
    }

    if (Number(reservation.price) !== Number(amount)) {
      return NextResponse.json(
        { error: "결제 금액이 예약 금액과 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
    }
    const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");

    // 2) 토스페이먼츠에 결제 승인 요청
    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error("[payments/confirm] Toss 승인 실패:", tossResult);
      return NextResponse.json(
        {
          error:
            tossResult.message || "결제 승인에 실패했습니다. 다시 시도해주세요.",
          code: tossResult.code,
        },
        { status: tossResponse.status }
      );
    }

    // 3) 승인 성공 -> 예약 상태를 paid로 업데이트
    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "paid",
        payment_key: paymentKey,
        payment_approved_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ reservation: updated, tossPayment: tossResult });
  } catch (err) {
    console.error("[payments/confirm] error:", err);
    return NextResponse.json(
      { error: err.message || "결제 승인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
