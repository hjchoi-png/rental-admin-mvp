import { describe, it, expect } from 'vitest'
import { chunkMarkdown } from '@/lib/rag/chunker'

describe('chunkMarkdown - Overlap Logic', () => {
  it('should not create infinite loop with overlap', () => {
    const content = 'A'.repeat(1600) // 1600자
    const filename = 'test.md'
    const maxChars = 1500
    const overlap = 200

    const chunks = chunkMarkdown(content, filename, { maxChars, overlap })

    // 무한 루프 아니면 정상 완료
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.length).toBeLessThan(10) // 합리적 개수
  })

  it('should correctly overlap between chunks', () => {
    const content = 'ABCDEFGHIJ'.repeat(200) // 2000자
    const filename = 'test.md'
    const chunks = chunkMarkdown(content, filename, { maxChars: 1000, overlap: 100 })

    expect(chunks.length).toBeGreaterThan(1)

    // 첫 번째 청크의 끝 100자 = 두 번째 청크의 시작 100자
    if (chunks.length >= 2) {
      const chunk1End = chunks[0].content.slice(-100)
      const chunk2Start = chunks[1].content.slice(0, 100)

      expect(chunk1End).toBe(chunk2Start)
    }
  })

  it('should handle edge case: content shorter than maxChars', () => {
    const content = 'Short content'
    const filename = 'test.md'
    const chunks = chunkMarkdown(content, filename, { maxChars: 1500, overlap: 200 })

    expect(chunks.length).toBe(1)
    expect(chunks[0].content).toBe(content)
  })

  it('should handle exact maxChars boundary', () => {
    const content = 'X'.repeat(1500) // 정확히 1500자
    const filename = 'test.md'
    const chunks = chunkMarkdown(content, filename, { maxChars: 1500, overlap: 200 })

    expect(chunks.length).toBe(1)
    expect(chunks[0].content).toBe(content)
  })

  it('should handle large overlap correctly', () => {
    const content = 'Y'.repeat(2000) // 2000자
    const filename = 'test.md'
    const chunks = chunkMarkdown(content, filename, { maxChars: 1000, overlap: 900 })

    // overlap이 너무 크지만 무한 루프 없이 완료
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.length).toBeLessThan(100) // 합리적 개수
  })

  it('should handle multi-section markdown', () => {
    const content = `
## 섹션 1
${'내용 '.repeat(300)}

## 섹션 2
${'내용 '.repeat(300)}

## 섹션 3
${'내용 '.repeat(300)}
    `.trim()

    const filename = 'multi-section.md'
    const chunks = chunkMarkdown(content, filename, { maxChars: 1500, overlap: 200 })

    expect(chunks.length).toBeGreaterThan(0)
    // 각 섹션이 별도 청크로 분리됨
    const section1Chunks = chunks.filter(c => c.sectionTitle === '섹션 1')
    const section2Chunks = chunks.filter(c => c.sectionTitle === '섹션 2')
    const section3Chunks = chunks.filter(c => c.sectionTitle === '섹션 3')

    expect(section1Chunks.length).toBeGreaterThan(0)
    expect(section2Chunks.length).toBeGreaterThan(0)
    expect(section3Chunks.length).toBeGreaterThan(0)
  })
})
