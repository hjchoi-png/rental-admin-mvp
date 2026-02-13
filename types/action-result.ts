/**
 * Server Action 통일 응답 타입
 *
 * 모든 Server Action에서 이 타입을 사용하여 일관된 에러 처리를 보장한다.
 *
 * 사용법:
 *   export async function myAction(): Promise<ActionResult<MyData>> {
 *     if (error) return { success: false, error: "..." }
 *     return { success: true, data: result }
 *   }
 */

export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * 목록 조회용 응답 타입 (data + pagination)
 */
export type ListResult<T> =
  | { data: T[]; error: null; total?: number; hasMore?: boolean }
  | { data: null; error: string }

/**
 * 일괄 처리용 응답 타입
 */
export type BulkResult =
  | { success: true; count: number }
  | { success: false; error: string; count: 0 }
