"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import {
  BAY_TYPES,
  DURATION_OPTIONS,
  SERVICE_TYPES,
} from "@/lib/business";
import { calcPrice, formatKRW } from "@/lib/pricing";
import {
  TERMS_TITLE,
  TERMS_INTRO,
  TERMS_ITEMS,
  TERMS_AGREE_LABEL,
} from "@/lib/terms";

const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const BAY_TYPE_LIST = Object.values(BAY_TYPES);

// 캘린더에서 몇 달 앞까지 이동할 수 있는지 (0 = 이번 달만, 2 = 이번 달 포함 3개월)
const MAX_MONTHS_AHEAD = 2;

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(d) {
  const weekday = WEEKDAY_LABELS[d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${weekday})`;
}

function formatTimeLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// year/month(0-indexed) 기준 6주 x 7일 달력 매트릭스를 만듭니다. 빈 칸은 null.
function buildMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 전체 절차: 0 = 날짜/시간대/베이 선택, 1 = 이용규칙 동의, 2 = 예약자 정보 입력 + 결제
export default function ReservePage() {
  const [step, setStep] = useState(0);
  const [tossReady, setTossReady] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  // ---- 달력 상태 ----
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dateKey, setDateKey] = useState(null); // 선택한 날짜 ("YYYY-MM-DD")

  // ---- 이용 시간 / 잔여 현황 그리드 상태 ----
  const [duration, setDuration] = useState(60);
  const [gridBayTypes, setGridBayTypes] = useState([]); // [{key,label,capacity,slots}]
  const [gridLoading, setGridLoading] = useState(false);

  // ---- 선택한 시간 + 베이 ----
  const [selectedBayType, setSelectedBayType] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null); // startTime ISO

  // ---- 이용규칙 동의 (step 1) ----
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsAgreedAt, setTermsAgreedAt] = useState(null);

  // ---- 예약자 정보 (step 2) ----
  const [phone, setPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);

  // ---- 제출 ----
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const monthMatrix = useMemo(
    () => buildMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const maxMonthIndex =
    today.getFullYear() * 12 + today.getMonth() + MAX_MONTHS_AHEAD;
  const viewMonthIndex = viewYear * 12 + viewMonth;
  const canGoPrevMonth =
    viewMonthIndex > today.getFullYear() * 12 + today.getMonth();
  const canGoNextMonth = viewMonthIndex < maxMonthIndex;

  const selectedBayConfig = selectedBayType ? BAY_TYPES[selectedBayType] : null;
  const price = selectedBayType ? calcPrice(selectedBayType, duration) : 0;

  // 날짜 또는 이용 시간이 바뀌면 그 날짜의 시간대별 x 베이종류별 잔여 현황을 불러옵니다.
  useEffect(() => {
    if (!dateKey) return;
    setSelectedBayType(null);
    setSelectedSlot(null);
    setGridLoading(true);
    setErrorMsg("");
    fetch(`/api/availability/grid?date=${dateKey}&duration=${duration}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGridBayTypes(data.bayTypes || []);
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setGridLoading(false));
  }, [dateKey, duration]);

  function isValidPhone(v) {
    return /^01[016789]-?\d{3,4}-?\d{4}$/.test(v.replace(/\s/g, ""));
  }

  function handlePickDate(d) {
    if (!d) return;
    const key = toDateKey(d);
    if (key < todayKey) return; // 과거 날짜는 선택 불가
    setDateKey(key);
  }

  function handleChangeDuration(d) {
    setDuration(d);
  }

  function handlePickTime(startTime) {
    setSelectedBayType(null);
    setSelectedSlot(startTime);
  }

  function handleResetTime() {
    setSelectedSlot(null);
    setSelectedBayType(null);
  }

  function handlePickBayType(bayKey, availableCount) {
    if (availableCount <= 0) return;
    setSelectedBayType(bayKey);
  }

  function goNextFromStep0() {
    if (!dateKey) {
      setErrorMsg("날짜를 선택해주세요.");
      return;
    }
    if (!selectedSlot || !selectedBayType) {
      setErrorMsg("예약하실 시간과 베이를 선택해주세요.");
      return;
    }
    setErrorMsg("");
    setStep(1);
  }

  function goNextFromStep1() {
    if (!termsChecked) {
      setErrorMsg("이용규칙에 동의해주세요.");
      return;
    }
    setErrorMsg("");
    setTermsAgreedAt(new Date().toISOString());
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
          bayType: selectedBayType,
          startTime: selectedSlot,
          durationMinutes: duration,
          termsAgreedAt,
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

  // 2단계(시간대 선택)에 표시할 시간 목록: 베이 종류 중 하나라도 잔여가 있으면 선택 가능한 시간으로 표시합니다.
  const timeOptions =
    gridBayTypes.length > 0
      ? gridBayTypes[0].slots.map((s, idx) => ({
          startTime: s.startTime,
          anyAvailable: gridBayTypes.some(
            (b) => (b.slots[idx]?.availableCount ?? 0) > 0
          ),
        }))
      : [];

  // 3단계(선택한 시간대의 베이 이용 현황)에 쓸, 베이 종류별 잔여 대수
  const bayStatusForSelectedTime = selectedSlot
    ? BAY_TYPE_LIST.map((bay) => {
        const bayData = gridBayTypes.find((b) => b.key === bay.key);
        const slot = bayData?.slots.find((s) => s.startTime === selectedSlot);
        return { ...bay, availableCount: slot ? slot.availableCount : 0 };
      })
    : [];

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
            <div className="section-title">1. 날짜를 선택하세요</div>

            {!dateKey && (
              <div>
                <div className="calendar-nav">
                  <button
                    className="calendar-nav-btn"
                    type="button"
                    disabled={!canGoPrevMonth}
                    onClick={() => {
                      const m = viewMonth === 0 ? 11 : viewMonth - 1;
                      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
                      setViewMonth(m);
                      setViewYear(y);
                    }}
                  >
                    ‹
                  </button>
                  <div className="calendar-month-label">
                    {viewYear}년 {viewMonth + 1}월
                  </div>
                  <button
                    className="calendar-nav-btn"
                    type="button"
                    disabled={!canGoNextMonth}
                    onClick={() => {
                      const m = viewMonth === 11 ? 0 : viewMonth + 1;
                      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
                      setViewMonth(m);
                      setViewYear(y);
                    }}
                  >
                    ›
                  </button>
                </div>

                <div className="calendar-weekdays">
                  {WEEKDAY_LABELS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>

                <div className="calendar-grid">
                  {monthMatrix.flat().map((d, idx) => {
                    if (!d) {
                      return <div key={idx} className="calendar-cell empty" />;
                    }
                    const key = toDateKey(d);
                    const disabled = key < todayKey;
                    const isToday = key === todayKey;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`calendar-cell ${disabled ? "disabled" : ""} ${
                          isToday ? "today" : ""
                        }`}
                        disabled={disabled}
                        onClick={() => handlePickDate(d)}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {dateKey && (
              <div className="selected-date-banner">
                <span className="date-text">
                  {formatDateLabel(new Date(dateKey + "T00:00:00"))}
                </span>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => {
                    setDateKey(null);
                    setSelectedBayType(null);
                    setSelectedSlot(null);
                  }}
                >
                  날짜 다시 선택
                </button>
              </div>
            )}
          </div>

          {dateKey && (
            <div className="card">
              <div className="section-title">2. 시간대를 선택하세요</div>
              <div className="chip-row" style={{ marginBottom: 14 }}>
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip ${duration === d ? "selected" : ""}`}
                    onClick={() => handleChangeDuration(d)}
                  >
                    {d}분
                  </button>
                ))}
              </div>

              {!selectedSlot && (
                <>
                  {gridLoading && <div className="spinner" style={{ margin: "24px auto" }} />}
                  {!gridLoading && timeOptions.length === 0 && (
                    <div className="empty-box">선택하신 날짜에는 예약 가능한 시간이 없습니다.</div>
                  )}
                  {!gridLoading && timeOptions.length > 0 && (
                    <div className="slot-grid">
                      {timeOptions.map((t) => (
                        <button
                          key={t.startTime}
                          type="button"
                          className={`chip ${!t.anyAvailable ? "disabled" : ""}`}
                          disabled={!t.anyAvailable}
                          onClick={() => handlePickTime(t.startTime)}
                        >
                          {formatTimeLabel(t.startTime)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedSlot && (
                <div className="selected-date-banner">
                  <span className="date-text">
                    {formatTimeLabel(selectedSlot)} 시작 · {duration}분
                  </span>
                  <button className="link-btn" type="button" onClick={handleResetTime}>
                    시간 다시 선택
                  </button>
                </div>
              )}
            </div>
          )}

          {dateKey && selectedSlot && (
            <div className="card">
              <div className="section-title">3. 베이 이용 현황</div>
              <p className="muted" style={{ marginTop: -4, marginBottom: 10 }}>
                선택하신 시간에 이용 가능한 베이를 선택하세요.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bayStatusForSelectedTime.map((bay) => {
                  const soldOut = bay.availableCount <= 0;
                  return (
                    <button
                      key={bay.key}
                      type="button"
                      className={`bay-option ${selectedBayType === bay.key ? "selected" : ""}`}
                      disabled={soldOut}
                      onClick={() => handlePickBayType(bay.key, bay.availableCount)}
                    >
                      <h3>{bay.label}</h3>
                      <p>{bay.description}</p>
                      <p
                        style={{
                          marginTop: 6,
                          fontWeight: 700,
                          color: soldOut ? "var(--danger)" : "var(--ink)",
                        }}
                      >
                        {soldOut ? "마감" : `잔여 ${bay.availableCount}대`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedBayType && selectedSlot && (
            <div className="card">
              <div className="price-row" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
                <span className="label">
                  {selectedBayConfig.label} · {formatDateLabel(new Date(selectedSlot))}{" "}
                  {formatTimeLabel(selectedSlot)} · {duration}분
                </span>
                <span className="value">{formatKRW(price)}</span>
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={goNextFromStep0} type="button">
            다음: 이용규칙 동의
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="card">
            <div className="price-row" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
              <span className="label">
                {selectedBayConfig?.label} · {selectedSlot && formatDateLabel(new Date(selectedSlot))}{" "}
                {selectedSlot && formatTimeLabel(selectedSlot)} · {duration}분
              </span>
              <span className="value">{formatKRW(price)}</span>
            </div>
          </div>

          <div className="card">
            <div className="section-title">{TERMS_TITLE}</div>
            <p className="muted" style={{ marginBottom: 16 }}>{TERMS_INTRO}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {TERMS_ITEMS.map((item, idx) => (
                <div key={item.title}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>
                    {idx + 1}. {item.title}
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <label
            className="card"
            style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--brand)", flexShrink: 0 }}
            />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{TERMS_AGREE_LABEL}</span>
          </label>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button className="btn-secondary" onClick={() => setStep(0)} type="button">
              이전
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!termsChecked}
              onClick={goNextFromStep1}
            >
              동의하고 다음: 예약자 정보 입력
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="card">
            <div className="section-title">예약 정보 확인</div>
            <p className="muted" style={{ margin: 0 }}>
              {selectedBayConfig?.label} · {duration}분
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
