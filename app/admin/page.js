"use client";

import { useEffect, useState } from "react";
import { formatKRW } from "@/lib/pricing";

const STATUS_LABEL = {
  pending_payment: "결제대기",
  paid: "예약확정",
  cancelled: "취소됨",
  completed: "정비완료",
};

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayKey() {
  // 브라우저의 로컬(한국) 날짜 기준으로 "YYYY-MM-DD"를 만듭니다.
  // toISOString()은 UTC로 변환되어 자정 근처 시간에는 날짜가 하루 어긋날 수 있어 사용하지 않습니다.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadReservations() {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/reservations?${params.toString()}`);
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회 실패");
      setReservations(data.reservations || []);
      setAuthed(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "로그인 실패");
      setAuthed(true);
      loadReservations();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경 실패");
      setReservations((prev) => prev.map((r) => (r.id === id ? data.reservation : r)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setPassword("");
  }

  if (checking) {
    return <div className="spinner" style={{ margin: "60px auto" }} />;
  }

  if (!authed) {
    return (
      <div className="card">
        <div className="section-title">관리자 로그인</div>
        {loginError && <div className="error-box">{loginError}</div>}
        <form onSubmit={handleLogin}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loggingIn}>
            {loggingIn ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-title" style={{ margin: 0 }}>
            예약 관리
          </div>
          <button className="btn-danger" onClick={handleLogout} type="button">
            로그아웃
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>시작일</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>종료일</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-secondary" style={{ width: "auto", padding: "12px 16px" }} onClick={loadReservations} type="button">
            조회
          </button>
        </div>
      </div>

      {errorMsg && <div className="error-box">{errorMsg}</div>}
      {loading && <div className="spinner" style={{ margin: "20px auto" }} />}

      {!loading && reservations.length === 0 && (
        <div className="empty-box">해당 기간에 예약이 없습니다.</div>
      )}

      {!loading && reservations.length > 0 && (
        <div className="card table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>베이</th>
                <th>차량번호</th>
                <th>차종</th>
                <th>연락처</th>
                <th>정비종류</th>
                <th>금액</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.start_time)}</td>
                  <td>
                    {r.bay_type === "lift" ? "리프트" : "일반"} {r.bay_number}번
                  </td>
                  <td>{r.car_number}</td>
                  <td>{r.car_model}</td>
                  <td>{r.phone}</td>
                  <td>{r.service_type}</td>
                  <td>{formatKRW(r.price)}</td>
                  <td>
                    <span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {r.status === "paid" && (
                        <button
                          className="btn-secondary"
                          style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleStatusChange(r.id, "completed")}
                          type="button"
                        >
                          완료
                        </button>
                      )}
                      {r.status !== "cancelled" && r.status !== "completed" && (
                        <button
                          className="btn-danger"
                          onClick={() => handleStatusChange(r.id, "cancelled")}
                          type="button"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
