'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/admin/login?error=' + encodeURIComponent('이메일과 비밀번호를 입력해주세요.'))
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/admin/login?error=' + encodeURIComponent(error.message))
  }

  // 성공 시 캐시를 날리고 /admin으로 리다이렉트
  revalidatePath('/', 'layout')
  redirect('/admin')
}
