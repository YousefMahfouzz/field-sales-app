/**
 * Smart customer availability detection
 * Reads best_time, notes, visit_frequency_days, status, next_visit_date
 * Returns a color and availability status for use on the map and customer list
 */

const HOUR = new Date().getHours() + new Date().getMinutes() / 60

/**
 * Parse a best_time string and return whether they're available NOW
 * Examples: "10am-3pm", "mornings", "Tuesdays after 10am", "weekdays", "morning"
 */
export function parseAvailability(best_time, notes) {
  const text = ((best_time || '') + ' ' + (notes || '')).toLowerCase()
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const day = now.getDay() // 0=Sun, 1=Mon ... 6=Sat

  // Parse time ranges like "10am-3pm", "10-3", "10:00-15:00"
  const rangeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1])
    let endH = parseInt(rangeMatch[4])
    const startAmPm = rangeMatch[3]
    const endAmPm = rangeMatch[6]

    // Normalize to 24h
    if (startAmPm === 'pm' && startH < 12) startH += 12
    if (startAmPm === 'am' && startH === 12) startH = 0
    if (endAmPm === 'pm' && endH < 12) endH += 12
    if (endAmPm === 'am' && endH === 12) endH = 0
    // Infer: if end < start or end <= 8, it's pm
    if (!endAmPm && endH < startH && endH <= 8) endH += 12
    if (!startAmPm && !endAmPm && startH > endH) endH += 12

    if (hour >= startH && hour < endH) return { available: true, range: `${fmt12(startH)}–${fmt12(endH)}` }
    return { available: false, range: `${fmt12(startH)}–${fmt12(endH)}` }
  }

  // Named time periods
  if (/\bmorning/i.test(text)) {
    if (hour >= 8 && hour < 12) return { available: true, range: 'mornings' }
    return { available: false, range: 'mornings' }
  }
  if (/\bafternoon/i.test(text)) {
    if (hour >= 12 && hour < 17) return { available: true, range: 'afternoons' }
    return { available: false, range: 'afternoons' }
  }
  if (/\bevening/i.test(text)) {
    if (hour >= 17 && hour < 20) return { available: true, range: 'evenings' }
    return { available: false, range: 'evenings' }
  }

  // Day restrictions
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const DAY_SHORT = ['sun','mon','tue','wed','thu','fri','sat']
  for (let i = 0; i < 7; i++) {
    if (text.includes(DAYS[i]) || text.includes(DAY_SHORT[i])) {
      if (day === i) return { available: true, range: DAYS[i] }
      return { available: false, range: DAYS[i] }
    }
  }
  if (/weekday/.test(text)) {
    if (day >= 1 && day <= 5) return { available: true, range: 'weekdays' }
    return { available: false, range: 'weekdays' }
  }
  if (/weekend/.test(text)) {
    if (day === 0 || day === 6) return { available: true, range: 'weekends' }
    return { available: false, range: 'weekends' }
  }

  return null // no timing info — can't determine
}

function fmt12(h) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${ampm}`
}

/**
 * Get the display color for a customer marker/card
 * Returns: { color, bgColor, label, priority }
 */
export function getCustomerColor(customer) {
  const today = new Date().toLocaleDateString('en-CA')
  const status = customer.status || 'active'

  // Avoid = always red/hidden
  if (status === 'avoid') return { color: '#dc2626', bgColor: '#fef2f2', label: '⛔ Avoid', priority: -1 }

  // Do not visit = gray
  if (status === 'do_not_visit') return { color: '#6b7280', bgColor: '#f3f4f6', label: '⚫ Do Not Visit', priority: 0 }

  // Check smart availability (best_time + notes)
  const avail = parseAvailability(customer.best_time, customer.notes)

  // Priority customer available NOW = bright gold star
  if (status === 'priority' && avail?.available) {
    return { color: '#b45309', bgColor: '#fef3c7', label: `⭐ Available ${avail.range}`, priority: 10 }
  }

  // ANY customer available NOW within 10am–3pm window
  const hour = new Date().getHours()
  const inGoldenWindow = hour >= 10 && hour < 15
  if (avail?.available || (inGoldenWindow && !avail)) {
    return { color: '#d97706', bgColor: '#fef3c7', label: `🌟 Available now${avail ? ` (${avail.range})` : ''}`, priority: 9 }
  }

  // Overdue visit
  if (customer.next_visit_date && customer.next_visit_date < today) {
    return { color: '#dc2626', bgColor: '#fef2f2', label: '🔴 Overdue', priority: 7 }
  }

  // Due today
  if (customer.next_visit_date === today) {
    return { color: '#2563eb', bgColor: '#eff6ff', label: '📅 Due today', priority: 8 }
  }

  // Priority (no timing info)
  if (status === 'priority') {
    return { color: '#d97706', bgColor: '#fffbeb', label: '🟡 Priority', priority: 6 }
  }

  // Follow-up due within 1 week
  if (status === 'follow_up' && customer.next_visit_date) {
    const daysUntil = Math.ceil((new Date(customer.next_visit_date) - new Date()) / 86400000)
    if (daysUntil <= 7) return { color: '#0891b2', bgColor: '#ecfeff', label: `🔵 Follow-up in ${daysUntil}d`, priority: 5 }
    return { color: '#94a3b8', bgColor: '#f1f5f9', label: `⚪ Follow-up later`, priority: 2 }
  }

  // Active
  return { color: '#16a34a', bgColor: '#f0fdf4', label: '🟢 Active', priority: 4 }
}

/**
 * Smart filter presets
 */
export const SMART_FILTERS = [
  { id: 'all', label: '🗺️ All', desc: 'Show everyone' },
  { id: 'available_now', label: '🌟 Available Now', desc: '10am–3pm or matching schedule' },
  { id: 'due_today', label: '📅 Due Today', desc: "On today's visit list" },
  { id: 'overdue', label: '🔴 Overdue', desc: 'Past their scheduled visit date' },
  { id: 'priority', label: '⭐ Priority', desc: 'High-value customers' },
  { id: 'hide_avoid', label: '✅ Hide Avoid', desc: 'Hide avoid + do-not-visit' },
]

export function applySmartFilter(customers, filterId) {
  const today = new Date().toLocaleDateString('en-CA')
  const hour = new Date().getHours()
  const inGoldenWindow = hour >= 10 && hour < 15

  switch (filterId) {
    case 'available_now':
      return customers.filter(c => {
        if (c.status === 'avoid' || c.status === 'do_not_visit') return false
        const avail = parseAvailability(c.best_time, c.notes)
        return avail?.available || (inGoldenWindow && !avail && c.status !== 'follow_up')
      })
    case 'due_today':
      return customers.filter(c => c.next_visit_date === today && c.status !== 'avoid')
    case 'overdue':
      return customers.filter(c => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid')
    case 'priority':
      return customers.filter(c => c.status === 'priority')
    case 'hide_avoid':
      return customers.filter(c => c.status !== 'avoid' && c.status !== 'do_not_visit')
    default:
      return customers
  }
}
