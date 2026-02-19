/**
 * 정책 문서 벡터 인제스트 스크립트
 *
 * 사용법: npx tsx scripts/ingest-policies.ts
 *
 * 1. STR-정책/files (1)/ 폴더의 MD 파일 읽기
 * 2. chunker로 청크 분할
 * 3. OpenAI로 배치 임베딩
 * 4. Supabase policy_embeddings에 upsert
 */

import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { chunkMarkdown } from "../lib/rag/chunker"
import type { DocumentChunk } from "../lib/rag/types"

// 환경 변수 로드 (.env.local)
import * as dotenv from "dotenv"
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const POLICY_DIR = path.resolve(__dirname, "../data/policies")
const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536
const BATCH_SIZE = 100

async function main() {
  console.log("=== 정책 문서 벡터 인제스트 시작 ===\n")

  // 1. 환경 변수 확인
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

  // 2. MD 파일 읽기
  if (!fs.existsSync(POLICY_DIR)) {
    console.error(`정책 문서 폴더 없음: ${POLICY_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(POLICY_DIR).filter((f) => f.endsWith(".md"))
  console.log(`발견된 MD 파일: ${files.length}개`)

  // 3. 청킹
  const allChunks: DocumentChunk[] = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(POLICY_DIR, file), "utf-8")
    const chunks = chunkMarkdown(content, file)
    allChunks.push(...chunks)
    console.log(`  ${file}: ${chunks.length}개 청크`)
  }

  console.log(`\n총 청크 수: ${allChunks.length}개`)

  if (allChunks.length === 0) {
    console.log("청크가 없습니다. 종료합니다.")
    return
  }

  // 4. 기존 데이터 삭제 (전체 재인제스트)
  console.log("\n기존 임베딩 데이터 삭제 중...")
  const { error: deleteError } = await supabase
    .from("policy_embeddings")
    .delete()
    .neq("id", 0) // 전체 삭제

  if (deleteError) {
    console.error("삭제 실패:", deleteError.message)
    process.exit(1)
  }

  // 5. 배치 임베딩 생성
  console.log("\n임베딩 생성 중...")
  const embeddings: number[][] = []

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

  // 6. Supabase에 저장
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
    token_count: Math.ceil(chunk.content.length / 3), // 한국어 대략 추정
  }))

  // 배치 삽입
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

  // 7. 결과 요약
  console.log("\n=== 인제스트 완료 ===")
  console.log(`총 파일: ${files.length}개`)
  console.log(`총 청크: ${allChunks.length}개`)

  // 카테고리별 통계
  const stats = allChunks.reduce(
    (acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  console.log("카테고리별:")
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count}개`)
  }
}

main().catch((err) => {
  console.error("인제스트 실패:", err)
  process.exit(1)
})
