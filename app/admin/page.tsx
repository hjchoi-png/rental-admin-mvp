'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // 새로운 대시보드 페이지로 리다이렉트
    router.replace('/admin/dashboard')
  }, [router])

  return null
}
