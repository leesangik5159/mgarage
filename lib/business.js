// ============================================
// M.garage 매장 기본 설정
// 영업시간, 베이 구성, 정비 항목 등을 여기서 한 번에 관리합니다.
// 값만 바꾸면 전체 앱에 반영됩니다.
// ============================================

export const STORE_NAME = "M.garage";

// 영업시간 (24시간제, 분 단위 아님 - "HH:MM")
export const OPEN_TIME = "09:00";
export const CLOSE_TIME = "20:00";

// 예약 가능한 시간 슬롯 간격 (분)
export const SLOT_INTERVAL_MINUTES = 30;

// 베이(작업 공간) 구성
export const BAY_TYPES = {
  lift: {
    key: "lift",
    label: "X자형 리프트베이",
    description: "차량을 들어올려 하부 작업이 가능한 리프트 베이입니다.",
    capacity: 2,
    basePrice: 15000, // 기본 60분
    extendUnit: 10000, // 30분 연장마다
  },
  manual: {
    key: "manual",
    label: "일반 베이",
    description: "수동 공구가 비치되어 있는 셀프 정비 공간입니다.",
    capacity: 3,
    basePrice: 11000, // 기본 60분
    extendUnit: 7000, // 30분 연장마다
  },
};

// 이용 시간 옵션 (분)
export const DURATION_OPTIONS = [60, 90, 120, 150];

// 정비 종류 (안내용, 가격에는 영향 없음)
export const SERVICE_TYPES = [
  "오일교환",
  "타이어/공기압",
  "배터리 점검/교체",
  "와이퍼 교체",
  "기타 셀프 정비",
];

export function getBayConfig(bayType) {
  const config = BAY_TYPES[bayType];
  if (!config) {
    throw new Error(`알 수 없는 베이 종류입니다: ${bayType}`);
  }
  return config;
}

// ============================================
// 서버(Vercel 등)는 보통 UTC 시간대로 동작하지만, 매장 영업시간은 한국 시간(KST, UTC+9)
// 기준입니다. 서버 API에서 날짜 문자열("YYYY-MM-DD")로 시각을 만들 때는 반드시
// 아래 함수처럼 +09:00 시간대를 명시해서 만들어야 서버 위치와 상관없이 항상
// "한국 시간 기준" 시각이 만들어집니다. (new Date("YYYY-MM-DDT00:00:00") 처럼
// 시간대를 생략하면 서버의 로컬 시간대로 해석되어 배포 환경에 따라 시간이 틀어질 수 있습니다.)
// ============================================
export function kstDate(dateStr, hh = 0, mm = 0, ss = 0) {
  const pad = (n) => String(n).padStart(2, "0");
  return new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:${pad(ss)}+09:00`);
}
