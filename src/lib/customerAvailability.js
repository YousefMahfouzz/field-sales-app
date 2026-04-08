/**
 * Smart customer availability — reads best_time, notes, next_visit_date, status
 *
 * STATUS MEANINGS (for reference):
 *  active      = Regular customer, visiting on schedule
 *  priority    = High-value, visit as often as possible
 *  follow_up   = Had a visit, needs a follow-up call/visit (not urgent)
 *  do_not_visit= Skip for now (e.g. not buying, wrong timing)
 *  avoid       = Bad experience, do not go back
 */

function fmt12(h) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = h % 12 === 0 ? 12 : h % 12
  return `${h12}${ampm}`
}

// Smart 24h normalization — no am/pm needed
function smartHour(h, hint) {
  if (hint === 'am') return h === 12 ? 0 : h
  if (hint === 'pm') return h === 12 ? 12 : h + 12
  if (h >= 7 && h <= 12) return h       // 7–12 = morning/noon
  if (h >= 1  && h <= 6)  return h + 12 // 1–6 with no context = afternoon
  return h
}

export function parseAvailability(best_time, notes) {
  const raw = ((best_time || '') + ' ' + (notes || '')).toLowerCase().trim()
  if (!raw || raw.length < 2) return null

  const now  = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const day  = now.getDay()

  // Time ranges: "10-3", "10am-3pm", "10:00-15:00", "10 to 3", "between 10 and 3"
  const rangeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–]|\bto\b|\band\b|\buntil\b)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  const rm = raw.match(rangeRe)
  if (rm) {
    let startH = smartHour(parseInt(rm[1]), rm[3])
    let endH   = smartHour(parseInt(rm[4]), rm[6])
    if (endH <= startH) endH += 12
    if (endH > 24) endH -= 12
    return { available: hour >= startH && hour < endH, range: `${fmt12(startH)}–${fmt12(endH)}` }
  }

  // "after X", "from X", "open at X", "starts at X"
  const afterRe = /(?:after|from|open\s*at|start(?:s|ing)?\s*(?:at)?|available\s*(?:at|from)?)\s*(\d{1,2})\s*(am|pm)?/
  const am2 = raw.match(afterRe)
  if (am2) {
    const h = smartHour(parseInt(am2[1]), am2[2])
    return { available: hour >= h, range: `after ${fmt12(h)}` }
  }

  // "until X", "before X", "closes at X", "by X"
  const untilRe = /(?:until|before|close[sd]?\s*(?:at)?|by)\s*(\d{1,2})\s*(am|pm)?/
  const um = raw.match(untilRe)
  if (um) {
    const h = smartHour(parseInt(um[1]), um[2])
    return { available: hour < h, range: `before ${fmt12(h)}` }
  }

  // Named periods
  if (/\bearly\s*morning|\bbefore\s*noon/i.test(raw))  return { available: hour >= 7  && hour < 10, range: '7–10am' }
  if (/\bmorning/i.test(raw))                             return { available: hour >= 8  && hour < 12, range: '8am–12pm' }
  if (/\blunch/i.test(raw))                               return { available: hour >= 11 && hour < 14, range: '11am–2pm' }
  if (/\bafternoon/i.test(raw))                           return { available: hour >= 12 && hour < 17, range: '12–5pm' }
  if (/\bevening/i.test(raw))                             return { available: hour >= 17 && hour < 20, range: '5–8pm' }
  if (/\bnight/i.test(raw))                               return { available: hour >= 19,              range: 'evenings' }
  if (/\ball\s*day|\banytime|\bany\s*time/i.test(raw)) return { available: true,                    range: 'anytime' }

  // Days of week
  const DAYS   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const DSHORT = ['sun','mon','tue','wed','thu','fri','sat']
  for (let i = 0; i < 7; i++) {
    if (raw.includes(DAYS[i]) || raw.includes(DSHORT[i]))
      return { available: day === i, range: DAYS[i][0].toUpperCase() + DAYS[i].slice(1) }
  }
  if (/weekday|week\s*day/i.test(raw)) return { available: day >= 1 && day <= 5, range: 'weekdays' }
  if (/weekend/i.test(raw))            return { available: day === 0 || day === 6, range: 'weekends' }

  return null
}

/**
 * COLOR PALETTE — all clearly distinct:
 *   🟡 Gold      #f59e0b  — Available right now (highest priority)
 *   🔵 Blue      #2563eb  — Due today
 *   🟢 Green     #16a34a  — Active (healthy, on schedule)
 *   🟠 Orange    #0d9488  — Overdue (needs attention)
 *   🟣 Purple    #7c3aed  — Follow-up (a conversation to resume, not urgent)
 *   ⭐ Amber     #d97706  — Priority customer
 *   ⚫ Slate     #94a3b8  — Do not visit (muted, low urgency)
 *   🔴 Red       #dc2626  — Avoid (danger)
 */
export function getCustomerColor(customer) {
  const today = new Date().toLocaleDateString('en-CA')
  const status = customer.status || 'active'
  const hour = new Date().getHours() + new Date().getMinutes() / 60
  const inGoldenWindow = hour >= 10 && hour < 15

  // Fixed statuses — always these colors regardless of timing
  if (status === 'avoid')
    return { color:'#dc2626', bgColor:'#fef2f2', label:'⛔ Avoid', priority:-1 }
  if (status === 'do_not_visit')
    return { color:'#94a3b8', bgColor:'#f1f5f9', label:'⚫ Do Not Visit', priority:0 }

  const avail     = parseAvailability(customer.best_time, customer.notes)
  const isNow     = avail?.available || (!avail && inGoldenWindow && status !== 'follow_up')
  const isOverdue = customer.next_visit_date && customer.next_visit_date < today
  const isToday   = customer.next_visit_date === today

  // 🌟 AVAILABLE NOW — gold, always beats everything else
  if (isNow) {
    const suffix = avail ? ` (${avail.range})` : ''
    if (status === 'priority')
      return { color:'#92400e', bgColor:'#fef3c7', label:`⭐ Priority — now${suffix}`, priority:10 }
    if (isOverdue)
      return { color:'#b45309', bgColor:'#fef3c7', label:`🌟 Available now — overdue${suffix}`, priority:9 }
    if (isToday)
      return { color:'#92400e', bgColor:'#fef3c7', label:`🌟 Available now — due today${suffix}`, priority:10 }
    return { color:'#d97706', bgColor:'#fef3c7', label:`🌟 Available now${suffix}`, priority:8 }
  }

  // Not available now but has timing
  if (avail && !avail.available) {
    if (isOverdue)
      return { color:'#0d9488', bgColor:'#f0fdfa', label:`🟠 Overdue · visits ${avail.range}`, priority:6 }
    return { color:'#94a3b8', bgColor:'#f8fafc', label:`🕐 Available ${avail.range}`, priority:3 }
  }

  // No timing info — use status + schedule
  if (isToday)   return { color:'#2563eb', bgColor:'#eff6ff', label:'📅 Due today',  priority:8 }
  if (isOverdue) return { color:'#0d9488', bgColor:'#f0fdfa', label:'🔷 Overdue',    priority:7 }

  if (status === 'priority')
    return { color:'#d97706', bgColor:'#fffbeb', label:'⭐ Priority', priority:6 }

  if (status === 'follow_up') {
    if (customer.next_visit_date) {
      const days = Math.ceil((new Date(customer.next_visit_date) - new Date()) / 86400000)
      if (days > 7)
        return { color:'#a78bfa', bgColor:'#f5f3ff', label:`🟣 Follow-up in ${days}d`, priority:1 }
      return { color:'#7c3aed', bgColor:'#ede9fe', label:`🟣 Follow-up in ${days}d`, priority:5 }
    }
    return { color:'#7c3aed', bgColor:'#ede9fe', label:'🟣 Follow-up', priority:4 }
  }

  return { color:'#16a34a', bgColor:'#f0fdf4', label:'🟢 Active', priority:4 }
}

export const SMART_FILTERS = [
  { id: 'all',            label: 'All' },
  { id: 'available_now',  label: '🌟 Available Now' },
  { id: 'due_today',      label: '📅 Due Today' },
  { id: 'overdue',        label: '🔷 Overdue' },
  { id: 'priority',       label: '⭐ Priority' },
  { id: 'hide_avoid',     label: 'Hide Avoid' },
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
      return customers // includes avoid on map
  }
}
