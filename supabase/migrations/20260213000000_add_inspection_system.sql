-- ============================================================
-- 자동 검수 시스템 마이그레이션
-- 운영-1_매물검수.md 정책 기반
-- ============================================================

-- 1. properties 테이블 상태값 확장: 'supplement' (검수보완) 추가
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'supplement'));

-- 2. 검수 결과 저장용 컬럼 추가
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS inspection_result JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inspection_rule_violations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inspection_ai_violations TEXT[] DEFAULT '{}';

-- 3. 주소 중복 체크용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_properties_address_dong_ho
  ON properties(address, dong, ho)
  WHERE status IN ('pending', 'approved', 'supplement');

-- 4. 금칙어 관리 테이블
CREATE TABLE IF NOT EXISTS forbidden_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'accommodation_fraud',
    'external_contact',
    'direct_transaction',
    'contact_pattern'
  )),
  severity TEXT DEFAULT 'reject' CHECK (severity IN ('reject', 'flag')),
  description TEXT,
  is_regex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 금칙어 인덱스
CREATE INDEX IF NOT EXISTS idx_forbidden_words_category ON forbidden_words(category);

-- 5. 초기 금칙어 시드 데이터
-- 숙박업 오인 (accommodation_fraud)
INSERT INTO forbidden_words (word, category, severity, description) VALUES
  ('1박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('연박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('당일숙박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('당일 숙박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  -- 체크인/체크아웃은 단기임대에서 정상 용어이므로 금칙어에서 제외
  ('대실', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('시간당', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('시간대여', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('호텔', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('호텔식', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('펜션', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('게스트하우스', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('민박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('객실', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('프론트', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('숙박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('어메니티', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('에어비앤비', 'accommodation_fraud', 'reject', '유사 업종 언급'),
  ('수건 제공', 'accommodation_fraud', 'reject', '숙박 운영 용어')
ON CONFLICT DO NOTHING;

-- 외부 연락 유도 (external_contact)
INSERT INTO forbidden_words (word, category, severity, description) VALUES
  ('카톡', 'external_contact', 'reject', '외부 연락 유도'),
  ('카카오톡', 'external_contact', 'reject', '외부 연락 유도'),
  ('오픈채팅', 'external_contact', 'reject', '외부 연락 유도'),
  ('오픈 채팅', 'external_contact', 'reject', '외부 연락 유도'),
  ('문자 주세요', 'external_contact', 'reject', '외부 연락 유도'),
  ('문자주세요', 'external_contact', 'reject', '외부 연락 유도'),
  ('연락처는', 'external_contact', 'reject', '외부 연락 유도'),
  ('연락 주세요', 'external_contact', 'reject', '외부 연락 유도'),
  ('DM 주세요', 'external_contact', 'reject', '외부 연락 유도'),
  ('DM주세요', 'external_contact', 'reject', '외부 연락 유도'),
  ('인스타', 'external_contact', 'reject', '외부 플랫폼 유도'),
  ('블로그', 'external_contact', 'reject', '외부 플랫폼 유도'),
  ('네이버 카페', 'external_contact', 'reject', '외부 플랫폼 유도'),
  ('사진 참고', 'external_contact', 'flag', '연락처 우회 의심')
ON CONFLICT DO NOTHING;

-- 직거래 유도 (direct_transaction)
INSERT INTO forbidden_words (word, category, severity, description) VALUES
  ('직거래', 'direct_transaction', 'reject', '직거래 유도'),
  ('계좌', 'direct_transaction', 'reject', '직거래 유도'),
  ('입금', 'direct_transaction', 'reject', '직거래 유도'),
  ('현금 할인', 'direct_transaction', 'reject', '직거래 유도'),
  ('현금할인', 'direct_transaction', 'reject', '직거래 유도'),
  ('플랫폼 밖', 'direct_transaction', 'reject', '직거래 유도'),
  ('수수료 없이', 'direct_transaction', 'reject', '직거래 유도')
ON CONFLICT DO NOTHING;

-- 연락처 패턴 (contact_pattern) - 정규식 기반
INSERT INTO forbidden_words (word, category, severity, description, is_regex) VALUES
  ('010-?\d{4}-?\d{4}', 'contact_pattern', 'reject', '전화번호 패턴', true),
  ('011-?\d{3,4}-?\d{4}', 'contact_pattern', 'reject', '전화번호 패턴', true),
  ('공일공', 'contact_pattern', 'reject', '전화번호 한글 우회', false),
  ('공일일', 'contact_pattern', 'reject', '전화번호 한글 우회', false),
  ('0\s*1\s*0', 'contact_pattern', 'reject', '전화번호 띄어쓰기 우회', true)
ON CONFLICT DO NOTHING;

-- 6. admin_settings 테이블 확장
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS forbidden_words_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicate_check_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reject_on_rules BOOLEAN DEFAULT true;

-- 7. RLS 정책: forbidden_words 테이블
ALTER TABLE forbidden_words ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admin can manage forbidden words"
  ON forbidden_words
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 서버 액션용: 서비스 롤은 항상 접근 가능 (anon key로도 읽기 가능하게)
CREATE POLICY "Service role can read forbidden words"
  ON forbidden_words
  FOR SELECT
  USING (true);

-- 8. notifications 테이블에 supplement 타입 지원 (트리거 수정)
CREATE OR REPLACE FUNCTION notify_host_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'property_approved'
        WHEN NEW.status = 'rejected' THEN 'property_rejected'
        WHEN NEW.status = 'supplement' THEN 'property_supplement'
        ELSE 'property_status_changed'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN '매물이 승인되었습니다'
        WHEN NEW.status = 'rejected' THEN '매물 검수 결과: 반려'
        WHEN NEW.status = 'supplement' THEN '매물 검수 결과: 보완 필요'
        ELSE '매물 상태가 변경되었습니다'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN '매물이 승인되어 게스트에게 노출됩니다.'
        WHEN NEW.status = 'rejected' THEN COALESCE(NEW.admin_comment, '정책 위반으로 반려되었습니다. 상세 사유를 확인해주세요.')
        WHEN NEW.status = 'supplement' THEN '몇 가지 보완이 필요합니다. 검수 의견을 확인해주세요.'
        ELSE '매물 상태를 확인해주세요.'
      END,
      '/properties/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
