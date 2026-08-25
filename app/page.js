import Link from "next/link";
import {
  STORE_NAME,
  HOURS_LABEL,
  BAY_TYPES,
  DURATION_OPTIONS,
} from "@/lib/business";
import { calcPrice, formatKRW } from "@/lib/pricing";

export default function HomePage() {
  return (
    <div>
      <div className="hero">
        <h1>내 손으로 정비하는 셀프정비소</h1>
        <p>
          핸드폰으로 30초 만에 예약하고 바로 결제까지.
          <br />
          {STORE_NAME}에서 오일교환부터 간단한 정비까지 직접 해보세요.
        </p>
      </div>

      <Link href="/reserve">
        <button className="btn-primary" style={{ marginBottom: 14 }}>
          지금 예약하기
        </button>
      </Link>

      <div className="card">
        <div className="section-title">영업시간</div>
        <p className="muted">
          <span
            style={{
              display: "inline-block",
              background: "var(--brand)",
              color: "var(--ink)",
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 6,
            }}
          >
            {HOURS_LABEL}
          </span>
          <br />
          언제든 편한 시간에 예약하고 방문하세요.
        </p>
      </div>

      <div className="card">
        <div className="section-title">작업 공간 안내</div>
        {Object.values(BAY_TYPES).map((bay) => (
          <div key={bay.key} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
              {bay.label} · {bay.capacity}대
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {bay.description}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">요금 안내</div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>구분</th>
                {DURATION_OPTIONS.map((d) => (
                  <th key={d}>{d}분</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(BAY_TYPES).map((bay) => (
                <tr key={bay.key}>
                  <td style={{ fontWeight: 700 }}>{bay.label}</td>
                  {DURATION_OPTIONS.map((d) => (
                    <td key={d}>{formatKRW(calcPrice(bay.key, d))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          기본 60분 요금이며, 30분 연장할 때마다 리프트베이는 10,000원, 일반
          베이는 7,000원씩 추가됩니다.
        </p>
      </div>

      <div className="card">
        <div className="section-title">이용 방법</div>
        <p className="muted">
          1. 캘린더에서 원하는 날짜를 선택하세요.
          <br />
          2. 이용 시간(분)을 고르고, 예약 가능한 시간대를 선택하세요.
          <br />
          3. 선택한 시간대의 베이 이용 현황을 보고 원하는 베이를 선택하세요.
          <br />
          4. 이용규칙 및 안전 서약에 동의하세요.
          <br />
          5. 휴대폰 번호, 차량번호, 차종을 입력하고 결제하면 예약이 완료됩니다.
          <br />
          6. 예약 시간에 매장에 방문해서 안내된 베이 번호에서 정비를 진행하세요.
        </p>
      </div>
    </div>
  );
}
