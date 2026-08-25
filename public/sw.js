// M.garage 최소 서비스워커
// 예약/결제 데이터는 항상 최신 상태여야 하므로 별도의 오프라인 캐싱은 하지 않고,
// PWA 설치(홈 화면 추가) 조건을 만족시키기 위한 최소한의 fetch 핸들러만 둡니다.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // 네트워크 요청을 그대로 통과시킵니다 (캐싱하지 않음 - 항상 최신 예약 현황 유지)
  event.respondWith(fetch(event.request));
});
