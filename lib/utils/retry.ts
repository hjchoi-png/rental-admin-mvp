/**
 * OpenAI Rate Limit 대응: Exponential Backoff Retry 유틸리티
 *
 * @param fn - 재시도할 비동기 함수
 * @param options - 재시도 설정
 * @returns 함수 실행 결과
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 8000,
    backoffMultiplier = 2,
  } = options

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Rate limit 오류가 아니면 즉시 throw
      if (!isRateLimitError(error)) {
        throw lastError
      }

      // 마지막 재시도면 throw
      if (attempt === maxRetries) {
        throw lastError
      }

      // 지수 백오프 대기 (1초 → 2초 → 4초 → 8초)
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      )

      console.warn(
        `[retryWithBackoff] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
      )

      await sleep(delay)
    }
  }

  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Rate limit 오류 판별
 */
function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  // OpenAI SDK 오류 구조
  const err = error as {
    status?: number
    code?: string
    message?: string
  }

  // HTTP 429 또는 rate_limit_exceeded 코드
  return (
    err.status === 429 ||
    err.code === 'rate_limit_exceeded' ||
    (typeof err.message === 'string' &&
      err.message.toLowerCase().includes('rate limit'))
  )
}

/**
 * 지연 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
