"use server"

/**
 * 시스템 규칙 검수 엔진
 *
 * 운영-1_매물검수.md 정책 기반
 * AI 없이 룰 기반으로 매물 등록 데이터를 검수한다.
 *
 * 검수 흐름:
 * 1. 금칙어 체크 (forbidden_words 테이블 + 정규식 패턴)
 * 2. 주소 중복 체크 (동일 동/호)
 * 3. 연락처 패턴 체크 (010, 공일공, URL 등)
 * 4. 관리대상 호스트 체크 (위반 3회+)
 */

import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ============================================================
// Types
// ============================================================

export interface SystemRuleViolation {
  rule: string
  category:
    | "accommodation_fraud"
    | "external_contact"
    | "direct_transaction"
    | "contact_pattern"
    | "duplicate_address"
    | "managed_host"
  severity: "critical" | "major" | "minor"
  field?: string
  message: string
  matchedWords?: string[]
}

export interface SystemRuleCheckResult {
  passed: boolean
  violations: SystemRuleViolation[]
  decision: "pass" | "reject" | "flag"
  rejectReason?: string
}

export interface PropertyTextFields {
  short_title: string
  description: string
  location_transport?: string | null
  usage_guide?: string | null
  host_message?: string | null
  maintenance_detail?: string | null
  parking_condition?: string | null
}

export interface PropertyCheckInput extends PropertyTextFields {
  id?: string
  address: string
  dong?: string | null
  ho?: string | null
  user_id?: string | null
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * 시스템 규칙 전체 검수 실행
 *
 * 매물 등록 직후 호출되어 금칙어, 주소 중복, 연락처 패턴, 관리대상 호스트를 체크한다.
 * AI 검수 전에 실행되며, 위반 발견 시 즉시 자동 반려할 수 있다.
 *
 * Graceful Degradation: 개별 규칙 체크 실패 시 로그만 남기고 다음 규칙 계속 검사
 * Supabase 클라이언트를 한 번만 생성하여 모든 하위 함수에 전달한다.
 */
export async function checkSystemRules(
  property: PropertyCheckInput
): Promise<SystemRuleCheckResult> {
  const violations: SystemRuleViolation[] = []

  try {
    // Supabase 클라이언트 1회 생성 → 전체 검수에서 재사용
    const supabase = await createClient()

    // admin_settings 조회 (실패 시 기본값 사용)
    let settings: {
      forbidden_words_enabled?: boolean
      duplicate_check_enabled?: boolean
      auto_reject_on_rules?: boolean
    } = {}

    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("forbidden_words_enabled, duplicate_check_enabled, auto_reject_on_rules")
        .single()
      settings = data || {}
    } catch (settingsError) {
      console.error("[checkSystemRules] admin_settings 조회 실패:", settingsError)
      // 기본값으로 계속 진행
    }

    // 1. 금칙어 체크 (실패해도 다음 규칙 계속)
    if (settings?.forbidden_words_enabled !== false) {
      try {
        const wordViolations = await checkForbiddenWords(supabase, property)
        violations.push(...wordViolations)
      } catch (wordError) {
        console.error("[checkSystemRules] 금칙어 체크 실패:", wordError)
      }
    }

    // 2. 연락처 패턴 체크 (정규식 기반, DB 불필요)
    try {
      const patternViolations = checkContactPatterns(property)
      violations.push(...patternViolations)
    } catch (patternError) {
      console.error("[checkSystemRules] 연락처 패턴 체크 실패:", patternError)
    }

    // 3. 주소 중복 체크 (실패해도 다음 규칙 계속)
    if (settings?.duplicate_check_enabled !== false) {
      try {
        const dupeViolation = await checkDuplicateAddress(
          supabase,
          property.address,
          property.dong ?? null,
          property.ho ?? null,
          property.id
        )
        if (dupeViolation) violations.push(dupeViolation)
      } catch (dupeError) {
        console.error("[checkSystemRules] 주소 중복 체크 실패:", dupeError)
      }
    }

    // 4. 관리대상 호스트 체크 (실패해도 판정 계속)
    if (property.user_id) {
      try {
        const hostViolation = await checkManagedHost(supabase, property.user_id)
        if (hostViolation) violations.push(hostViolation)
      } catch (hostError) {
        console.error("[checkSystemRules] 관리대상 호스트 체크 실패:", hostError)
      }
    }

    // 판정
    const hasCritical = violations.some((v) => v.severity === "critical")
    const hasMajor = violations.some((v) => v.severity === "major")

    let decision: "pass" | "reject" | "flag" = "pass"
    let rejectReason: string | undefined

    if (hasCritical || hasMajor) {
      decision = "reject"
      const firstViolation = violations.find(
        (v) => v.severity === "critical" || v.severity === "major"
      )
      rejectReason = firstViolation?.message
    }

    return {
      passed: violations.length === 0,
      violations,
      decision,
      rejectReason,
    }
  } catch (error) {
    // 전체 함수 레벨 에러 (Supabase 클라이언트 생성 실패 등)
    console.error("[checkSystemRules] 시스템 규칙 검수 전체 실패:", error)

    // Graceful degradation: 에러여도 pass 반환 (AI 검수로 넘김)
    return {
      passed: true,
      violations: [],
      decision: "pass",
    }
  }
}

// ============================================================
// 개별 규칙 구현
// ============================================================

/**
 * 금칙어 체크
 *
 * forbidden_words 테이블에서 단어 목록을 가져와
 * 매물의 모든 텍스트 필드에 대해 매칭한다.
 */
async function checkForbiddenWords(
  supabase: SupabaseClient,
  property: PropertyTextFields
): Promise<SystemRuleViolation[]> {
  const violations: SystemRuleViolation[] = []

  try {
    const { data: forbiddenWords, error } = await supabase
      .from("forbidden_words")
      .select("word, category, severity, is_regex")
      .eq("severity", "reject") // reject 등급만 자동 반려 대상

    if (error) {
      console.error("[checkForbiddenWords] DB 조회 실패:", error)
      return violations
    }

    if (!forbiddenWords || forbiddenWords.length === 0) {
      return violations
    }

  // 체크할 텍스트 필드 목록
  const fields: { name: string; value: string | null | undefined }[] = [
    { name: "매물명", value: property.short_title },
    { name: "매물 소개", value: property.description },
    { name: "위치 및 교통", value: property.location_transport },
    { name: "이용 안내", value: property.usage_guide },
    { name: "호스트 메시지", value: property.host_message },
    { name: "관리비 상세", value: property.maintenance_detail },
    { name: "주차 조건", value: property.parking_condition },
  ]

  // 카테고리별 매칭 결과 집계
  const matchesByCategory = new Map<
    string,
    { words: string[]; fields: string[] }
  >()

  for (const field of fields) {
    if (!field.value) continue
    const text = field.value.toLowerCase()

    for (const fw of forbiddenWords) {
      let matched = false

      if (fw.is_regex) {
        try {
          const regex = new RegExp(fw.word, "gi")
          matched = regex.test(field.value)
        } catch {
          // 잘못된 정규식은 무시
          matched = false
        }
      } else {
        matched = text.includes(fw.word.toLowerCase())
      }

      if (matched) {
        if (!matchesByCategory.has(fw.category)) {
          matchesByCategory.set(fw.category, { words: [], fields: [] })
        }
        const entry = matchesByCategory.get(fw.category)!
        if (!entry.words.includes(fw.word)) entry.words.push(fw.word)
        if (!entry.fields.includes(field.name)) entry.fields.push(field.name)
      }
    }
  }

    // 카테고리별 violation 생성
    const categoryMessages: Record<string, string> = {
      accommodation_fraud: "숙박업 오인 표현이 포함되어 있습니다",
      external_contact: "외부 연락 유도 표현이 포함되어 있습니다",
      direct_transaction: "직거래 유도 표현이 포함되어 있습니다",
      contact_pattern: "연락처 정보가 포함되어 있습니다",
    }

    for (const [category, matches] of Array.from(matchesByCategory.entries())) {
      violations.push({
        rule: `forbidden_words_${category}`,
        category: category as SystemRuleViolation["category"],
        severity: "major",
        field: matches.fields.join(", "),
        message: `${categoryMessages[category] || "금칙어 발견"}: "${matches.words.join('", "')}" (${matches.fields.join(", ")})`,
        matchedWords: matches.words,
      })
    }

    return violations
  } catch (error) {
    console.error("[checkForbiddenWords] 처리 중 오류:", error)
    return violations
  }
}

/**
 * 연락처 패턴 체크 (정규식)
 *
 * 전화번호, URL, 한글 우회 표현 등을 감지한다.
 * forbidden_words 테이블과 별도로 항상 실행.
 */
function checkContactPatterns(
  property: PropertyTextFields
): SystemRuleViolation[] {
  const violations: SystemRuleViolation[] = []

  const allText = [
    property.short_title,
    property.description,
    property.location_transport,
    property.usage_guide,
    property.host_message,
    property.maintenance_detail,
    property.parking_condition,
  ]
    .filter(Boolean)
    .join(" ")

  if (!allText) return violations

  // 전화번호 패턴 (다양한 형태)
  const phonePatterns = [
    /01[016789]-?\s?\d{3,4}-?\s?\d{4}/g,           // 010-1234-5678, 010 1234 5678
    /\d{2,3}-\d{3,4}-\d{4}/g,                       // 02-123-4567
    /공\s?일\s?공/g,                                  // 공일공
    /공\s?일\s?일/g,                                  // 공일일
    /0\s+1\s+0/g,                                    // 0 1 0 (띄어쓰기 우회)
    /영\s?일\s?영/g,                                  // 영일영
  ]

  for (const pattern of phonePatterns) {
    if (pattern.test(allText)) {
      violations.push({
        rule: "contact_phone_pattern",
        category: "contact_pattern",
        severity: "major",
        message: "전화번호 또는 전화번호 우회 표현이 감지되었습니다",
      })
      break // 하나만 잡아도 됨
    }
  }

  // URL 패턴
  const urlPatterns = [
    /https?:\/\/\S+/gi,
    /www\.\S+/gi,
    /[a-zA-Z0-9-]+\.(com|co\.kr|net|kr|io|me)\b/gi,
  ]

  for (const pattern of urlPatterns) {
    if (pattern.test(allText)) {
      violations.push({
        rule: "contact_url_pattern",
        category: "contact_pattern",
        severity: "major",
        message: "URL 또는 웹사이트 주소가 감지되었습니다",
      })
      break
    }
  }

  // 계좌번호 패턴 (간단한 형태)
  const accountPatterns = [
    /\d{3,4}-\d{2,6}-\d{4,}/g, // 은행 계좌 패턴
  ]

  for (const pattern of accountPatterns) {
    const matches = allText.match(pattern)
    if (matches) {
      // 전화번호와 구분: 숫자 그룹이 3개 이상이고 총 자릿수가 10 이상
      const longMatches = matches.filter((m) => m.replace(/\D/g, "").length >= 10)
      if (longMatches.length > 0) {
        violations.push({
          rule: "contact_account_pattern",
          category: "direct_transaction",
          severity: "major",
          message: "계좌번호로 의심되는 패턴이 감지되었습니다",
        })
        break
      }
    }
  }

  return violations
}

/**
 * 주소 중복 체크
 *
 * 동일한 address + dong + ho 조합이 이미 등록되어 있는지 확인한다.
 * 자기 자신(수정 중인 매물)은 제외한다.
 */
async function checkDuplicateAddress(
  supabase: SupabaseClient,
  address: string,
  dong: string | null,
  ho: string | null,
  currentPropertyId?: string
): Promise<SystemRuleViolation | null> {
  try {
    // dong과 ho가 모두 없으면 중복 체크 불가 → skip
    if (!dong && !ho) return null

    let query = supabase
      .from("properties")
      .select("id, status, title")
      .eq("address", address)
      .in("status", ["pending", "approved", "supplement"])

    if (dong) query = query.eq("dong", dong)
    if (ho) query = query.eq("ho", ho)
    if (currentPropertyId) query = query.neq("id", currentPropertyId)

    const { data, error } = await query

    if (error) {
      console.error("[checkDuplicateAddress] DB 조회 실패:", error)
      return null
    }

    if (!data || data.length === 0) return null

    return {
      rule: "duplicate_address",
      category: "duplicate_address",
      severity: "major",
      message: `동일 주소(${dong || ""}동 ${ho || ""}호)에 이미 등록된 매물이 있습니다`,
      matchedWords: [data[0]?.id],
    }
  } catch (error) {
    console.error("[checkDuplicateAddress] 처리 중 오류:", error)
    return null
  }
}

/**
 * 관리대상 호스트 체크
 *
 * 해당 호스트가 이전에 반려된 매물이 3건 이상인 경우
 * 관리 대상으로 분류하여 자동 반려한다.
 */
async function checkManagedHost(
  supabase: SupabaseClient,
  userId: string
): Promise<SystemRuleViolation | null> {
  try {
    // 반려된 매물 수 조회
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "rejected")

    if (error) {
      console.error("[checkManagedHost] DB 조회 실패:", error)
      return null
    }

    if (!data) return null

    if (data.length >= 3) {
      return {
        rule: "managed_host",
        category: "managed_host",
        severity: "major",
        message: `이 호스트는 반려 이력이 ${data.length}건으로 관리 대상입니다. 관리자 수동 검토가 필요합니다.`,
      }
    }

    return null
  } catch (error) {
    console.error("[checkManagedHost] 처리 중 오류:", error)
    return null
  }
}
