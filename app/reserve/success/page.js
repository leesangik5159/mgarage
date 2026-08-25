"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatKRW } from "@/lib/pricing";
import { BAY_TYPES } from "@/lib/business";

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReservation(data.reservation);
        setStatus("done");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div className="spinner" style={{ marginBottom: 16 }} />
        <p className="muted">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <div className="error-box">{errorMsg}</div>
        <Link href="/reserve">
          <button className="btn-primary" type="button">
            다시 예약하기
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#dcfce7",
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 12px",
          }}
        >
          ✓
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          예약 및 결제가 완료되었습니다
        </div>
        <p className="muted">예약 시간에 매장에 방문해주세요.</p>
      </div>

      {reservation && (
        <div className="card">
          <div className="section-title">예약 상세</div>
          <p className="muted" style={{ margin: 0, lineHeight: 2 }}>
            예약번호: {reservation.order_id}
            <br />
            베이: {BAY_TYPES[reservation.bay_type]?.label || reservation.bay_type}{" "}
            {reservation.bay_number}번
            <br />
            시간: {formatDateTime(reservation.start_time)} ({reservation.duration_minutes}분)
            <br />
            차량: {reservation.car_model} / {reservation.car_number}
            <br />
            결제금액: {formatKRW(reservation.price)}
          </p>
        </div>
      )}

      <Link href="/my-reservations">
        <button className="btn-secondary" type="button">
          내 예약 목록 보기
        </button>
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} />}>
      <SuccessInner />
    </Suspense>
  );
}
