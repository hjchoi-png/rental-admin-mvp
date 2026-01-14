'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, PartyPopper } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function SuccessContent() {
  const searchParams = useSearchParams()
  const count = searchParams.get('count') || '1'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      <div className="w-full max-w-2xl">
        <Card className="border-2 border-yellow-200 shadow-2xl bg-gradient-to-br from-white to-yellow-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Sparkles className="h-16 w-16 text-yellow-500 animate-pulse" />
                <PartyPopper className="h-12 w-12 text-orange-500 absolute -top-2 -right-2 animate-bounce" />
              </div>
            </div>
            <CardTitle className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-pink-600 mb-2">
              축하합니다!
            </CardTitle>
            <CardDescription className="text-xl md:text-2xl text-gray-700 font-medium">
              {count}번째 호스트가 되신 것을 환영합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="flex justify-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
              <Sparkles className="h-6 w-6 text-orange-400 animate-pulse delay-75" />
              <Sparkles className="h-6 w-6 text-pink-400 animate-pulse delay-150" />
            </div>
            <p className="text-gray-600 text-lg">
              매물 등록이 완료되었습니다.
              <br />
              빠른 시일 내에 검토 후 연락드리겠습니다.
            </p>
            <div className="pt-4">
              <Link href="/">
                <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg">
                  메인으로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
