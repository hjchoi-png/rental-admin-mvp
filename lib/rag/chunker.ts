import type { DocumentChunk, ChunkCategory, ChunkTarget, ChunkContentType } from "./types"
import { FILE_CATEGORY_MAP } from "./types"

const DEFAULT_MAX_CHARS = 1500
const DEFAULT_OVERLAP = 200

interface ChunkOptions {
  maxChars?: number
  overlap?: number
}

/**
 * 마크다운 파일을 벡터 저장용 청크로 분할
 *
 * - FAQ.md: 파이프 구분 Q+A 쌍 단위 (구 형식)
 * - FAQ_공통/호스트/게스트.md: 마크다운 ### Q. / A. 쌍 단위
 * - 나머지: 헤더(##) 기반 섹션 분할 + 오버랩
 */
export function chunkMarkdown(
  content: string,
  filename: string,
  options?: ChunkOptions
): DocumentChunk[] {
  const meta = FILE_CATEGORY_MAP[filename] || {
    category: "reference" as ChunkCategory,
    priority: 2,
    target: "common" as ChunkTarget,
  }

  if (filename === "FAQ.md") {
    return chunkFAQ(content, filename, meta)
  }

  if (filename.startsWith("FAQ_")) {
    return chunkMarkdownFAQ(content, filename, meta)
  }

  return chunkByHeaders(content, filename, meta, options)
}

/**
 * FAQ.md 전용 청킹 — 파이프 구분 테이블에서 Q+A 쌍 추출
 *
 * 형식:
 *   사용여부 | 완료여부 | 항목 | 대상 | 유형 | 내용
 *   O | O | 이용문의 | 공통 | Q | 단기 임대 서비스는 어떤 서비스인가요?
 *   O | O | 이용문의 | 공통 | A | ㄴ 단기임대 집을 쉽고 편하게...
 *
 * 후반부:
 *   항목 | 세부항목 | 대상 | 질문 | 답변
 */
function chunkFAQ(
  content: string,
  filename: string,
  meta: { category: ChunkCategory; priority: number; target: ChunkTarget }
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const lines = content.split("\n").filter((l) => l.trim())

  let pendingQ: { section: string; target: ChunkTarget; question: string } | null = null

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim())

    // 6컬럼 형식: 사용여부 | 완료여부 | 항목 | 대상 | 유형 | 내용
    if (parts.length >= 6) {
      const [usage, , section, targetStr, type, ...contentParts] = parts
      const text = contentParts.join("|").trim()
      const target = parseTarget(targetStr)

      // 사용여부 "O" 체크 (없는 행도 포함 — 후반부 데이터)
      if (usage !== "O" && usage !== "") continue
      if (!text) continue

      if (type === "Q") {
        // Q만 나오면 다음 A를 기다림
        pendingQ = { section, target, question: text }
      } else if (type === "A" && pendingQ) {
        // Q+A 쌍 완성
        const answer = text.startsWith("ㄴ") ? text.slice(1).trim() : text
        chunks.push({
          content: `Q: ${pendingQ.question}\nA: ${answer}`,
          sourceFile: filename,
          category: meta.category,
          target: pendingQ.target,
          sectionTitle: pendingQ.section,
          priority: meta.priority,
          contentType: "qa_pair" as ChunkContentType,
        })
        pendingQ = null
      }
      continue
    }

    // 5컬럼 형식 (후반부): 항목 | 세부항목 | 대상 | 질문 | 답변
    if (parts.length >= 5) {
      const [section, subSection, targetStr, question, ...answerParts] = parts
      const answer = answerParts.join("|").trim()
      if (!question || !answer) continue

      const target = parseTarget(targetStr)
      const sectionTitle = subSection ? `${section} > ${subSection}` : section

      chunks.push({
        content: `Q: ${question}\nA: ${answer}`,
        sourceFile: filename,
        category: meta.category,
        target,
        sectionTitle,
        priority: meta.priority,
        contentType: "qa_pair" as ChunkContentType,
      })
      continue
    }

    // 4컬럼 형식: 항목 | 대상 | Q | A (일부 행)
    if (parts.length === 4) {
      const [section, targetStr, question, answer] = parts
      if (!question || !answer) continue

      const target = parseTarget(targetStr)
      chunks.push({
        content: `Q: ${question}\nA: ${answer}`,
        sourceFile: filename,
        category: meta.category,
        target,
        sectionTitle: section,
        priority: meta.priority,
        contentType: "qa_pair" as ChunkContentType,
      })
      continue
    }
  }

  return chunks
}

/**
 * 마크다운 FAQ 청킹 — ### Q. / A. 형식
 *
 * FAQ_공통.md, FAQ_호스트.md, FAQ_게스트.md 전용
 *
 * 형식:
 *   ### Q. 질문 내용
 *   *분류: [카테고리] (상태)*
 *
 *   A. 답변 내용 (여러 줄 가능)
 *
 * 각 Q+A 쌍을 하나의 qa_pair 청크로 생성한다.
 * 분류 메타데이터를 sectionTitle에 포함한다.
 */
function chunkMarkdownFAQ(
  content: string,
  filename: string,
  meta: { category: ChunkCategory; priority: number; target: ChunkTarget }
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const lines = content.split("\n")

  let currentQuestion: string | null = null
  let currentCategory = ""
  let currentAnswer: string[] = []
  let inAnswer = false

  function flushQA() {
    if (currentQuestion && currentAnswer.length > 0) {
      const answer = currentAnswer.join("\n").trim()
      if (answer) {
        chunks.push({
          content: `Q: ${currentQuestion}\nA: ${answer}`,
          sourceFile: filename,
          category: meta.category,
          target: meta.target,
          sectionTitle: currentCategory || "FAQ",
          priority: meta.priority,
          contentType: "qa_pair" as ChunkContentType,
        })
      }
    }
    currentQuestion = null
    currentCategory = ""
    currentAnswer = []
    inAnswer = false
  }

  for (const line of lines) {
    // ### Q. 질문
    const qMatch = line.match(/^###\s+Q\.\s*(.+)/)
    if (qMatch) {
      flushQA()
      currentQuestion = qMatch[1].trim()
      continue
    }

    // *분류: [카테고리] (상태)*
    const catMatch = line.match(/^\*분류:\s*\[(.+?)\]/)
    if (catMatch && currentQuestion) {
      currentCategory = catMatch[1].trim()
      continue
    }

    // A. 답변 시작
    const aMatch = line.match(/^A\.\s*(.*)/)
    if (aMatch && currentQuestion) {
      inAnswer = true
      if (aMatch[1].trim()) {
        currentAnswer.push(aMatch[1].trim())
      }
      continue
    }

    // 답변 계속 (다음 Q가 나올 때까지)
    if (inAnswer && line.trim()) {
      currentAnswer.push(line.trim())
    }
  }

  // 마지막 Q&A 쌍 처리
  flushQA()

  return chunks
}

/**
 * 일반 정책 문서 — 헤더(#, ##, ###) 기반 섹션 분할
 */
function chunkByHeaders(
  content: string,
  filename: string,
  meta: { category: ChunkCategory; priority: number; target: ChunkTarget },
  options?: ChunkOptions
): DocumentChunk[] {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS
  const overlap = options?.overlap ?? DEFAULT_OVERLAP

  const chunks: DocumentChunk[] = []
  const lines = content.split("\n")

  let currentSection = filename.replace(".md", "")
  let currentContent = ""

  for (const line of lines) {
    // 헤더 감지
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      // 이전 섹션 저장
      if (currentContent.trim()) {
        pushChunks(chunks, currentContent.trim(), filename, meta, currentSection, maxChars, overlap)
      }
      currentSection = headerMatch[2].trim()
      currentContent = ""
      continue
    }

    currentContent += line + "\n"
  }

  // 마지막 섹션
  if (currentContent.trim()) {
    pushChunks(chunks, currentContent.trim(), filename, meta, currentSection, maxChars, overlap)
  }

  return chunks
}

/** 긴 섹션을 maxChars 기준으로 나누되 overlap 적용 */
function pushChunks(
  chunks: DocumentChunk[],
  text: string,
  filename: string,
  meta: { category: ChunkCategory; priority: number; target: ChunkTarget },
  sectionTitle: string,
  maxChars: number,
  overlap: number
): void {
  if (text.length <= maxChars) {
    chunks.push({
      content: text,
      sourceFile: filename,
      category: meta.category,
      target: meta.target,
      sectionTitle,
      priority: meta.priority,
      contentType: "policy_rule" as ChunkContentType,
    })
    return
  }

  // 긴 텍스트 분할
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    const chunk = text.slice(start, end)

    chunks.push({
      content: chunk.trim(),
      sourceFile: filename,
      category: meta.category,
      target: meta.target,
      sectionTitle,
      priority: meta.priority,
      contentType: "policy_rule" as ChunkContentType,
    })

    if (end === text.length) break
    const nextStart = end - overlap
    if (nextStart <= start) break // 무한 루프 방지
    start = nextStart
  }
}

function parseTarget(str: string): ChunkTarget {
  const lower = str.toLowerCase().trim()
  if (lower.includes("호스트") || lower === "host") return "host"
  if (lower.includes("게스트") || lower === "guest") return "guest"
  return "common"
}
