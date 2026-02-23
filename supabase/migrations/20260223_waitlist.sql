-- 호스트 사전등록 (수익 계산기 사용자)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 연락처
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT,

  -- 매물 정보 (계산기 입력값)
  location TEXT NOT NULL, -- 지역 (예: "성동구")
  building_type TEXT NOT NULL, -- 건물 유형
  room_count TEXT NOT NULL, -- 방 개수
  current_rent INTEGER NOT NULL, -- 현재 월세 (만원)

  -- 계산 결과
  estimated_income INTEGER, -- 예상 STR 수익 (만원)
  additional_income INTEGER, -- 추가 수익 (만원)

  -- 메타
  status TEXT NOT NULL DEFAULT 'pending', -- pending, contacted, registered
  notes TEXT,

  -- 인덱스
  CONSTRAINT waitlist_email_key UNIQUE (email)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_location ON waitlist(location);

-- RLS 활성화
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 삽입 가능 (사전등록)
CREATE POLICY "Anyone can register" ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 정책: 관리자만 조회/수정 가능
CREATE POLICY "Admin can view all" ON waitlist
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can update" ON waitlist
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE waitlist IS '호스트 사전등록 (수익 계산기 사용자)';
