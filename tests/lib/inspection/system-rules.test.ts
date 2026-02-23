import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkSystemRules } from '@/lib/inspection/system-rules'
import type { PropertyCheckInput } from '@/lib/inspection/system-rules'

// Supabase mock
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}))

describe('checkSystemRules - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validProperty: PropertyCheckInput = {
    id: 'test-id',
    address: '서울시 강남구 테헤란로 123',
    dong: '101',
    ho: '501',
    user_id: 'test-user-id',
    short_title: '깨끗한 원룸',
    description: '조용하고 깨끗한 원룸입니다',
    location_transport: '지하철역 도보 5분',
    usage_guide: '체크인은 오후 2시부터 가능합니다',
    host_message: '편안한 휴식 되시길 바랍니다',
    maintenance_detail: '관리비 월 10만원',
    parking_condition: '주차 1대 가능',
  }

  it('should handle gracefully when admin_settings query fails', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const mockCreateClient = createClient as ReturnType<typeof vi.fn>

    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.reject(new Error('DB connection error'))),
        })),
      })),
    })

    const result = await checkSystemRules(validProperty)

    // 에러가 발생해도 pass 반환 (graceful degradation)
    expect(result.passed).toBe(true)
    expect(result.decision).toBe('pass')
    expect(result.violations).toEqual([])
  })

  it('should handle gracefully when createClient fails', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const mockCreateClient = createClient as ReturnType<typeof vi.fn>

    mockCreateClient.mockImplementation(() => {
      throw new Error('Supabase client creation failed')
    })

    const result = await checkSystemRules(validProperty)

    // 전체 실패 시에도 pass 반환
    expect(result.passed).toBe(true)
    expect(result.decision).toBe('pass')
    expect(result.violations).toEqual([])
  })

  it('should detect contact patterns even when DB checks fail', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const mockCreateClient = createClient as ReturnType<typeof vi.fn>

    // DB 호출은 실패하도록 설정
    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.reject(new Error('DB error'))),
        })),
      })),
    })

    // 연락처 패턴이 포함된 매물
    const propertyWithContact: PropertyCheckInput = {
      ...validProperty,
      description: '연락주세요 010-1234-5678',
    }

    const result = await checkSystemRules(propertyWithContact)

    // DB 실패해도 연락처 패턴 체크는 성공 (정규식 기반)
    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.violations.some(v => v.category === 'contact_pattern')).toBe(true)
  })

  it('should continue checking other rules when one rule fails', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const mockCreateClient = createClient as ReturnType<typeof vi.fn>

    // forbidden_words는 실패, 나머지는 성공
    mockCreateClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'forbidden_words') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.reject(new Error('forbidden_words error'))),
            })),
          }
        }
        // admin_settings와 properties는 정상
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            in: vi.fn(() => ({
              neq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        }
      }),
    })

    const propertyWithUrl: PropertyCheckInput = {
      ...validProperty,
      description: '자세한 사항은 example.com에서 확인하세요',
    }

    const result = await checkSystemRules(propertyWithUrl)

    // forbidden_words 실패해도 연락처 패턴 체크는 작동
    expect(result.violations.some(v => v.rule === 'contact_url_pattern')).toBe(true)
  })

  it('should return pass when all checks complete without violations', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const mockCreateClient = createClient as ReturnType<typeof vi.fn>

    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          in: vi.fn(() => ({
            neq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        })),
      })),
    })

    const result = await checkSystemRules(validProperty)

    expect(result.passed).toBe(true)
    expect(result.decision).toBe('pass')
    expect(result.violations).toEqual([])
  })
})
