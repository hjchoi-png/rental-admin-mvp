/**
 * RAG 파이프라인 관련 타입 정의
 */

/** 문서 청크 — 청킹 후 임베딩 전 단계 */
export interface DocumentChunk {
  content: string
  sourceFile: string
  category: ChunkCategory
  target: ChunkTarget
  sectionTitle: string
  priority: number
  contentType: ChunkContentType
}

/** 벡터 검색 결과 */
export interface PolicyChunk {
  id: number
  content: string
  sourceFile: string
  category: string
  sectionTitle: string
  priority: number
  contentType: string
  similarity: number
}

/** 채팅 메시지 */
export interface ChatMessage {
  id?: number
  sessionId: string
  role: "user" | "assistant"
  content: string
  sources?: PolicyChunk[]
  createdAt?: string
}

/** 채팅 세션 */
export interface ChatSession {
  id: string
  adminUserId: string
  title: string | null
  contextPropertyId: string | null
  createdAt: string
  updatedAt: string
}

/** 문서 카테고리 */
export type ChunkCategory = "faq" | "policy" | "operation" | "reference"

/** 대상 */
export type ChunkTarget = "common" | "host" | "guest"

/** 콘텐츠 타입 */
export type ChunkContentType = "qa_pair" | "policy_rule" | "reference"

/** 파일명 → 카테고리 매핑 */
export const FILE_CATEGORY_MAP: Record<string, { category: ChunkCategory; priority: number; target: ChunkTarget }> = {
  "FAQ.md": { category: "faq", priority: 0, target: "common" },
  "FAQ_공통.md": { category: "faq", priority: 0, target: "common" },
  "FAQ_호스트.md": { category: "faq", priority: 0, target: "host" },
  "FAQ_게스트.md": { category: "faq", priority: 0, target: "guest" },
  "운영-1_매물검수.md": { category: "operation", priority: 0, target: "common" },
  "정책-1_법적기준.md": { category: "policy", priority: 0, target: "common" },
  "정책-2_가격정책.md": { category: "policy", priority: 0, target: "common" },
  "정책-3_기타정책.md": { category: "policy", priority: 0, target: "common" },
  "운영-2_호스트게스트관리.md": { category: "operation", priority: 1, target: "common" },
  "H1.md": { category: "operation", priority: 1, target: "common" },
  "Note.md": { category: "reference", priority: 2, target: "common" },
  "FAQ-타사.md": { category: "reference", priority: 2, target: "common" },
  "정책-타사A.md": { category: "reference", priority: 2, target: "common" },
}

/** 검색 옵션 */
export interface SearchOptions {
  category?: string
  topK?: number
  minSimilarity?: number
  maxPriority?: number
}
