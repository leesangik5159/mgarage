"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function FailInner() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";
  const code = searchParams.get("code");

  return (
    <div>
      <div className="card" style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef2f2",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 12px",
          }}
        >
          ✕
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>결제 실패</div>
        <p className="muted">
          {message}
          {code ? ` (코드: ${code})` : ""}
        </p>
      </div>

      <Link href="/reserve">
        <button className="btn-primary" type="button">
          다시 시도하기
        </button>
      </Link>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} />}>
      <FailInner />
    </Suspense>
  );
}
