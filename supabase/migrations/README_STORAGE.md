# Supabase Storage 설정 가이드

## Storage 버킷 생성

매물 등록 기능을 사용하려면 Supabase Storage에 `property-images` 버킷을 생성해야 합니다.

### 방법 1: Supabase 대시보드에서 생성

1. Supabase 대시보드에 로그인
2. Storage 메뉴로 이동
3. "New bucket" 버튼 클릭
4. 다음 정보 입력:
   - **Name**: `property-images`
   - **Public bucket**: ✅ 체크 (공개 버킷으로 설정)
5. "Create bucket" 클릭

### 방법 2: SQL로 생성

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Storage 정책 설정 (사용자는 자신의 파일만 업로드 가능)
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage 정책 설정 (모든 사용자가 읽기 가능)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Storage 정책 설정 (사용자는 자신의 파일만 삭제 가능)
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 버킷 정책 확인

생성 후 다음을 확인하세요:

- ✅ 버킷이 공개(Public)로 설정되어 있는지
- ✅ 업로드/읽기/삭제 정책이 올바르게 설정되어 있는지

## 문제 해결

### 이미지 업로드 실패 시

1. 버킷이 존재하는지 확인
2. 버킷이 공개로 설정되어 있는지 확인
3. Storage 정책이 올바르게 설정되어 있는지 확인
4. 브라우저 콘솔에서 에러 메시지 확인
