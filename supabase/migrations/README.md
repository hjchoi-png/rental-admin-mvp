# Supabase 마이그레이션 가이드

## 생성된 테이블

1. **contracts** - 전자계약 관리 (모두싸인 연동)
2. **kyc_verifications** - 신분증 인증 (KYC)
3. **ai_shadow_logs** - AI 섀도우 모니터링 로그

## 마이그레이션 적용 방법

### 방법 1: Supabase CLI 사용 (권장)

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 적용
supabase db push
```

### 방법 2: Supabase 대시보드 사용

1. Supabase 대시보드에 로그인
2. SQL Editor로 이동
3. `20260120094449_create_tables_with_rls.sql` 파일의 내용을 복사하여 실행

## RLS 정책 요약

### contracts 테이블
- ✅ 사용자: 자신의 계약만 조회/생성/수정/삭제 가능
- ✅ 관리자: 모든 계약 조회/수정/삭제 가능

### kyc_verifications 테이블
- ✅ 사용자: 자신의 KYC 인증만 조회/생성 가능 (수정/삭제 불가)
- ✅ 관리자: 모든 KYC 인증 조회/수정/삭제 가능

### ai_shadow_logs 테이블
- ✅ 관리자만 모든 작업 가능 (사용자 접근 불가)

## 관리자 설정 방법

관리자 권한을 부여하려면 Supabase 대시보드에서:

1. Authentication > Users로 이동
2. 관리자로 설정할 사용자 선택
3. User Metadata 편집
4. 다음 JSON 추가:
```json
{
  "role": "admin"
}
```

또는 SQL로 직접 설정:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id = 'user-uuid-here';
```

## 보안 주의사항

- ✅ RLS가 모든 테이블에 활성화되어 있습니다
- ✅ 관리자 확인은 `raw_user_meta_data->>'role'` 필드를 사용합니다
- ✅ 외래 키 제약조건으로 데이터 무결성이 보장됩니다
- ✅ `updated_at` 필드는 자동으로 업데이트됩니다
