-- ============================================
-- properties 테이블에 비회원(guest) 필드 추가
-- ============================================

-- user_id를 nullable로 변경 (비회원도 등록 가능하도록)
ALTER TABLE properties
ALTER COLUMN user_id DROP NOT NULL;

-- 비회원 정보 필드 추가
ALTER TABLE properties
ADD COLUMN guest_name TEXT,
ADD COLUMN guest_email TEXT,
ADD COLUMN guest_phone TEXT;

-- user_id 또는 guest 정보 중 하나는 필수로 체크하는 제약조건 (선택사항)
-- ALTER TABLE properties
-- ADD CONSTRAINT check_user_or_guest CHECK (
--   (user_id IS NOT NULL) OR (guest_name IS NOT NULL AND guest_email IS NOT NULL)
-- );
