/**
 * Date utilities that handle timezone correctly.
 *
 * The bug we're fixing: `new Date('2026-04-20')` parses as midnight UTC,
 * which becomes 7-8 PM the previous day in Central Time. And
 * `date.toISOString().split('T')[0]` returns the UTC date, which can be
 * the next day if it's evening locally.
 *
 * Solution: always work with local time when dealing with date strings
 * (YYYY-MM-DD), and never use toISOString() to extract a date.
 */

/** Get today's date in local time as YYYY-MM-DD */
export function localToday() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Convert a Date object to YYYY-MM-DD in local time (NOT UTC) */
export function dateToLocalString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Add days to today and return YYYY-MM-DD in local time */
export function addDaysFromToday(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return dateToLocalString(d)
}

/** Parse YYYY-MM-DD as a Date in local time (midnight). Avoids UTC parsing. */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  // Append T00:00:00 so the browser parses as local time, not UTC
  return new Date(dateStr + 'T00:00:00')
}
