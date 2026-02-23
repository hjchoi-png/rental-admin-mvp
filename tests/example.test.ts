import { describe, it, expect } from 'vitest'

describe('Test Framework Setup', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const str = 'Hello World'
    expect(str).toContain('World')
    expect(str.toLowerCase()).toBe('hello world')
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr).toContain(3)
  })

  it('should handle object operations', () => {
    const obj = { name: 'Test', value: 123 }
    expect(obj).toHaveProperty('name')
    expect(obj.value).toBeGreaterThan(100)
  })
})
