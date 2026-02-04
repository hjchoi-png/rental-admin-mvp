/**
 * 모두싸인(Modusign) API 연동 유틸리티
 */

const MODUSIGN_BASE_URL = process.env.MODUSIGN_BASE_URL || 'https://api.modusign.co.kr'
const MODUSIGN_API_KEY = process.env.MODUSIGN_API_KEY

if (!MODUSIGN_API_KEY) {
  throw new Error('MODUSIGN_API_KEY 환경변수가 설정되지 않았습니다.')
}

/**
 * 모두싸인 API 인증 헤더 생성
 */
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`:${MODUSIGN_API_KEY}`).toString('base64')}`,
  }
}

/**
 * 사용자 정보를 받아서 계약서 초안을 생성하는 함수
 * @param userData 사용자 정보 (userId, title, fileBase64, participants 등)
 * @returns 생성된 계약서 정보
 */
export async function createContractDraft(userData: {
  userId: string
  title: string
  fileBase64?: string
  fileUrl?: string
  participants: Array<{
    name: string
    contact: string // 카카오톡 아이디, 전화번호, 이메일 등
    methodType?: 'KAKAO' | 'EMAIL' | 'SMS'
    signingOrder?: number
    locale?: string
    signingDuration?: number // 분 단위
  }>
}) {
  const { userId, title, fileBase64, fileUrl, participants } = userData

  // 모두싸인 API 요청 본문 구성
  const body: any = {
    title,
    participants: participants.map((p, index) => ({
      name: p.name,
      signingOrder: p.signingOrder || index + 1,
      signingMethod: {
        type: p.methodType || 'KAKAO',
        value: p.contact,
      },
      role: 'SIGNER',
      locale: p.locale || 'ko',
      signingDuration: p.signingDuration || 20160, // 기본 14일
    })),
  }

  // 파일이 base64로 제공된 경우
  if (fileBase64) {
    body.file = {
      base64: fileBase64,
      extension: 'pdf',
    }
  }

  // 파일 URL이 제공된 경우
  if (fileUrl) {
    body.fileUrl = fileUrl
  }

  try {
    const response = await fetch(`${MODUSIGN_BASE_URL}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `모두싸인 계약서 생성 실패: ${response.status} ${errorText}`
      )
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('createContractDraft error:', error)
    throw error
  }
}

/**
 * 카카오톡으로 서명 요청을 보내는 함수
 * @param documentId 모두싸인 문서 ID
 * @returns 서명 요청 결과
 */
export async function sendSignatureRequest(documentId: string) {
  try {
    // 모두싸인 API에 서명 요청 전송
    const response = await fetch(
      `${MODUSIGN_BASE_URL}/documents/${documentId}/request`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `모두싸인 서명 요청 실패: ${response.status} ${errorText}`
      )
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('sendSignatureRequest error:', error)
    throw error
  }
}

/**
 * 모두싸인 문서 상태 조회
 * @param documentId 모두싸인 문서 ID
 * @returns 문서 정보
 */
export async function getDocumentStatus(documentId: string) {
  try {
    const response = await fetch(
      `${MODUSIGN_BASE_URL}/documents/${documentId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `모두싸인 문서 조회 실패: ${response.status} ${errorText}`
      )
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('getDocumentStatus error:', error)
    throw error
  }
}
