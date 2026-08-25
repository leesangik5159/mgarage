-- ============================================
-- M.garage 예약 시스템 데이터베이스 스키마
-- Supabase 프로젝트 > SQL Editor 에서 이 파일 내용을 전체 복사해서
-- 실행(Run) 하면 필요한 테이블이 모두 만들어집니다.
-- ============================================

-- 같은 베이 + 같은 시간대 중복 예약을 DB 차원에서 막기 위한 확장기능
create extension if not exists btree_gist;

-- 베이(작업 공간) 목록: X자형 리프트베이 2개, 일반 베이 3개
create table if not exists bays (
  id serial primary key,
  bay_type text not null check (bay_type in ('lift', 'manual')),
  bay_number int not null,
  unique (bay_type, bay_number)
);

insert into bays (bay_type, bay_number)
values ('lift', 1), ('lift', 2), ('manual', 1), ('manual', 2), ('manual', 3)
on conflict do nothing;

-- 예약 테이블
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- 고객 정보
  phone text not null,
  car_number text not null,
  car_model text not null,
  service_type text not null,

  -- 예약 내용
  bay_type text not null check (bay_type in ('lift', 'manual')),
  bay_number int not null,
  start_time timestamptz not null,
  duration_minutes int not null,
  end_time timestamptz not null,
  time_range tstzrange not null,

  -- 결제 정보
  price int not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'cancelled', 'completed')),
  order_id text not null unique,
  payment_key text,
  payment_approved_at timestamptz,

  -- 같은 베이가 겹치는 시간에 두 번 예약되는 것을 DB 레벨에서 방지
  -- (pending_payment 또는 paid 상태인 예약끼리만 겹치는지 검사)
  constraint reservations_no_overlap exclude using gist (
    bay_type with =,
    bay_number with =,
    time_range with &&
  ) where (status in ('pending_payment', 'paid'))
);

create index if not exists idx_reservations_phone_car on reservations (phone, car_number);
create index if not exists idx_reservations_start_time on reservations (start_time);
create index if not exists idx_reservations_status on reservations (status);

-- Row Level Security 활성화
-- 이 앱은 브라우저에서 Supabase에 직접 접속하지 않고, 반드시 서버(API 라우트)를 거쳐서만
-- service_role 키로 접근합니다. 그래서 별도의 공개 정책(policy) 없이 RLS만 켜두면
-- 익명 사용자는 테이블에 전혀 접근할 수 없어 안전합니다.
alter table bays enable row level security;
alter table reservations enable row level security;

-- 대기 중(pending_payment)인 오래된 예약(결제를 안 하고 이탈한 건)을 자동으로 정리하고 싶다면
-- Supabase의 Database > Cron 기능으로 아래와 비슷한 함수를 주기적으로 실행할 수 있습니다.
-- (선택 사항이며, 처음 시작할 때는 실행하지 않아도 됩니다.)
-- update reservations set status = 'cancelled'
--   where status = 'pending_payment' and created_at < now() - interval '30 minutes';
