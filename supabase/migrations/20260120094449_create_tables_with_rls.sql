-- ============================================
-- 테이블 생성: 전자계약 관리, KYC 인증, AI 섀도우 모니터링
-- RLS 정책 포함
-- ============================================

-- 1. 전자계약 관리 (모두싸인 연동)
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('draft', 'sent', 'signed', 'rejected')),
  modusign_id TEXT, -- 모두싸인 문서 ID
  pdf_url TEXT, -- 완료된 계약서 저장 경로
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 신분증 인증 (KYC) - 보안 필수
CREATE TABLE kyc_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  image_path TEXT, -- Supabase Storage 경로 (직접 URL 아님)
  admin_note TEXT, -- 관리자 코멘트
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI 섀도우 모니터링 로그
CREATE TABLE ai_shadow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_message TEXT,
  ai_draft TEXT, -- AI가 제안한 답변
  final_response TEXT, -- 관리자가 수정/승인한 최종 답변
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'edited')),
  confidence_score FLOAT, -- AI 확신도
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 관리자 확인 함수
-- ============================================

-- 관리자 역할 확인 함수 (raw_user_meta_data의 role 필드 사용)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 현재 사용자가 관리자인지 확인하는 함수
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS 정책 활성화
-- ============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_shadow_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책: contracts 테이블
-- ============================================

-- 사용자는 자신의 계약만 조회 가능
CREATE POLICY "Users can view their own contracts"
ON contracts FOR SELECT
USING (auth.uid() = user_id);

-- 관리자는 모든 계약 조회 가능
CREATE POLICY "Admins can view all contracts"
ON contracts FOR SELECT
USING (auth.is_admin());

-- 사용자는 자신의 계약만 생성 가능
CREATE POLICY "Users can insert their own contracts"
ON contracts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 계약만 수정 가능
CREATE POLICY "Users can update their own contracts"
ON contracts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 계약 수정 가능
CREATE POLICY "Admins can update all contracts"
ON contracts FOR UPDATE
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

-- 사용자는 자신의 계약만 삭제 가능
CREATE POLICY "Users can delete their own contracts"
ON contracts FOR DELETE
USING (auth.uid() = user_id);

-- 관리자는 모든 계약 삭제 가능
CREATE POLICY "Admins can delete all contracts"
ON contracts FOR DELETE
USING (auth.is_admin());

-- ============================================
-- RLS 정책: kyc_verifications 테이블
-- ============================================

-- 사용자는 자신의 KYC 인증만 조회 가능
CREATE POLICY "Users can view their own KYC verifications"
ON kyc_verifications FOR SELECT
USING (auth.uid() = user_id);

-- 관리자는 모든 KYC 인증 조회 가능
CREATE POLICY "Admins can view all KYC verifications"
ON kyc_verifications FOR SELECT
USING (auth.is_admin());

-- 사용자는 자신의 KYC 인증만 생성 가능
CREATE POLICY "Users can insert their own KYC verifications"
ON kyc_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 KYC 인증 수정 불가 (관리자만 수정 가능)
CREATE POLICY "Admins can update all KYC verifications"
ON kyc_verifications FOR UPDATE
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

-- 사용자는 자신의 KYC 인증 삭제 불가 (관리자만 삭제 가능)
CREATE POLICY "Admins can delete all KYC verifications"
ON kyc_verifications FOR DELETE
USING (auth.is_admin());

-- ============================================
-- RLS 정책: ai_shadow_logs 테이블
-- ============================================

-- 관리자만 조회 가능
CREATE POLICY "Only admins can view AI shadow logs"
ON ai_shadow_logs FOR SELECT
USING (auth.is_admin());

-- 관리자만 생성 가능
CREATE POLICY "Only admins can insert AI shadow logs"
ON ai_shadow_logs FOR INSERT
WITH CHECK (auth.is_admin());

-- 관리자만 수정 가능
CREATE POLICY "Only admins can update AI shadow logs"
ON ai_shadow_logs FOR UPDATE
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

-- 관리자만 삭제 가능
CREATE POLICY "Only admins can delete AI shadow logs"
ON ai_shadow_logs FOR DELETE
USING (auth.is_admin());

