-- ============================================
-- 매물(Properties) 테이블 생성
-- ============================================

CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  weekly_price INTEGER NOT NULL CHECK (weekly_price > 0),
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}', -- 이미지 URL 배열
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_created_at ON properties(created_at DESC);

-- ============================================
-- RLS 정책 활성화
-- ============================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책: properties 테이블
-- ============================================

-- 사용자는 자신의 매물만 조회 가능
CREATE POLICY "Users can view their own properties"
ON properties FOR SELECT
USING (auth.uid() = user_id);

-- 관리자는 모든 매물 조회 가능
CREATE POLICY "Admins can view all properties"
ON properties FOR SELECT
USING (auth.is_admin());

-- 사용자는 자신의 매물만 생성 가능
CREATE POLICY "Users can insert their own properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 매물만 수정 가능
CREATE POLICY "Users can update their own properties"
ON properties FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 매물 수정 가능
CREATE POLICY "Admins can update all properties"
ON properties FOR UPDATE
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

-- 사용자는 자신의 매물만 삭제 가능
CREATE POLICY "Users can delete their own properties"
ON properties FOR DELETE
USING (auth.uid() = user_id);

-- 관리자는 모든 매물 삭제 가능
CREATE POLICY "Admins can delete all properties"
ON properties FOR DELETE
USING (auth.is_admin());

-- ============================================
-- updated_at 자동 업데이트 트리거
-- ============================================

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
