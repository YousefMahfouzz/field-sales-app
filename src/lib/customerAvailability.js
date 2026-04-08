/**
 * Smart customer availability — reads best_time, notes, next_visit_date, status
 */

function fmt12(h) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${ampm}`
}

/**
 * Normalize a raw hour number (no am/pm context) smartly.
 * Business hours: 7–7 means 7am–7pm.
 * If the hour is 1–6 with no context, assume PM (1=13, 2=14...6=18).
 * 7–12 = AM (morning open). 13+ = already 24h.
 */
function smartHour(h, hint) {
  if (hint === 'am') return h === 12 ? 0 : h
  if (hint === 'pm') return h === 12 ? 12 : h + 12
  // No hint — use business logic
  if (h >= 7 && h <= 12) return h      // 7am–12pm = morning/noon
  if (h >= 1 && h <= 6) return h + 12  // 1–6 = 1pm–6pm (typical business close)
  return h
}

export function parseAvailability(best_time, notes) {
  const raw = ((best_time || '') + ' ' + (notes || '')).toLowerCase().trim()
  if (!raw || raw.length < 2) return null

  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const day  = now.getDay() // 0=Sun

  // ── Time ranges: "10-3", "10am-3pm", "10:00-15:00", "10 to 3", "between 10 and 3" ──
  const rangeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–to]|and|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  const rm = raw.match(rangeRe)
  if (rm) {
    let startH = parseInt(rm[1])
    let endH   = parseInt(rm[4])
    const sm   = rm[3], em = rm[6]
    startH = smartHour(startH, sm)
    endH   = smartHour(endH, em)
    // If end somehow <= start after normalization, end was PM
    if (endH <= startH && !em) endH += 12
    if (endH > 24) endH -= 12 // safety
    const available = hour >= startH && hour < endH
    return { available, range: `${fmt12(startH)}–${fmt12(endH)}` }
  }

  // ── Single time: "after 10", "from 9", "open at 2" ──
  const singleRe = /(?:after|from|open\s*at|starting|starts?)\s*(\d{1,2})\s*(am|pm)?/
  const sm2 = raw.match(singleRe)
  if (sm2) {
    let h = smartHour(parseInt(sm2[1]), sm2[2])
    const available = hour >= h
    return { available, range: `after ${fmt12(h)}` }
  }

  // ── "until X" / "before X" / "closes at X" ──
  const untilRe = /(?:until|before|closes?\s*at|by)\s*(\d{1,2})\s*(am|pm)?/
  const um = raw.match(untilRe)
  if (um) {
    let h = smartHour(parseInt(um[1]), um[2])
    const available = hour < h
    return { available, range: `before ${fmt12(h)}` }
  }

  // ── Named periods ──
  if (/\bearly\s*morning|\bbefore\s*noon/i.test(raw)) {
    return { available: hour >= 7 && hour < 10, range: '7–10am' }
  }
  if (/\bmorning/i.test(raw)) {
    return { available: hour >= 8 && hour < 12, range: '8am–12pm' }
  }
  if (/\blunch/i.test(raw)) {
    return { available: hour >= 11 && hour < 14, range: '11am–2pm' }
  }
  if (/\bafternoon/i.test(raw)) {
    return { available: hour >= 12 && hour < 17, range: '12–5pm' }
  }
  if (/\bevening/i.test(raw)) {
    return { available: hour >= 17 && hour < 20, range: '5–8pm' }
  }
  if (/\bnight/i.test(raw)) {
    return { available: hour >= 19, range: 'evenings' }
  }
  if (/\ball\s*day|\banytime|\bany\s*time/i.test(raw)) {
    return { available: true, range: 'anytime' }
  }

  // ── Day of week ──
  const DAYS   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const DSHORT = ['sun','mon','tue','wed','thu','fri','sat']
  for (let i = 0; i < 7; i++) {
    if (raw.includes(DAYS[i]) || raw.includes(DSHORT[i])) {
      return { available: day === i, range: DAYS[i].charAt(0).toUpperCase() + DAYS[i].slice(1) }
    }
  }
  if (/weekday|week\s*day/i.test(raw)) {
    return { available: day >= 1 && day <= 5, range: 'weekdays' }
  }
  if (/weekend/i.test(raw)) {
    return { available: day === 0 || day === 6, range: 'weekends' }
  }

  return null
}

export function getCustomerColor(customer) {
  const today = new Date().toLocaleDateString('en-CA')
  const status = customer.status || 'active'
  const hour = new Date().getHours() + new Date().getMinutes() / 60
  const inGoldenWindow = hour >= 10 && hour < 15 // 10am–3pm default window

  if (status === 'avoid')       return { color:'#dc2626', bgColor:'#fef2f2', label:'⛔ Avoid',         priority:-1, dot:'#dc2626' }
  if (status === 'do_not_visit') return { color:'#9ca3af', bgColor:'#f3f4f6', label:'⚫ Do Not Visit',   priority:0,  dot:'#9ca3af' }

  const avail = parseAvailability(customer.best_time, customer.notes)
  const isAvailableNow = avail?.available || (!avail && inGoldenWindow && status !== 'follow_up')
  const isOverdue      = customer.next_visit_date && customer.next_visit_date < today
  const isDueToday     = customer.next_visit_date === today

  // Available NOW (gold/amber) — highest priority for visibility
  if (isAvailableNow) {
    if (status === 'priority')
      return { color:'#92400e', bgColor:'#fef3c7', label:`⭐ Priority — available${avail ? ` (${avail.range})` : ''}`, priority:10, dot:'#f59e0b' }
    if (isOverdue)
      return { color:'#b45309', bgColor:'#fef3c7', label:`🌟 Available now — overdue${avail ? ` (${avail.range})` : ''}`, priority:9, dot:'#f59e0b' }
    if (isDueToday)
      return { color:'#1d4ed8', bgColor:'#dbeafe', label:`🌟 Available now — due today${avail ? ` (${avail.range})` : ''}`, priority:10, dot:'#f59e0b' }
    return { color:'#d97706', bgColor:'#fef3c7', label:`🌟 Available now${avail ? ` (${avail.range})` : ''}`, priority:8, dot:'#f59e0b' }
  }

  // Not available now but has timing info
  if (avail && !avail.available) {
    if (isOverdue)
      return { color:'#dc2626', bgColor:'#fef2f2', label:`🔴 Overdue · available ${avail.range}`, priority:6, dot:'#dc2626' }
    return { color:'#9ca3af', bgColor:'#f9fafb', label:`🕐 Available ${avail.range}`, priority:3, dot:'#9ca3af' }
  }

  if (isDueToday) return { color:'#2563eb', bgColor:'#eff6ff', label:'📅 Due today',   priority:8, dot:'#2563eb' }
  if (isOverdue)  return { color:'#dc2626', bgColor:'#fef2f2', label:'🔴 Overdue',     priority:7, dot:'#dc2626' }
  if (status === 'priority') return { color:'#d97706', bgColor:'#fffbeb', label:'⭐ Priority', priority:6, dot:'#f59e0b' }

  // Follow-up: dim if more than 1 week away
  if (status === 'follow_up' && customer.next_visit_date) {
    const days = Math.ceil((new Date(customer.next_visit_date) - new Date()) / 86400000)
    if (days > 7) return { color:'#cbd5e1', bgColor:'#f8fafc', label:`⚪ Follow-up in ${days}d`, priority:1, dot:'#cbd5e1' }
    return { color:'#0891b2', bgColor:'#ecfeff', label:`🔵 Follow-up in ${days}d`, priority:5, dot:'#0891b2' }
  }

  return { color:'#16a34a', bgColor:'#f0fdf4', label:'🟢 Active', priority:4, dot:'#16a34a' }
}

export const SMART_FILTERS = [
  { id: 'all',           label: '🗺️ All',            desc: 'Show everyone' },
  { id: 'available_now', label: '🌟 Available Now',   desc: 'Can visit right now' },
  { id: 'due_today',     label: '📅 Due Today',       desc: "On today's visit list" },
  { id: 'overdue',       label: '🔴 Overdue',         desc: 'Past scheduled date' },
  { id: 'priority',      label: '⭐ Priority',        desc: 'High-value customers' },
  { id: 'hide_avoid',    label: '✅ Hide Avoid',      desc: 'Clean view' },
]

export function applySmartFilter(customers, filterId) {
  const today = new Date().toLocaleDateString('en-CA')
  const hour  = new Date().getHours() + new Date().getMinutes() / 60
  const inGoldenWindow = hour >= 10 && hour < 15

  switch (filterId) {
    case 'available_now':
      return customers.filter(c => {
        if (c.status === 'avoid' || c.status === 'do_not_visit') return false
        const avail = parseAvailability(c.best_time, c.notes)
        // Include even if overdue — if timing is right they're visitable
        return avail?.available || (!avail && inGoldenWindow && c.status !== 'follow_up')
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
