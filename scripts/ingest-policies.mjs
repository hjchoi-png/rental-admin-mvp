/**
 * 정책 문서 벡터 인제스트 스크립트 (Node.js ESM)
 *
 * 사용법: node scripts/ingest-policies.mjs
 *
 * tsx OOM 이슈 회피를 위해 순수 JS로 작성
 */

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const POLICY_DIR = path.resolve(__dirname, "../data/policies")
const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536
const BATCH_SIZE = 100

// ============================================================
// FILE_CATEGORY_MAP
// ============================================================
const FILE_CATEGORY_MAP = {
  "FAQ.md": { category: "faq", priority: 0, target: "common" },
  "FAQ_공통.md": { category: "faq", priority: 0, target: "common" },
  "FAQ_호스트.md": { category: "faq", priority: 0, target: "host" },
  "FAQ_게스트.md": { category: "faq", priority: 0, target: "guest" },
  "운영-1_매물검수.md": { category: "operation", priority: 0, target: "common" },
  "정책-1_법적기준.md": { category: "policy", priority: 0, target: "common" },
  "정책-2_가격정책.md": { category: "policy", priority: 0, target: "common" },
  "정책-3_기타정책.md": { category: "policy", priority: 0, target: "common" },
  "운영-2_호스트게스트관리.md": { category: "operation", priority: 1, target: "common" },
}

// ============================================================
// Chunking Functions
// ============================================================

function chunkMarkdown(content, filename) {
  const meta = FILE_CATEGORY_MAP[filename] || {
    category: "reference",
    priority: 2,
    target: "common",
  }

  if (filename === "FAQ.md") {
    return chunkPipeFAQ(content, filename, meta)
  }
  if (filename.startsWith("FAQ_")) {
    return chunkMarkdownFAQ(content, filename, meta)
  }
  return chunkByHeaders(content, filename, meta)
}

/** 마크다운 FAQ (### Q. / A. 형식) */
function chunkMarkdownFAQ(content, filename, meta) {
  const chunks = []
  const lines = content.split("\n")

  let currentQuestion = null
  let currentCategory = ""
  let currentStatus = ""
  let currentAnswer = []
  let inAnswer = false

  function flushQA() {
    if (currentQuestion && currentAnswer.length > 0) {
      const answer = currentAnswer.join("\n").trim()
      if (answer) {
        // 미완료/확인 상태면 [검토중] 태그 추가
        const isUnconfirmed = currentStatus === "미완료" || currentStatus === "확인"
        const needsUpdate = currentQuestion.includes("추후 업데이트 필요")
        const prefix = (isUnconfirmed || needsUpdate) ? "[검토중] " : ""
        // 질문에서 (추후 업데이트 필요) 제거
        const cleanQuestion = currentQuestion.replace(/\(추후 업데이트 필요\)\s*/g, "").trim()
        chunks.push({
          content: `${prefix}Q: ${cleanQuestion}\nA: ${answer}`,
          sourceFile: filename,
          category: meta.category,
          target: meta.target,
          sectionTitle: currentCategory || "FAQ",
          priority: (isUnconfirmed || needsUpdate) ? Math.max(meta.priority, 1) : meta.priority,
          contentType: "qa_pair",
        })
      }
    }
    currentQuestion = null
    currentCategory = ""
    currentStatus = ""
    currentAnswer = []
    inAnswer = false
  }

  for (const line of lines) {
    const qMatch = line.match(/^###\s+Q\.\s*(.+)/)
    if (qMatch) {
      flushQA()
      currentQuestion = qMatch[1].trim()
      continue
    }

    // 분류와 상태 파싱: *분류: [카테고리] (상태)*
    const catMatch = line.match(/^\*분류:\s*\[(.+?)\]\s*\((.+?)\)/)
    if (catMatch && currentQuestion) {
      currentCategory = catMatch[1].trim()
      currentStatus = catMatch[2].trim()
      continue
    }
    // 분류만 있고 상태 없는 경우 폴백
    const catOnlyMatch = line.match(/^\*분류:\s*\[(.+?)\]/)
    if (catOnlyMatch && !catMatch && currentQuestion) {
      currentCategory = catOnlyMatch[1].trim()
      continue
    }

    const aMatch = line.match(/^A\.\s*(.*)/)
    if (aMatch && currentQuestion) {
      inAnswer = true
      if (aMatch[1].trim()) currentAnswer.push(aMatch[1].trim())
      continue
    }

    if (inAnswer && line.trim()) {
      currentAnswer.push(line.trim())
    }
  }

  flushQA()
  return chunks
}

/** 파이프 구분 FAQ (구 형식) */
function chunkPipeFAQ(content, filename, meta) {
  const chunks = []
  const lines = content.split("\n").filter((l) => l.trim())
  let pendingQ = null

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim())

    if (parts.length >= 6) {
      const [usage, , section, targetStr, type, ...contentParts] = parts
      const text = contentParts.join("|").trim()
      const target = parseTarget(targetStr)
      if (usage !== "O" && usage !== "") continue
      if (!text) continue

      if (type === "Q") {
        pendingQ = { section, target, question: text }
      } else if (type === "A" && pendingQ) {
        const answer = text.startsWith("ㄴ") ? text.slice(1).trim() : text
        chunks.push({
          content: `Q: ${pendingQ.question}\nA: ${answer}`,
          sourceFile: filename,
          category: meta.category,
          target: pendingQ.target,
          sectionTitle: pendingQ.section,
          priority: meta.priority,
          contentType: "qa_pair",
        })
        pendingQ = null
      }
      continue
    }

    if (parts.length >= 5) {
      const [section, subSection, targetStr, question, ...answerParts] = parts
      const answer = answerParts.join("|").trim()
      if (!question || !answer) continue
      const target = parseTarget(targetStr)
      chunks.push({
        content: `Q: ${question}\nA: ${answer}`,
        sourceFile: filename,
        category: meta.category,
        target,
        sectionTitle: subSection ? `${section} > ${subSection}` : section,
        priority: meta.priority,
        contentType: "qa_pair",
      })
    }
  }

  return chunks
}

/** 스킵 대상 섹션 패턴 */
const SKIP_SECTION_PATTERNS = [
  /^참고\s*UI/,
  /^History/i,
  /^Reference\s*-\s*타사/,
  /Reference\s*-\s*타사\s*플랫폼/,
]

/** 미확정 콘텐츠 감지 패턴 */
const UNCONFIRMED_PATTERNS = [
  "팀 내부 의견 필요",
  "추후 검토",
  "추후 업데이트",
  "작성중",
  "확인 필요",
]

function shouldSkipSection(sectionTitle) {
  return SKIP_SECTION_PATTERNS.some((pat) => pat.test(sectionTitle))
}

function isUnconfirmedContent(text) {
  return UNCONFIRMED_PATTERNS.some((pat) => text.includes(pat))
}

/** 헤더 기반 섹션 분할 */
function chunkByHeaders(content, filename, meta) {
  const maxChars = 1500
  const overlap = 200
  const chunks = []
  const lines = content.split("\n")

  let currentSection = filename.replace(".md", "")
  let currentContent = ""

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      if (currentContent.trim() && !shouldSkipSection(currentSection)) {
        const text = currentContent.trim()
        // Reference 하위 내용도 필터링 (숫자) Reference 패턴)
        if (!/^\d+\)\s*Reference\s*-\s*타사/.test(currentSection)) {
          const prefix = isUnconfirmedContent(text) ? "[검토중] " : ""
          const priority = prefix ? Math.max(meta.priority, 1) : meta.priority
          pushChunks(chunks, prefix + text, filename, { ...meta, priority }, currentSection, maxChars, overlap)
        }
      }
      currentSection = headerMatch[2].trim()
      currentContent = ""
      continue
    }

    // "참고 UI"로 시작하는 라인은 스킵
    if (/^참고\s*UI/.test(line.trim())) {
      continue
    }

    currentContent += line + "\n"
  }

  if (currentContent.trim() && !shouldSkipSection(currentSection)) {
    const text = currentContent.trim()
    if (!/^\d+\)\s*Reference\s*-\s*타사/.test(currentSection)) {
      const prefix = isUnconfirmedContent(text) ? "[검토중] " : ""
      const priority = prefix ? Math.max(meta.priority, 1) : meta.priority
      pushChunks(chunks, prefix + text, filename, { ...meta, priority }, currentSection, maxChars, overlap)
    }
  }

  return chunks
}

function pushChunks(chunks, text, filename, meta, sectionTitle, maxChars, overlap) {
  // [검토중] 접두어 감지 — 분할 시 모든 조각에 전파
  const reviewPrefix = text.startsWith("[검토중] ") ? "[검토중] " : ""
  const cleanText = reviewPrefix ? text.slice(reviewPrefix.length) : text

  if (text.length <= maxChars) {
    chunks.push({
      content: text,
      sourceFile: filename,
      category: meta.category,
      target: meta.target,
      sectionTitle,
      priority: meta.priority,
      contentType: "policy_rule",
    })
    return
  }

  let start = 0
  while (start < cleanText.length) {
    const end = Math.min(start + maxChars - reviewPrefix.length, cleanText.length)
    const chunkContent = reviewPrefix + cleanText.slice(start, end).trim()
    chunks.push({
      content: chunkContent,
      sourceFile: filename,
      category: meta.category,
      target: meta.target,
      sectionTitle,
      priority: meta.priority,
      contentType: "policy_rule",
    })
    if (end === cleanText.length) break
    const nextStart = end - overlap
    if (nextStart <= start) break
    start = nextStart
  }
}

function parseTarget(str) {
  const lower = (str || "").toLowerCase().trim()
  if (lower.includes("호스트") || lower === "host") return "host"
  if (lower.includes("게스트") || lower === "guest") return "guest"
  return "common"
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("=== 정책 문서 벡터 인제스트 시작 ===\n")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요")
    process.exit(1)
  }
  if (!openaiKey) {
    console.error("OPENAI_API_KEY 필요")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const openai = new OpenAI({ apiKey: openaiKey })

  // MD 파일 읽기
  if (!fs.existsSync(POLICY_DIR)) {
    console.error(`정책 문서 폴더 없음: ${POLICY_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(POLICY_DIR).filter((f) => f.endsWith(".md"))
  console.log(`발견된 MD 파일: ${files.length}개`)

  // 청킹
  const allChunks = []
  for (const file of files) {
    const content = fs.readFileSync(path.join(POLICY_DIR, file), "utf-8")
    // 빈 파일 스킵 (200바이트 미만)
    if (content.trim().length < 200) {
      console.log(`  ${file}: 스킵 (내용 부족, ${content.trim().length}자)`)
      continue
    }
    const chunks = chunkMarkdown(content, file)
    allChunks.push(...chunks)
    console.log(`  ${file}: ${chunks.length}개 청크`)
  }

  console.log(`\n총 청크 수: ${allChunks.length}개`)

  if (allChunks.length === 0) {
    console.log("청크가 없습니다. 종료합니다.")
    return
  }

  // 기존 데이터 삭제
  console.log("\n기존 임베딩 데이터 삭제 중...")
  const { error: deleteError } = await supabase
    .from("policy_embeddings")
    .delete()
    .neq("id", 0)

  if (deleteError) {
    console.error("삭제 실패:", deleteError.message)
    process.exit(1)
  }

  // 배치 임베딩 생성
  console.log("\n임베딩 생성 중...")
  const embeddings = []

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map((c) => c.content.replace(/\n/g, " ").trim())

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    })

    embeddings.push(...response.data.map((d) => d.embedding))
    console.log(`  ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length} 완료`)
  }

  // Supabase에 저장
  console.log("\nSupabase에 저장 중...")

  const records = allChunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    source_file: chunk.sourceFile,
    category: chunk.category,
    target: chunk.target,
    section_title: chunk.sectionTitle,
    priority: chunk.priority,
    content_type: chunk.contentType,
    token_count: Math.ceil(chunk.content.length / 3),
  }))

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error: insertError } = await supabase
      .from("policy_embeddings")
      .insert(batch)

    if (insertError) {
      console.error(`삽입 실패 (batch ${i}):`, insertError.message)
      process.exit(1)
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} 저장 완료`)
  }

  // 결과 요약
  console.log("\n=== 인제스트 완료 ===")
  console.log(`총 파일: ${files.length}개`)
  console.log(`총 청크: ${allChunks.length}개`)

  const stats = allChunks.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {})
  console.log("카테고리별:")
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count}개`)
  }
}

main().catch((err) => {
  console.error("인제스트 실패:", err)
  process.exit(1)
})
