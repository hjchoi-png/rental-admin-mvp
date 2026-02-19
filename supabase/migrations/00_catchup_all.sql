-- ============================================================
-- 통합 Catch-Up 마이그레이션
-- 현재 DB 상태: hosts, listings, properties (+ property_status ENUM에 supplement 추가됨)
-- 이 스크립트 실행 후 모든 기능이 동작합니다.
-- ============================================================

-- ============================================
-- 0. 헬퍼 함수 (public 스키마)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 관리자 확인 (user_id 지정)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = check_user_id
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 관리자 확인 (현재 로그인 유저)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. properties 테이블 컬럼 추가 (누락분 전체)
-- ============================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS admin_comment TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address_detail TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS room_count INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathroom_count INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_guests INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_sqm NUMERIC(7,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_price INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_included BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deposit INTEGER DEFAULT 300000;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_date DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS min_stay TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_review_score FLOAT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_review_result JSONB;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dong TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ho TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS dong_none BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_number INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS kitchen_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS living_room_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC(7,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_unit TEXT DEFAULT '㎡';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking TEXT DEFAULT '불가능';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_condition TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_allowed BOOLEAN;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS short_title TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_transport TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS usage_guide TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_message TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS long_term_discounts JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS instant_move_discounts JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_electric BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_water BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_gas BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS maintenance_detail TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cleaning_free BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_cleaning_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pet_cleaning_fee INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cancellation_agreed BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS min_stay_weeks INTEGER DEFAULT 1;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS max_stay_weeks INTEGER DEFAULT 12;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS day_extension INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS blocked_dates JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '15:00';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_method TEXT DEFAULT '비대면';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_time TEXT DEFAULT '11:00';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_method TEXT DEFAULT '비대면';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_review_status TEXT DEFAULT 'pending';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_quality_scores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS text_corrections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_recommendation JSONB DEFAULT '{}'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS inspection_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS inspection_rule_violations TEXT[] DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS inspection_ai_violations TEXT[] DEFAULT '{}';

-- ============================================
-- 2. admin_settings 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_approval_enabled BOOLEAN DEFAULT false NOT NULL,
  auto_approval_threshold INTEGER DEFAULT 70,
  rejection_templates JSONB DEFAULT '[]'::jsonb,
  forbidden_words_enabled BOOLEAN DEFAULT true,
  duplicate_check_enabled BOOLEAN DEFAULT true,
  auto_reject_on_rules BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO admin_settings (auto_approval_enabled, auto_approval_threshold, rejection_templates)
SELECT false, 70, '[
  {"id": "low_quality_images", "title": "이미지 품질 불량", "content": "업로드하신 이미지의 품질이 기준에 미달합니다."},
  {"id": "incomplete_info", "title": "정보 불충분", "content": "매물 정보가 불충분합니다."},
  {"id": "inappropriate_price", "title": "가격 부적정", "content": "가격을 재검토해 주세요."},
  {"id": "wrong_location", "title": "위치 정보 오류", "content": "주소를 다시 입력해 주세요."},
  {"id": "duplicate", "title": "중복 등록", "content": "이미 등록된 매물과 중복됩니다."}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view settings" ON admin_settings;
CREATE POLICY "Admins can view settings" ON admin_settings FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;
CREATE POLICY "Admins can update settings" ON admin_settings FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 3. audit_logs 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
CREATE POLICY "Admins can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 4. notifications 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications" ON notifications FOR SELECT USING (is_admin());

-- ============================================
-- 5. forbidden_words 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS forbidden_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'accommodation_fraud', 'external_contact', 'direct_transaction', 'contact_pattern'
  )),
  severity TEXT DEFAULT 'reject' CHECK (severity IN ('reject', 'flag')),
  description TEXT,
  is_regex BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forbidden_words_category ON forbidden_words(category);
ALTER TABLE forbidden_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage forbidden words" ON forbidden_words;
CREATE POLICY "Admin can manage forbidden words" ON forbidden_words FOR ALL
  USING (EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'));
DROP POLICY IF EXISTS "Service role can read forbidden words" ON forbidden_words;
CREATE POLICY "Service role can read forbidden words" ON forbidden_words FOR SELECT USING (true);

-- 금칙어 시드 데이터
INSERT INTO forbidden_words (word, category, severity, description) VALUES
  ('1박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('연박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('당일숙박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
  ('당일 숙박', 'accommodation_fraud', 'reject', '숙박업 오인 표현'),
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

INSERT INTO forbidden_words (word, category, severity, description) VALUES
  ('직거래', 'direct_transaction', 'reject', '직거래 유도'),
  ('계좌', 'direct_transaction', 'reject', '직거래 유도'),
  ('입금', 'direct_transaction', 'reject', '직거래 유도'),
  ('현금 할인', 'direct_transaction', 'reject', '직거래 유도'),
  ('현금할인', 'direct_transaction', 'reject', '직거래 유도'),
  ('플랫폼 밖', 'direct_transaction', 'reject', '직거래 유도'),
  ('수수료 없이', 'direct_transaction', 'reject', '직거래 유도')
ON CONFLICT DO NOTHING;

INSERT INTO forbidden_words (word, category, severity, description, is_regex) VALUES
  ('010-?\d{4}-?\d{4}', 'contact_pattern', 'reject', '전화번호 패턴', true),
  ('011-?\d{3,4}-?\d{4}', 'contact_pattern', 'reject', '전화번호 패턴', true),
  ('공일공', 'contact_pattern', 'reject', '전화번호 한글 우회', false),
  ('공일일', 'contact_pattern', 'reject', '전화번호 한글 우회', false),
  ('0\s*1\s*0', 'contact_pattern', 'reject', '전화번호 띄어쓰기 우회', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_properties_address_dong_ho
  ON properties(address, dong, ho)
  WHERE status IN ('pending', 'approved', 'supplement');
CREATE INDEX IF NOT EXISTS idx_properties_ai_review_status ON properties(ai_review_status);
CREATE INDEX IF NOT EXISTS idx_properties_auto_approved ON properties(auto_approved);

-- ============================================
-- 7. 트리거 함수
-- ============================================

CREATE OR REPLACE FUNCTION log_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (admin_id, admin_email, action_type, target_type, target_id, details)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      CASE WHEN NEW.status = 'approved' THEN 'approve' WHEN NEW.status = 'rejected' THEN 'reject' ELSE 'update_status' END,
      'property', NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'property_title', NEW.title, 'admin_comment', NEW.admin_comment, 'auto_approved', NEW.auto_approved)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_property_status_change ON properties;
CREATE TRIGGER trigger_log_property_status_change
  AFTER UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION log_property_status_change();

CREATE OR REPLACE FUNCTION notify_host_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.host_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.host_id,
      CASE WHEN NEW.status = 'approved' THEN 'property_approved' WHEN NEW.status = 'rejected' THEN 'property_rejected' WHEN NEW.status = 'supplement' THEN 'property_supplement' ELSE 'property_status_changed' END,
      CASE WHEN NEW.status = 'approved' THEN '매물이 승인되었습니다' WHEN NEW.status = 'rejected' THEN '매물 검수 결과: 반려' WHEN NEW.status = 'supplement' THEN '매물 검수 결과: 보완 필요' ELSE '매물 상태가 변경되었습니다' END,
      CASE WHEN NEW.status = 'approved' THEN '매물이 승인되어 게스트에게 노출됩니다.' WHEN NEW.status = 'rejected' THEN COALESCE(NEW.admin_comment, '정책 위반으로 반려되었습니다.') WHEN NEW.status = 'supplement' THEN '몇 가지 보완이 필요합니다. 검수 의견을 확인해주세요.' ELSE '매물 상태를 확인해주세요.' END,
      '/host/properties/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_host_on_status_change ON properties;
CREATE TRIGGER trigger_notify_host_on_status_change
  AFTER UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION notify_host_on_status_change();

-- ============================================
-- 8. 호스트용 RLS 정책
-- ============================================

DROP POLICY IF EXISTS "Hosts can view own properties" ON properties;
CREATE POLICY "Hosts can view own properties" ON properties FOR SELECT USING (auth.uid() = host_id);
DROP POLICY IF EXISTS "Hosts can update own properties" ON properties;
CREATE POLICY "Hosts can update own properties" ON properties FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- ============================================
-- 9. 통계 함수
-- ============================================

CREATE OR REPLACE FUNCTION get_properties_by_region()
RETURNS TABLE (region TEXT, total_count BIGINT, approved_count BIGINT, pending_count BIGINT, rejected_count BIGINT, avg_price NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT SPLIT_PART(p.address, ' ', 2), COUNT(*), COUNT(*) FILTER (WHERE p.status = 'approved'), COUNT(*) FILTER (WHERE p.status = 'pending'), COUNT(*) FILTER (WHERE p.status = 'rejected'), ROUND(AVG(p.price_per_week))
  FROM properties p WHERE p.address IS NOT NULL AND p.address != ''
  GROUP BY SPLIT_PART(p.address, ' ', 2) ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_daily_registration_stats()
RETURNS TABLE (date DATE, total_registered BIGINT, approved_count BIGINT, rejected_count BIGINT, pending_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.created_at::DATE, COUNT(*), COUNT(*) FILTER (WHERE p.status = 'approved'), COUNT(*) FILTER (WHERE p.status = 'rejected'), COUNT(*) FILTER (WHERE p.status = 'pending')
  FROM properties p WHERE p.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY p.created_at::DATE ORDER BY p.created_at::DATE DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료! 다음: RAG 시스템 (별도 실행)
-- ============================================
