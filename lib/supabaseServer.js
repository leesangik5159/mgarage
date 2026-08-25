import { createClient } from "@supabase/supabase-js";

// 이 클라이언트는 반드시 서버(Route Handler, Server Component)에서만 사용하세요.
// service role 키는 데이터베이스의 모든 접근 권한을 가지므로 절대 브라우저(클라이언트 컴포넌트)에
// 노출되면 안 됩니다. 이 파일을 'use client' 컴포넌트에서 import하지 마세요.
let cachedClient = null;

export function getSupabaseServerClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
