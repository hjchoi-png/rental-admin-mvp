"use server"

import { createClient } from "@/utils/supabase/server"
import { getEmbedding } from "./embeddings"
import type { PolicyChunk, SearchOptions } from "./types"

/**
 * 정책 문서 벡터 유사도 검색
 *
 * 1. 질문 텍스트 → OpenAI 임베딩
 * 2. pgvector match_policy_documents RPC 호출
 * 3. 유사도 필터링 후 결과 반환
 */
export async function searchPolicies(
  query: string,
  options?: SearchOptions
): Promise<PolicyChunk[]> {
  const topK = options?.topK ?? 5
  const minSimilarity = options?.minSimilarity ?? 0.3
  const maxPriority = options?.maxPriority ?? 2

  // 1. 질문 임베딩
  const queryEmbedding = await getEmbedding(query)

  // 2. Supabase RPC 호출
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("match_policy_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    filter_category: options?.category ?? null,
    filter_priority: maxPriority,
  })

  if (error) {
    console.error("벡터 검색 실패:", error.message)
    return []
  }

  // 3. 유사도 필터링
  const results: PolicyChunk[] = (data || [])
    .filter((d: Record<string, unknown>) => (d.similarity as number) >= minSimilarity)
    .map((d: Record<string, unknown>) => ({
      id: d.id as number,
      content: d.content as string,
      sourceFile: d.source_file as string,
      category: d.category as string,
      sectionTitle: d.section_title as string,
      priority: d.priority as number,
      contentType: d.content_type as string,
      similarity: d.similarity as number,
    }))

  return results
}

