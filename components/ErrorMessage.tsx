/**
 * 공통 에러 메시지 컴포넌트
 *
 * 데이터 로드 실패, 권한 오류 등에 사용한다.
 */

import { AlertCircle } from "lucide-react"

interface ErrorMessageProps {
  title?: string
  message: string
  retry?: () => void
}

export default function ErrorMessage({
  title = "오류가 발생했습니다",
  message,
  retry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      {retry && (
        <button
          onClick={retry}
          className="text-sm text-primary hover:underline"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
