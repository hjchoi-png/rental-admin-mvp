/**
 * 모두싸인 API 사용 예시
 * 
 * 이 파일은 참고용 예시입니다. 실제 사용 시에는
 * 서버 컴포넌트나 API 라우트에서 사용하세요.
 */

import { createContractDraft, sendSignatureRequest } from './api'
import { createClient } from '@/utils/supabase/server'

/**
 * 예시 1: 계약서 초안 생성 및 DB 저장
 */
export async function exampleCreateContract() {
  const supabase = await createClient()

  // 1. 사용자 정보 준비
  const userData = {
    userId: 'user-uuid-here', // auth.users의 ID
    title: '임대차 계약서',
    fileBase64: 'base64-encoded-pdf-content', // 또는 fileUrl 사용
    participants: [
      {
        name: '홍길동',
        contact: '010-1234-5678', // 카카오톡 연동 전화번호
        methodType: 'KAKAO' as const,
        signingOrder: 1,
      },
      {
        name: '김철수',
        contact: '010-9876-5432',
        methodType: 'KAKAO' as const,
        signingOrder: 2,
      },
    ],
  }

  try {
    // 2. 모두싸인에 계약서 초안 생성
    const modusignResult = await createContractDraft(userData)

    // 3. DB에 계약서 정보 저장
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        user_id: userData.userId,
        status: 'draft',
        modusign_id: modusignResult.id || modusignResult.documentId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return { contract, modusignResult }
  } catch (error) {
    console.error('계약서 생성 실패:', error)
    throw error
  }
}

/**
 * 예시 2: 서명 요청 보내기
 */
export async function exampleSendSignatureRequest(contractId: string) {
  const supabase = await createClient()

  try {
    // 1. DB에서 계약서 정보 조회
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('modusign_id, status')
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      throw new Error('계약서를 찾을 수 없습니다')
    }

    if (!contract.modusign_id) {
      throw new Error('모두싸인 문서 ID가 없습니다')
    }

    // 2. 모두싸인에 서명 요청 전송
    const result = await sendSignatureRequest(contract.modusign_id)

    // 3. DB 상태 업데이트
    await supabase
      .from('contracts')
      .update({ status: 'sent' })
      .eq('id', contractId)

    return result
  } catch (error) {
    console.error('서명 요청 실패:', error)
    throw error
  }
}

/**
 * 예시 3: API 라우트에서 사용하는 방법
 * 
 * app/api/contracts/create/route.ts
 * 
 * export async function POST(request: Request) {
 *   const { userId, title, participants } = await request.json()
 *   
 *   const modusignResult = await createContractDraft({
 *     userId,
 *     title,
 *     participants,
 *   })
 *   
 *   // DB 저장 로직...
 *   
 *   return NextResponse.json({ success: true, data: modusignResult })
 * }
 */
