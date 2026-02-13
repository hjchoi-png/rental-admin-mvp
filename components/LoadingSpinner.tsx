/**
 * 공통 로딩 스피너 컴포넌트
 *
 * 페이지 로딩, 데이터 페칭 등에 사용한다.
 */

interface LoadingSpinnerProps {
  message?: string
  fullPage?: boolean
}

export default function LoadingSpinner({
  message = "로딩 중...",
  fullPage = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {content}
      </div>
    )
  }

  return content
}
