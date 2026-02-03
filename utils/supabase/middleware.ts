import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 사용자 세션 확인
    const { data: { user } } = await supabase.auth.getUser()

    // /admin 경로 보호 (로그인 페이지 제외)
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isLoginPage = request.nextUrl.pathname === '/admin/login'

    if (isAdminRoute && !isLoginPage && !user) {
      // 로그인 안 된 상태로 어드민 접근 시 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 이미 로그인된 상태로 로그인 페이지 접근 시 대시보드로 리다이렉트
    if (isLoginPage && user) {
      const adminUrl = new URL('/admin', request.url)
      return NextResponse.redirect(adminUrl)
    }

    return response
  } catch (e) {
    // 에러 발생 시에도 앱이 멈추지 않게 기본 응답 반환
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}
