/**
 * Build a Google Calendar event URL for a customer visit reminder.
 * Opens Google Calendar with the event pre-filled – user just taps Save.
 * Notifications come automatically from Google Calendar settings.
 *
 * @param {string} date - YYYY-MM-DD format
 * @param {string} customerName - business or full name
 * @param {object} opts - { notes, address, area, phone }
 * @returns {string} Google Calendar URL
 */
export function buildCalendarUrl(date, customerName, opts = {}) {
  const { notes, address, area, phone } = opts

  const title = `Visit: ${customerName}`

  // Description with all useful info
  const descParts = [`Follow-up visit for ${customerName}`]
  if (phone) descParts.push(`Phone: ${phone}`)
  if (address) descParts.push(`Address: ${address}`)
  if (area) descParts.push(`Area: ${area}`)
  if (notes) descParts.push(`Notes: ${notes}`)
  descParts.push('', '– Kanz Supply')
  const description = descParts.join('\n')

  // Google Calendar uses this date format: YYYYMMDD for all-day events
  // Or YYYYMMDDTHHMMSS for timed events
  // We'll create a timed event at 7:00 AM CT, lasting 1 hour
  const dateClean = date.replace(/-/g, '')

  const startTime = `${dateClean}T070000`
  const endTime = `${dateClean}T080000`

  const location = address || area || ''

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startTime}/${endTime}`,
    details: description,
    location: location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
