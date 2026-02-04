-- ============================================
-- properties 테이블에 admin_comment 필드 추가
-- ============================================

ALTER TABLE properties
ADD COLUMN admin_comment TEXT;
