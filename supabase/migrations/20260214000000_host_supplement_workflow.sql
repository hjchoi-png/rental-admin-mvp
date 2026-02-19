-- ============================================================
-- 호스트 보완 워크플로우 마이그레이션
-- 호스트가 보완 피드백을 확인하고 수정/재제출할 수 있는 기반
-- ============================================================

-- 1. 알림 트리거 수정: host_id 사용 + 호스트 페이지 링크로 변경
CREATE OR REPLACE FUNCTION notify_host_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.host_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.host_id,
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
      '/host/properties/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 호스트용 RLS 정책: 자신의 매물 조회/수정 허용
CREATE POLICY "Hosts can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 3. 호스트용 알림 RLS 정책
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);