-- ============================================
-- 어드민 시스템 개선 Phase 1: 기본 테이블 추가
-- ============================================

-- ============================================
-- 1. admin_settings 테이블 (어드민 설정)
-- ============================================

CREATE TABLE admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_approval_enabled BOOLEAN DEFAULT false NOT NULL,
  auto_approval_threshold INTEGER DEFAULT 70 CHECK (auto_approval_threshold >= 0 AND auto_approval_threshold <= 100),
  rejection_templates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 기본 설정 삽입 (한 개의 레코드만 존재)
INSERT INTO admin_settings (auto_approval_enabled, auto_approval_threshold, rejection_templates)
VALUES (
  false,
  70,
  '[
    {"id": "low_quality_images", "title": "이미지 품질 불량", "content": "업로드하신 이미지의 품질이 기준에 미달합니다. 더 선명하고 밝은 사진으로 교체해 주세요."},
    {"id": "incomplete_info", "title": "정보 불충분", "content": "매물 정보가 불충분합니다. 상세 설명, 편의시설, 주변 정보를 추가로 입력해 주세요."},
    {"id": "inappropriate_price", "title": "가격 부적정", "content": "설정하신 가격이 시장 가격과 큰 차이가 있습니다. 가격을 재검토해 주세요."},
    {"id": "wrong_location", "title": "위치 정보 오류", "content": "입력하신 주소 정보가 정확하지 않습니다. 정확한 주소를 다시 입력해 주세요."},
    {"id": "duplicate", "title": "중복 등록", "content": "이미 등록된 매물과 중복됩니다. 기존 매물을 확인해 주세요."}
  ]'::jsonb
);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. audit_logs 테이블 (감사 로그)
-- ============================================

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT, -- 관리자 이메일 (삭제되어도 기록 유지)
  action_type TEXT NOT NULL, -- 'approve', 'reject', 'bulk_approve', 'bulk_reject', 'update_settings' 등
  target_type TEXT NOT NULL, -- 'property', 'settings', 'template' 등
  target_id UUID, -- 대상 ID (property_id 등)
  details JSONB DEFAULT '{}'::jsonb, -- 추가 상세 정보
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 3. notifications 테이블 (알림)
-- ============================================

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'property_approved', 'property_rejected', 'new_property' 등
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- 클릭 시 이동할 URL (선택)
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 4. properties 테이블에 새 컬럼 추가
-- ============================================

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS ai_review_status TEXT DEFAULT 'pending' CHECK (ai_review_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_quality_scores JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS text_corrections JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS price_recommendation JSONB DEFAULT '{}'::jsonb;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_properties_ai_review_status ON properties(ai_review_status);
CREATE INDEX IF NOT EXISTS idx_properties_auto_approved ON properties(auto_approved);

-- ============================================
-- RLS 정책: admin_settings 테이블
-- ============================================

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 관리자만 설정 조회 가능
CREATE POLICY "Admins can view settings"
ON admin_settings FOR SELECT
USING (auth.is_admin());

-- 관리자만 설정 수정 가능
CREATE POLICY "Admins can update settings"
ON admin_settings FOR UPDATE
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

-- ============================================
-- RLS 정책: audit_logs 테이블
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 로그 조회 가능
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (auth.is_admin());

-- 관리자만 로그 삽입 가능
CREATE POLICY "Admins can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.is_admin());

-- ============================================
-- RLS 정책: notifications 테이블
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 수정 가능 (읽음 상태 변경)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 알림 생성 가능
CREATE POLICY "Admins can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.is_admin());

-- 관리자는 모든 알림 조회 가능
CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
USING (auth.is_admin());

-- ============================================
-- 헬퍼 함수: 감사 로그 자동 생성
-- ============================================

-- 매물 상태 변경 시 자동으로 감사 로그 생성
CREATE OR REPLACE FUNCTION log_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- status가 변경된 경우에만 로그 생성
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (admin_id, admin_email, action_type, target_type, target_id, details)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      CASE
        WHEN NEW.status = 'approved' THEN 'approve'
        WHEN NEW.status = 'rejected' THEN 'reject'
        ELSE 'update_status'
      END,
      'property',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'property_title', NEW.title,
        'admin_comment', NEW.admin_comment,
        'auto_approved', NEW.auto_approved
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_log_property_status_change ON properties;
CREATE TRIGGER trigger_log_property_status_change
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION log_property_status_change();

-- ============================================
-- 헬퍼 함수: 매물 상태 변경 시 호스트에게 알림 생성
-- ============================================

CREATE OR REPLACE FUNCTION notify_host_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- status가 변경된 경우에만 알림 생성
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'property_approved'
        WHEN NEW.status = 'rejected' THEN 'property_rejected'
        ELSE 'property_updated'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN '매물이 승인되었습니다'
        WHEN NEW.status = 'rejected' THEN '매물이 반려되었습니다'
        ELSE '매물 상태가 변경되었습니다'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN '축하합니다! 등록하신 매물 "' || NEW.title || '"이(가) 승인되어 게스트에게 노출됩니다.'
        WHEN NEW.status = 'rejected' THEN '죄송합니다. 등록하신 매물 "' || NEW.title || '"이(가) 반려되었습니다. 반려 사유: ' || COALESCE(NEW.admin_comment, '사유 없음')
        ELSE '매물 "' || NEW.title || '"의 상태가 변경되었습니다.'
      END,
      '/properties/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_notify_host_on_status_change ON properties;
CREATE TRIGGER trigger_notify_host_on_status_change
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION notify_host_on_status_change();

-- ============================================
-- 통계 함수: 대시보드용
-- ============================================

-- 지역별 매물 통계
CREATE OR REPLACE FUNCTION get_properties_by_region()
RETURNS TABLE (
  region TEXT,
  total_count BIGINT,
  approved_count BIGINT,
  pending_count BIGINT,
  rejected_count BIGINT,
  avg_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SPLIT_PART(address, ' ', 2) as region,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    ROUND(AVG(price_per_week)) as avg_price
  FROM properties
  WHERE address IS NOT NULL AND address != ''
  GROUP BY SPLIT_PART(address, ' ', 2)
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 유형별 매물 통계
CREATE OR REPLACE FUNCTION get_properties_by_type()
RETURNS TABLE (
  property_type TEXT,
  total_count BIGINT,
  approved_count BIGINT,
  avg_price NUMERIC,
  avg_ai_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(property_type, '미분류') as property_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    ROUND(AVG(price_per_week)) as avg_price,
    ROUND(AVG(ai_review_score), 1) as avg_ai_score
  FROM properties
  GROUP BY property_type
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일별 등록 통계 (최근 30일)
CREATE OR REPLACE FUNCTION get_daily_registration_stats()
RETURNS TABLE (
  date DATE,
  total_registered BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  pending_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    created_at::DATE as date,
    COUNT(*) as total_registered,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
  FROM properties
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
