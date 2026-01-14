'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  // 1. Supabase 클라이언트 생성
  const supabase = await createClient()

  // 2. 폼에서 데이터 가져오기
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 3. 로그인 시도
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // 에러나면 리다이렉트 하지 않고 에러 메시지 반환
    console.error('로그인 에러:', error.message)
    return { error: error.message }
  }

  // 4. 로그인 성공 시 캐시 날리기
  revalidatePath('/', 'layout')

  // 5. 페이지 이동 (try-catch 바깥에서 실행해야 함!)
  redirect('/admin')
}
