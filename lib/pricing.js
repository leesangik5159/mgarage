import { getBayConfig } from "./business.js";

/**
 * 베이 종류와 이용 시간(분)에 따른 요금을 계산합니다.
 * 기본 60분 요금 + 30분 연장마다 추가 요금.
 *
 * 예) 리프트베이 90분 = 15,000원 + (30분 연장 1회 x 10,000원) = 25,000원
 */
export function calcPrice(bayType, durationMinutes) {
  const config = getBayConfig(bayType);

  if (!Number.isFinite(durationMinutes) || durationMinutes < 60) {
    throw new Error("이용 시간은 최소 60분 이상이어야 합니다.");
  }

  const extraMinutes = durationMinutes - 60;
  if (extraMinutes % 30 !== 0) {
    throw new Error("이용 시간은 30분 단위로 연장할 수 있습니다.");
  }

  const extendSteps = extraMinutes / 30;
  return config.basePrice + extendSteps * config.extendUnit;
}

export function formatKRW(amount) {
  return amount.toLocaleString("ko-KR") + "원";
}
