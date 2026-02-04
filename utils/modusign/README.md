# 모두싸인(Modusign) API 연동 가이드

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
MODUSIGN_API_KEY=your_modusign_api_key_here
MODUSIGN_BASE_URL=https://api.modusign.co.kr  # 선택사항 (기본값)
```

## 주요 함수

### 1. `createContractDraft(userData)`

사용자 정보를 받아서 계약서 초안을 생성하는 함수입니다.

**파라미터:**
```typescript
{
  userId: string                    // 사용자 ID (DB 저장용)
  title: string                     // 계약서 제목
  fileBase64?: string               // PDF 파일 (base64 인코딩)
  fileUrl?: string                  // 또는 PDF 파일 URL
  participants: Array<{
    name: string                    // 참여자 이름
    contact: string                 // 연락처 (전화번호, 카카오톡 ID 등)
    methodType?: 'KAKAO' | 'EMAIL' | 'SMS'  // 서명 방법 (기본: KAKAO)
    signingOrder?: number           // 서명 순서 (기본: 배열 순서)
    locale?: string                 // 언어 (기본: 'ko')
    signingDuration?: number        // 서명 유효 기간(분) (기본: 20160 = 14일)
  }>
}
```

**사용 예시:**
```typescript
import { createContractDraft } from '@/utils/modusign/api'
import { createClient } from '@/utils/supabase/server'

const modusignResult = await createContractDraft({
  userId: 'user-uuid',
  title: '임대차 계약서',
  fileBase64: 'base64-encoded-pdf',
  participants: [
    {
      name: '홍길동',
      contact: '010-1234-5678',
      methodType: 'KAKAO',
      signingOrder: 1,
    },
  ],
})

// DB에 저장
const supabase = await createClient()
await supabase.from('contracts').insert({
  user_id: userId,
  status: 'draft',
  modusign_id: modusignResult.id,
})
```

### 2. `sendSignatureRequest(documentId)`

카카오톡으로 서명 요청을 보내는 함수입니다.

**파라미터:**
- `documentId`: 모두싸인 문서 ID (string)

**사용 예시:**
```typescript
import { sendSignatureRequest } from '@/utils/modusign/api'

const result = await sendSignatureRequest('modusign-document-id')

// DB 상태 업데이트
await supabase
  .from('contracts')
  .update({ status: 'sent' })
  .eq('modusign_id', 'modusign-document-id')
```

### 3. `getDocumentStatus(documentId)`

모두싸인 문서의 현재 상태를 조회하는 함수입니다.

**사용 예시:**
```typescript
import { getDocumentStatus } from '@/utils/modusign/api'

const status = await getDocumentStatus('modusign-document-id')
console.log(status)
```

## 웹훅 설정

### 웹훅 엔드포인트

`POST /api/webhook/modusign`

서명이 완료되면(`DOCUMENT_COMPLETED` 이벤트) 자동으로 `contracts` 테이블의 상태를 `'signed'`로 업데이트합니다.

### 모두싸인 웹훅 설정 방법

1. 모두싸인 대시보드에 로그인
2. 설정 → 웹훅 설정으로 이동
3. 웹훅 URL 입력: `https://your-domain.com/api/webhook/modusign`
4. 이벤트 선택: `DOCUMENT_COMPLETED` (또는 필요한 이벤트)

### 웹훅 처리 로직

웹훅이 수신되면:
1. 이벤트 타입 확인 (`DOCUMENT_COMPLETED`)
2. 문서 ID 추출
3. `contracts` 테이블에서 `modusign_id`로 검색
4. 상태를 `'signed'`로 업데이트
5. PDF 다운로드 URL이 있으면 `pdf_url` 필드에 저장

## 전체 워크플로우

1. **계약서 생성**
   ```typescript
   const modusignResult = await createContractDraft(userData)
   // DB에 draft 상태로 저장
   ```

2. **서명 요청 전송**
   ```typescript
   await sendSignatureRequest(modusignResult.id)
   // DB 상태를 'sent'로 업데이트
   ```

3. **서명 완료 (웹훅 자동 처리)**
   - 모두싸인에서 웹훅 전송
   - `/api/webhook/modusign`에서 자동으로 상태를 `'signed'`로 업데이트

## 에러 처리

모든 함수는 에러 발생 시 예외를 던집니다. try-catch로 처리하세요:

```typescript
try {
  const result = await createContractDraft(userData)
} catch (error) {
  console.error('계약서 생성 실패:', error)
  // 에러 처리 로직
}
```

## 참고사항

- API 키는 서버 사이드에서만 사용하세요 (클라이언트에 노출 금지)
- 웹훅 엔드포인트는 공개되어야 하지만, 필요시 IP 화이트리스트나 서명 검증을 추가할 수 있습니다
- 모두싸인 API 문서: https://api.modusign.co.kr/docs
