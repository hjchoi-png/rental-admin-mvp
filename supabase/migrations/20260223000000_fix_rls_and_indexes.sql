-- ============================================================
-- Phase 1.1 점검 결과 수정사항
-- 작성일: 2026-02-23
-- 참조: docs/inspection/phase-1.1-database-inspection.md
-- ============================================================
-- Critical + Medium 이슈 해결:
--   C-1: Properties RLS 정책 중복 (user_id vs host_id)
--   C-2: is_admin() 함수 중복 정의
--   M-1: 게스트 공개 조회 정책 누락
--   M-2: IVFFlat lists 파라미터 부적절
--   M-3: ivfflat.probes 설정 누락
--   L-1: weekly_price 인덱스 추가
-- ============================================================

-- ============================================
-- 1. RLS 정책 정리 (C-1, M-1)
-- ============================================

-- 1.1 기존 중복 정책 제거 (host_id 기반 정책)
-- 이유: user_id와 host_id가 혼재되어 혼선 발생
-- 결정: user_id만 사용 (host_id는 향후 단계에서 정리)
DROP POLICY IF EXISTS "Hosts can view own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can update own properties" ON properties;

-- 1.2 게스트 공개 조회 정책 추가
-- 이유: 비로그인 사용자가 승인된 매물을 볼 수 없는 문제 해결
CREATE POLICY "Guests can view approved properties"
  ON properties FOR SELECT
  USING (status = 'approved');

-- ============================================
-- 2. is_admin() 함수 정리 (C-2)
-- ============================================

-- 2.1 파라미터 있는 버전 제거 (일관성 확보)
DROP FUNCTION IF EXISTS public.is_admin(UUID);

-- 2.2 public.is_admin() (파라미터 없음) 재확인
-- 이미 00_catchup_all.sql:32-41에 정의되어 있으므로 재생성
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 auth.is_admin() 제거 시도 (권한 오류 예상, 무시)
-- DROP FUNCTION IF EXISTS auth.is_admin();
-- ⚠️ 주의: Supabase SQL Editor에서 auth 스키마 함수 생성/삭제 불가
-- 이미 생성 실패했을 것이므로 무시

-- ============================================
-- 3. 인덱스 추가 (L-1)
-- ============================================

-- 3.1 가격대별 필터링 인덱스
-- 이유: 게스트가 가격대별 매물 검색 시 성능 최적화
CREATE INDEX IF NOT EXISTS idx_properties_price_per_week
  ON properties(price_per_week)
  WHERE status = 'approved';

-- ============================================
-- 4. pgvector 인덱스 최적화 (M-2)
-- ============================================

-- 4.0 인덱스 생성을 위한 메모리 설정
-- IVFFlat 인덱스는 더 많은 메모리 필요
SET maintenance_work_mem = '64MB';

-- 4.1 기존 IVFFlat 인덱스 제거
DROP INDEX IF EXISTS idx_pe_embedding;

-- 4.2 적절한 lists 파라미터로 재생성
-- 이유: 현재 ~250개 청크 → lists=1 권장 (공식: rows/1000)
-- lists=10은 너무 많아 검색 품질 저하
CREATE INDEX idx_pe_embedding
  ON policy_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1);

-- 4.3 메모리 설정 원래대로 복구
RESET maintenance_work_mem;

-- ============================================
-- 5. pgvector 쿼리 파라미터 설정 (M-3)
-- ============================================

-- ⚠️ 주의: 데이터베이스 레벨 설정
-- Supabase 대시보드 → Database → Settings에서 실행 권장
-- 또는 lib/rag/search.ts에서 쿼리 전 SET ivfflat.probes = 3 실행

-- ALTER DATABASE postgres SET ivfflat.probes = 3;
-- ↑ 이 명령은 Supabase 대시보드에서 별도 실행 필요

-- ============================================
-- 완료
-- ============================================

-- 검증 쿼리:
-- SELECT * FROM pg_policies WHERE tablename = 'properties';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'properties';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'policy_embeddings';
