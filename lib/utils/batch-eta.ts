/**
 * ETA (Estimated Time of Arrival) Calculator for Batch Processing
 *
 * Calculates remaining time based on processing speed and provides
 * human-readable time estimates.
 */

export interface ETACalculator {
  startTime: number // Timestamp when processing started (ms)
  processedCount: number // Number of items processed so far
  totalCount: number // Total number of items to process
  lastUpdateTime: number // Timestamp of last update (ms)
}

export interface ETAResult {
  remainingSeconds: number // Estimated seconds remaining
  etaText: string // Human-readable estimate (e.g., "약 2분")
  speed: number // Processing speed (items/second)
  percentComplete: number // Percentage completed (0-100)
}

/**
 * Calculate ETA for ongoing batch processing
 *
 * @param calc - ETACalculator object with processing metrics
 * @returns ETAResult with time estimates and speed
 */
export function calculateETA(calc: ETACalculator): ETAResult {
  const { startTime, processedCount, totalCount, lastUpdateTime } = calc

  // Edge cases
  if (processedCount === 0) {
    return {
      remainingSeconds: 0,
      etaText: "계산 중...",
      speed: 0,
      percentComplete: 0,
    }
  }

  if (processedCount >= totalCount) {
    return {
      remainingSeconds: 0,
      etaText: "완료",
      speed: processedCount / ((lastUpdateTime - startTime) / 1000),
      percentComplete: 100,
    }
  }

  // Calculate elapsed time and average time per item
  const elapsedMs = lastUpdateTime - startTime
  const avgTimePerItemMs = elapsedMs / processedCount

  // Calculate remaining items and time
  const remainingItems = totalCount - processedCount
  const remainingMs = avgTimePerItemMs * remainingItems
  const remainingSeconds = Math.ceil(remainingMs / 1000)

  // Calculate processing speed (items/second)
  const speed = processedCount / (elapsedMs / 1000)

  // Calculate percentage
  const percentComplete = Math.round((processedCount / totalCount) * 100)

  // Format human-readable ETA
  let etaText = ""
  if (remainingSeconds < 10) {
    etaText = "곧 완료"
  } else if (remainingSeconds < 60) {
    etaText = `약 ${remainingSeconds}초`
  } else if (remainingSeconds < 3600) {
    const minutes = Math.ceil(remainingSeconds / 60)
    etaText = `약 ${minutes}분`
  } else {
    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.ceil((remainingSeconds % 3600) / 60)
    etaText = `약 ${hours}시간 ${minutes}분`
  }

  return {
    remainingSeconds,
    etaText,
    speed,
    percentComplete,
  }
}

/**
 * Format speed for display
 * @param speed - Items per second
 * @returns Formatted string (e.g., "1.5/초", "12.3/초")
 */
export function formatSpeed(speed: number): string {
  if (speed === 0) return "-"
  if (speed < 1) return `${speed.toFixed(2)}/초`
  return `${speed.toFixed(1)}/초`
}
