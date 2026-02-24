"use server"

import OpenAI from "openai"
import { retryWithBackoff } from "@/lib/utils/retry"

const MODEL = "text-embedding-3-small"
const DIMENSIONS = 1536

let openaiClient: OpenAI | null = null

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0, // retryWithBackoff로 직접 관리
      timeout: 30000, // 30초 타임아웃
    })
  }
  return openaiClient
}

/** 단일 텍스트 → 벡터 임베딩 */
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getClient()

  return retryWithBackoff(async () => {
    const response = await client.embeddings.create({
      model: MODEL,
      input: text.replace(/\n/g, " ").trim(),
      dimensions: DIMENSIONS,
    })
    return response.data[0].embedding
  })
}

/** 배치 텍스트 → 벡터 임베딩 (최대 2048개) */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getClient()
  const cleaned = texts.map((t) => t.replace(/\n/g, " ").trim())

  // OpenAI 배치 제한: 2048개씩 나눠서 처리
  const BATCH_SIZE = 2048
  const results: number[][] = []

  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    const batch = cleaned.slice(i, i + BATCH_SIZE)

    const embeddings = await retryWithBackoff(async () => {
      const response = await client.embeddings.create({
        model: MODEL,
        input: batch,
        dimensions: DIMENSIONS,
      })
      return response.data.map((d) => d.embedding)
    })

    results.push(...embeddings)
  }

  return results
}
