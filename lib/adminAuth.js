import crypto from "crypto";

const COOKIE_NAME = "mgarage_admin";

function getExpectedToken() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    throw new Error(
      "ADMIN_PASSWORD / ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다."
    );
  }
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

export function checkAdminPassword(inputPassword) {
  return inputPassword === process.env.ADMIN_PASSWORD;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminToken() {
  return getExpectedToken();
}

export function isValidAdminToken(token) {
  if (!token) return false;
  try {
    const expected = getExpectedToken();
    // 길이가 다른 문자열을 timingSafeEqual에 넣으면 예외가 발생하므로 먼저 길이 체크
    if (token.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
