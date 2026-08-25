-- ============================================
-- 기존에 이미 reservations 테이블을 만드신 분들을 위한 추가 반영용 스크립트입니다.
-- (schema.sql을 처음부터 새로 실행하는 대신, 이 파일 내용만 Supabase SQL Editor에서
-- 실행하면 "이용규칙 동의 시각"을 기록하는 컬럼이 기존 테이블에 추가됩니다.)
--
-- 이미 schema.sql을 최신 버전으로 새로 실행하신 경우에는 이 파일을 실행하지 않아도 됩니다.
-- ============================================

alter table reservations
  add column if not exists terms_agreed_at timestamptz;
