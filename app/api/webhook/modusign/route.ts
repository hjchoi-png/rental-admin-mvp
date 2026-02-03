import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * 모두싸인 웹훅 핸들러
 * 서명이 완료되면 contracts 테이블의 상태를 'signed'로 업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 웹훅 이벤트 타입 확인
    const event = body.event || body.type || body.status
    const documentId = body.documentId || body.id || body.document?.id

    console.log('모두싸인 웹훅 수신:', { event, documentId, body })

    // DOCUMENT_COMPLETED 이벤트 처리
    if (
      event === 'DOCUMENT_COMPLETED' ||
      event === 'document.completed' ||
      body.status === 'COMPLETED' ||
      body.document?.status === 'COMPLETED'
    ) {
      if (!documentId) {
        console.error('문서 ID가 없습니다:', body)
        return NextResponse.json(
          { success: false, error: '문서 ID가 필요합니다' },
          { status: 400 }
        )
      }

      // Supabase 클라이언트 생성
      const supabase = await createClient()

      // contracts 테이블에서 해당 문서 ID로 찾아서 상태 업데이트
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: 'signed',
          // PDF URL이 웹훅에 포함되어 있다면 저장
          pdf_url: body.document?.downloadUrl || body.downloadUrl || null,
        })
        .eq('modusign_id', documentId)
        .select()

      if (error) {
        console.error('계약서 상태 업데이트 실패:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      if (!data || data.length === 0) {
        console.warn('해당 문서 ID로 계약서를 찾을 수 없습니다:', documentId)
        return NextResponse.json(
          { success: false, error: '계약서를 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      console.log('계약서 상태 업데이트 완료:', data[0])

      return NextResponse.json({
        success: true,
        message: '계약서 상태가 업데이트되었습니다',
        contract: data[0],
      })
    }

    // 다른 이벤트는 로그만 남기고 성공 응답
    console.log('처리되지 않은 웹훅 이벤트:', event)
    return NextResponse.json({
      success: true,
      message: '웹훅 수신 완료 (처리할 이벤트 없음)',
    })
  } catch (error) {
    console.error('웹훅 처리 중 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

// GET 요청은 웹훅 검증용 (필요한 경우)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '모두싸인 웹훅 엔드포인트',
    method: 'POST',
  })
}
