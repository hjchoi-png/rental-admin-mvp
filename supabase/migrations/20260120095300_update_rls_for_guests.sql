-- ============================================
-- 비회원도 매물 등록 가능하도록 RLS 정책 수정
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;

-- 새로운 정책: 회원은 자신의 매물만, 비회원도 등록 가능
CREATE POLICY "Users and guests can insert properties"
ON properties FOR INSERT
WITH CHECK (
  -- 회원인 경우: 자신의 user_id와 일치해야 함
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- 비회원인 경우: user_id가 null이고 guest 정보가 있어야 함
  (auth.uid() IS NULL AND user_id IS NULL AND guest_name IS NOT NULL)
);
