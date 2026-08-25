"use client";

import { useState } from "react";
import { formatKRW } from "@/lib/pricing";
import { BAY_TYPES } from "@/lib/business";

const STATUS_LABEL = {
  pending_payment: "결제대기",
  paid: "예약확정",
  cancelled: "취소됨",
  completed: "정비완료",
};

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

export default function MyReservationsPage() {
  const [phone, setPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ phone, carNumber });
      const res = await fetch(`/api/my-reservations?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회에 실패했습니다.");
      setReservations(data.reservations || []);
      setSearched(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id) {
    if (!confirm("이 예약을 취소하시겠습니까?")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, carNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "취소에 실패했습니다.");
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? data.reservation : r))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <div className="card">
        <div className="section-title">내 예약 조회</div>
        <form onSubmit={handleSearch}>
          <div className="field">
            <label>휴대폰 번호</label>
            <input
              type="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>차량번호</label>
            <input
              type="text"
              placeholder="12가3456"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "조회 중..." : "조회하기"}
          </button>
        </form>
      </div>

      {errorMsg && <div className="error-box">{errorMsg}</div>}

      {searched && reservations.length === 0 && !errorMsg && (
        <div className="empty-box">조회된 예약이 없습니다.</div>
      )}

      {reservations.map((r) => (
        <div className="card" key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span>
            <span style={{ fontWeight: 800 }}>{formatKRW(r.price)}</span>
          </div>
          <p className="muted" style={{ margin: 0, lineHeight: 1.9 }}>
            {BAY_TYPES[r.bay_type]?.label || r.bay_type} {r.bay_number}번
            <br />
            {formatDateTime(r.start_time)} ({r.duration_minutes}분)
            <br />
            {r.car_model} · {r.car_number}
            <br />
            {r.service_type}
          </p>
          {(r.status === "pending_payment" || r.status === "paid") && (
            <button
              className="btn-danger"
              style={{ marginTop: 10 }}
              onClick={() => handleCancel(r.id)}
              disabled={cancellingId === r.id}
              type="button"
            >
              {cancellingId === r.id ? "취소 중..." : "예약 취소"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
