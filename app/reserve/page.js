"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import {
  BAY_TYPES,
  DURATION_OPTIONS,
  SERVICE_TYPES,
  STORE_NAME,
} from "@/lib/business";
import { calcPrice, formatKRW } from "@/lib/pricing";

const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

function nextDays(count) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(d) {
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function formatTimeLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ReservePage() {
  const [step, setStep] = useState(0);
  const [tossReady, setTossReady] = useState(false);

  // step 0
  const [bayType, setBayType] = useState("lift");
  const [duration, setDuration] = useState(60);

  // step 1
  const days = useMemo(() => nextDays(14), []);
  const [dateKey, setDateKey] = useState(toDateKey(days[0]));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // step 2
  const [phone, setPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);

  // submit
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const price = calcPrice(bayType, duration);
  const bayConfig = BAY_TYPES[bayType];

  useEffect(() => {
    if (step !== 1) return;
    setSelectedSlot(null);
    setSlotsLoading(true);
    setErrorMsg("");
    fetch(`/api/availability?date=${dateKey}&bayType=${bayType}&duration=${duration}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSlots(data.slots || []);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setSlotsLoading(false));
  }, [step, dateKey, bayType, duration]);

  function isValidPhone(v) {
    return /^01[016789]-?\d{3,4}-?\d{4}$/.test(v.replace(/\s/g, ""));
  }

  function goNextFromStep0() {
    setStep(1);
  }

  function goNextFromStep1() {
    if (!selectedSlot) {
      setErrorMsg("예약 시간을 선택해주세요.");
      return;
    }
    setErrorMsg("");
    setStep(2);
  }

  async function handlePay() {
    setErrorMsg("");

    if (!isValidPhone(phone)) {
      setErrorMsg("휴대폰 번호 형식을 확인해주세요. (예: 010-1234-5678)");
      return;
    }
    if (!carNumber.trim()) {
      setErrorMsg("차량번호를 입력해주세요.");
      return;
    }
    if (!carModel.trim()) {
      setErrorMsg("차종을 입력해주세요.");
      return;
    }
    if (!tossReady || !window.TossPayments) {
      setErrorMsg("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          carNumber,
          carModel,
          serviceType,
          bayType,
          startTime: selectedSlot,
          durationMinutes: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "예약 생성에 실패했습니다.");

      // 예약 생성 성공 -> 토스페이먼츠 결제창 호출
      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
      const origin = window.location.origin;

      await tossPayments.requestPayment("CARD", {
        amount: data.amount,
        orderId: data.orderId,
        orderName: data.orderName,
        customerName: carModel,
        successUrl: `${origin}/reserve/success`,
        failUrl: `${origin}/reserve/fail`,
      });
      // requestPayment가 성공하면 브라우저가 successUrl로 이동하므로 이후 코드는 실행되지 않습니다.
    } catch (err) {
      // 사용자가 결제창을 닫은 경우에도 이 catch로 들어옵니다.
      setErrorMsg(err.message || "결제 요청 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Script
        src="https://js.tosspayments.com/v1/payment"
        onLoad={() => setTossReady(true)}
      />

      <div className="step-dots">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`step-dot ${i <= step ? "active" : ""}`} />
        ))}
      </div>

      {errorMsg && <div className="error-box">{errorMsg}</div>}

      {step === 0 && (
        <div>
          <div className="card">
            <div className="section-title">1. 작업 공간을 선택하세요</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.values(BAY_TYPES).map((bay) => (
                <button
                  key={bay.key}
                  className={`bay-option ${bayType === bay.key ? "selected" : ""}`}
                  onClick={() => setBayType(bay.key)}
                  type="button"
                >
                  <h3>{bay.label}</h3>
                  <p>{bay.description}</p>
                  <p style={{ marginTop: 6, fontWeight: 700, color: "var(--brand)" }}>
                    기본 60분 {formatKRW(bay.basePrice)} · 30분 연장 시 +{formatKRW(bay.extendUnit)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">2. 이용 시간을 선택하세요</div>
            <div className="chip-row">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${duration === d ? "selected" : ""}`}
                  onClick={() => setDuration(d)}
                >
                  {d}분
                </button>
              ))}
            </div>
            <div className="price-row">
              <span className="label">예상 요금</span>
              <span className="value">{formatKRW(price)}</span>
            </div>
          </div>

          <button className="btn-primary" onClick={goNextFromStep0} type="button">
            다음: 날짜/시간 선택
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="card">
            <div className="section-title">날짜 선택</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {days.map((d) => {
                const key = toDateKey(d);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${dateKey === key ? "selected" : ""}`}
                    style={{ flex: "0 0 auto" }}
                    onClick={() => setDateKey(key)}
                  >
                    {formatDateLabel(d)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="section-title">
              {bayConfig.label} · {duration}분 이용 가능 시간
            </div>
            {slotsLoading && <div className="spinner" style={{ margin: "20px auto" }} />}
            {!slotsLoading && slots.length === 0 && (
              <div className="empty-box">선택하신 날짜에 예약 가능한 시간이 없습니다.</div>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    className={`chip ${selectedSlot === slot.startTime ? "selected" : ""}`}
                    onClick={() => setSelectedSlot(slot.startTime)}
                  >
                    {formatTimeLabel(slot.startTime)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={() => setStep(0)} type="button">
              이전
            </button>
            <button className="btn-primary" onClick={goNextFromStep1} type="button">
              다음
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="card">
            <div className="section-title">예약 정보 확인</div>
            <p className="muted" style={{ margin: 0 }}>
              {bayConfig.label} · {duration}분
              <br />
              {selectedSlot &&
                `${formatDateLabel(new Date(selectedSlot))} ${formatTimeLabel(selectedSlot)} 시작`}
            </p>
            <div className="price-row">
              <span className="label">결제 금액</span>
              <span className="value">{formatKRW(price)}</span>
            </div>
          </div>

          <div className="card">
            <div className="section-title">예약자 정보</div>

            <div className="field">
              <label>휴대폰 번호</label>
              <input
                type="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="field">
              <label>차량번호</label>
              <input
                type="text"
                placeholder="12가3456"
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value)}
              />
            </div>

            <div className="field">
              <label>차종</label>
              <input
                type="text"
                placeholder="예: 아반떼, 쏘나타 등"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>정비 종류</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button className="btn-secondary" onClick={() => setStep(1)} type="button">
              이전
            </button>
            <button className="btn-primary" onClick={handlePay} disabled={submitting} type="button">
              {submitting ? "처리 중..." : `${formatKRW(price)} 결제하기`}
            </button>
          </div>

          <p className="muted" style={{ textAlign: "center" }}>
            결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
