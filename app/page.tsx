import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-5xl font-bold text-center">
          단기임대 관리자 페이지
        </h1>
        <Link href="/register">
          <Button size="lg" className="text-lg px-8 py-6 h-auto">
            매물 등록하러 가기
          </Button>
        </Link>
      </div>
    </main>
  )
}
