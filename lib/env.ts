import { z } from "zod"

/**
 * 환경 변수 검증
 *
 * 앱 시작 시 필수 환경 변수가 설정되어 있는지 확인한다.
 * 누락 시 명확한 에러 메시지를 출력하여 디버깅을 돕는다.
 */

const envSchema = z.object({
  // Supabase (필수)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL이 유효한 URL이 아닙니다"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다"),

  // OpenAI (선택 — 없으면 AI 검수 비활성화)
  OPENAI_API_KEY: z.string().optional(),

  // Anthropic (선택 — 없으면 CS 챗봇 비활성화)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Supabase Service Role (선택 — 관리자 기능에 필요)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n")

    console.error(
      `\n❌ 환경 변수 검증 실패:\n${errorMessages}\n\n` +
      `.env.local 파일을 확인해주세요. 설정 가이드: SETUP.md\n`
    )

    // 개발 환경에서는 경고만, 프로덕션에서는 에러
    if (process.env.NODE_ENV === "production") {
      throw new Error("필수 환경 변수가 설정되지 않았습니다.")
    }
  }

  return result.success ? result.data : (process.env as unknown as Env)
}

export const env = validateEnv()
