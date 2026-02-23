"use client"

import { useEffect } from "react"
import { AlertCircle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Admin Error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          페이지를 불러오는 중 오류가 발생했습니다. 다시 시도하거나 대시보드로 이동해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            오류 코드: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
          다시 시도
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <Home className="h-4 w-4" strokeWidth={1.5} />
          대시보드
        </Link>
      </div>
    </div>
  )
}
