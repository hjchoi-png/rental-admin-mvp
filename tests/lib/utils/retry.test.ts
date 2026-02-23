import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff } from '@/lib/utils/retry'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await retryWithBackoff(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on 429 rate limit error', async () => {
    const rateLimitError = { status: 429, message: 'Rate limit exceeded' }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success')

    const promise = retryWithBackoff(fn)

    // 모든 타이머 실행
    await vi.runAllTimersAsync()

    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should use exponential backoff delays', async () => {
    const rateLimitError = { status: 429, message: 'Rate limit exceeded' }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success')

    const promise = retryWithBackoff(fn, { initialDelayMs: 1000 })

    // 첫 번째 실패 후 1초 대기
    await vi.advanceTimersByTimeAsync(1000)

    // 두 번째 실패 후 2초 대기
    await vi.advanceTimersByTimeAsync(2000)

    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max retries', async () => {
    const rateLimitError = Object.assign(new Error('Rate limit exceeded'), {
      status: 429,
    })
    const fn = vi.fn().mockRejectedValue(rateLimitError)

    const promise = retryWithBackoff(fn, { maxRetries: 2 })

    // catch를 미리 등록하여 unhandled rejection 방지
    promise.catch(() => {})

    // 모든 타이머 실행
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toMatchObject({
      status: 429,
      message: 'Rate limit exceeded',
    })

    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('should not retry on non-rate-limit errors', async () => {
    const normalError = new Error('Normal error')
    const fn = vi.fn().mockRejectedValue(normalError)

    await expect(retryWithBackoff(fn)).rejects.toThrow('Normal error')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should detect rate limit by code', async () => {
    const rateLimitError = { code: 'rate_limit_exceeded', message: 'Too many requests' }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success')

    const promise = retryWithBackoff(fn)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should detect rate limit by message', async () => {
    const rateLimitError = { message: 'Rate limit exceeded, please try again' }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success')

    const promise = retryWithBackoff(fn)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should respect maxDelayMs limit', async () => {
    const rateLimitError = { status: 429, message: 'Rate limit exceeded' }
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success')

    const promise = retryWithBackoff(fn, {
      initialDelayMs: 2000,
      maxDelayMs: 5000,
    })

    // 첫 번째: 2000ms
    await vi.advanceTimersByTimeAsync(2000)

    // 두 번째: 4000ms (2000 * 2)
    await vi.advanceTimersByTimeAsync(4000)

    // 세 번째: 5000ms (8000ms capped to maxDelayMs 5000ms)
    await vi.advanceTimersByTimeAsync(5000)

    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(4)
  })
})

