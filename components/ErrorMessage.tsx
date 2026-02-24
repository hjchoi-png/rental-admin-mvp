/**
 * 공통 에러 메시지 컴포넌트
 *
 * 데이터 로드 실패, 권한 오류 등에 사용한다.
 * error.tsx 파일들의 일관된 UI 패턴을 제공한다.
 */

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorMessageProps {
  title?: string
  message: string
  retry?: () => void
  errorCode?: string
  fullPage?: boolean
}

export default function ErrorMessage({
  title = "오류가 발생했습니다",
  message,
  retry,
  errorCode,
  fullPage = false,
}: ErrorMessageProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {message}
        </p>
        {errorCode && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            오류 코드: {errorCode}
          </p>
        )}
      </div>
      {retry && (
        <div className="flex gap-3">
          <Button onClick={retry} size="sm">
            다시 시도
          </Button>
        </div>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-20">
        {content}
      </div>
    )
  }

  return content
}
