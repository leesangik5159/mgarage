# M.garage — 셀프정비소 예약/결제 앱

핸드폰으로 간단히 예약하고 결제할 수 있는 셀프정비소 웹앱(PWA)입니다.

- X자형 리프트베이 2개, 일반 베이 3개(수동공구 포함) 예약 관리
- 전화번호 / 차량번호 / 차종으로 간단 예약
- 토스페이먼츠 결제 연동
- Supabase(무료 클라우드 DB)로 예약 데이터 관리
- 홈 화면에 앱처럼 추가 가능한 PWA

자세한 개발/배포 방법은 함께 전달된 **"M.garage 배포 가이드"** 문서를 참고하세요.

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 폴더 구조

```
app/                Next.js 페이지 및 API 라우트
  page.js             홈
  reserve/            예약 플로우
  my-reservations/    내 예약 조회
  admin/              관리자 페이지
  api/                서버 API (예약, 결제, 관리자)
lib/                공통 로직 (요금 계산, 매장 설정, Supabase 연결)
public/             정적 파일 (PWA 아이콘, manifest)
supabase/schema.sql 데이터베이스 스키마
```
