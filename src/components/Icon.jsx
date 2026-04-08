/**
 * Minimal clean icon set — no emojis
 * Usage: <Icon name="home" size={20} color="currentColor" />
 */

const ICONS = {
  // Navigation
  home: `<path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V9.5z" stroke-width="1.8" fill="none"/>`,
  users: `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-width="1.8" fill="none"/><circle cx="9" cy="7" r="4" stroke-width="1.8" fill="none"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-width="1.8" fill="none"/>`,
  map: `<polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" stroke-width="1.8" fill="none"/><line x1="8" y1="2" x2="8" y2="18" stroke-width="1.8"/><line x1="16" y1="6" x2="16" y2="22" stroke-width="1.8"/>`,
  package: `<path d="M12 2l9 4.5V17l-9 4.5L3 17V6.5L12 2z" stroke-width="1.8" fill="none"/><polyline points="3,6.5 12,11 21,6.5" stroke-width="1.8" fill="none"/><line x1="12" y1="11" x2="12" y2="21.5" stroke-width="1.8"/>`,
  orders: `<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="1.8" fill="none"/><polyline points="9,12 11,14 15,10" stroke-width="1.8" fill="none"/>`,
  settings: `<circle cx="12" cy="12" r="3" stroke-width="1.8" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke-width="1.8" fill="none"/>`,
  
  // Actions
  plus: `<line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/><line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>`,
  edit: `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.8" fill="none"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.8" fill="none"/>`,
  trash: `<polyline points="3,6 5,6 21,6" stroke-width="1.8" fill="none"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="1.8" fill="none"/>`,
  search: `<circle cx="11" cy="11" r="8" stroke-width="1.8" fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="1.8"/>`,
  filter: `<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke-width="1.8" fill="none"/>`,
  share: `<circle cx="18" cy="5" r="3" stroke-width="1.8" fill="none"/><circle cx="6" cy="12" r="3" stroke-width="1.8" fill="none"/><circle cx="18" cy="19" r="3" stroke-width="1.8" fill="none"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke-width="1.8"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke-width="1.8"/>`,
  copy: `<rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="1.8" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="1.8" fill="none"/>`,
  back: `<polyline points="15,18 9,12 15,6" stroke-width="1.8" fill="none"/>`,
  forward: `<polyline points="9,18 15,12 9,6" stroke-width="1.8" fill="none"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>`,
  check: `<polyline points="20,6 9,17 4,12" stroke-width="2.5" fill="none"/>`,
  
  // Status
  alert: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-width="1.8" fill="none"/><line x1="12" y1="9" x2="12" y2="13" stroke-width="1.8"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2"/>`,
  info: `<circle cx="12" cy="12" r="10" stroke-width="1.8" fill="none"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>`,
  star: `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke-width="1.8" fill="none"/>`,
  'star-filled': `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke-width="1.8" fill="currentColor"/>`,
  clock: `<circle cx="12" cy="12" r="10" stroke-width="1.8" fill="none"/><polyline points="12,6 12,12 16,14" stroke-width="1.8" fill="none"/>`,
  calendar: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="1.8" fill="none"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="1.8"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="1.8"/>`,
  'map-pin': `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke-width="1.8" fill="none"/><circle cx="12" cy="10" r="3" stroke-width="1.8" fill="none"/>`,
  phone: `<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l1.48-1.48a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 13.92v3z" stroke-width="1.8" fill="none"/>`,
  
  // Business
  'bar-chart': `<line x1="12" y1="20" x2="12" y2="10" stroke-width="2"/><line x1="18" y1="20" x2="18" y2="4" stroke-width="2"/><line x1="6" y1="20" x2="6" y2="16" stroke-width="2"/>`,
  'trending-up': `<polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke-width="1.8" fill="none"/><polyline points="17,6 23,6 23,12" stroke-width="1.8" fill="none"/>`,
  dollar: `<line x1="12" y1="1" x2="12" y2="23" stroke-width="1.8"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-width="1.8" fill="none"/>`,
  tag: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke-width="1.8" fill="none"/><line x1="7" y1="7" x2="7.01" y2="7" stroke-width="2"/>`,
  route: `<circle cx="6" cy="19" r="3" stroke-width="1.8" fill="none"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" stroke-width="1.8" fill="none"/><circle cx="18" cy="5" r="3" stroke-width="1.8" fill="none"/>`,
  truck: `<rect x="1" y="3" width="15" height="13" stroke-width="1.8" fill="none"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8" stroke-width="1.8" fill="none"/><circle cx="5.5" cy="18.5" r="2.5" stroke-width="1.8" fill="none"/><circle cx="18.5" cy="18.5" r="2.5" stroke-width="1.8" fill="none"/>`,
  home2: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-width="1.8" fill="none"/><polyline points="9,22 9,12 15,12 15,22" stroke-width="1.8" fill="none"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-width="1.8" fill="none"/>`,
  user: `<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke-width="1.8" fill="none"/><circle cx="12" cy="7" r="4" stroke-width="1.8" fill="none"/>`,
  image: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="1.8" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21,15 16,10 5,21" stroke-width="1.8" fill="none"/>`,
  archive: `<polyline points="21,8 21,21 3,21 3,8" stroke-width="1.8" fill="none"/><rect x="1" y="3" width="22" height="5" stroke-width="1.8" fill="none"/><line x1="10" y1="12" x2="14" y2="12" stroke-width="1.8"/>`,
  refresh: `<polyline points="23,4 23,11 16,11" stroke-width="1.8" fill="none"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 11" stroke-width="1.8" fill="none"/>`,
  list: `<line x1="8" y1="6" x2="21" y2="6" stroke-width="1.8"/><line x1="8" y1="12" x2="21" y2="12" stroke-width="1.8"/><line x1="8" y1="18" x2="21" y2="18" stroke-width="1.8"/><line x1="3" y1="6" x2="3.01" y2="6" stroke-width="2"/><line x1="3" y1="12" x2="3.01" y2="12" stroke-width="2"/><line x1="3" y1="18" x2="3.01" y2="18" stroke-width="2"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="3" stroke-width="1.8" fill="none"/>`,
  download: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke-width="1.8" fill="none"/><polyline points="7,10 12,15 17,10" stroke-width="1.8" fill="none"/><line x1="12" y1="15" x2="12" y2="3" stroke-width="1.8"/>`,
  upload: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke-width="1.8" fill="none"/><polyline points="17,8 12,3 7,8" stroke-width="1.8" fill="none"/><line x1="12" y1="3" x2="12" y2="15" stroke-width="1.8"/>`,
  mail: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke-width="1.8" fill="none"/><polyline points="22,6 12,13 2,6" stroke-width="1.8" fill="none"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-width="1.8" fill="none"/>`,
  'chevron-right': `<polyline points="9,18 15,12 9,6" stroke-width="1.8" fill="none"/>`,
  'chevron-down': `<polyline points="6,9 12,15 18,9" stroke-width="1.8" fill="none"/>`,
  grid: `<rect x="3" y="3" width="7" height="7" stroke-width="1.8" fill="none"/><rect x="14" y="3" width="7" height="7" stroke-width="1.8" fill="none"/><rect x="14" y="14" width="7" height="7" stroke-width="1.8" fill="none"/><rect x="3" y="14" width="7" height="7" stroke-width="1.8" fill="none"/>`,
  sparkles: `<path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3z" stroke-width="1.5" fill="none"/><path d="M19 17L19.75 19.25L22 20L19.75 20.75L19 23L18.25 20.75L16 20L18.25 19.25L19 17z" stroke-width="1.2" fill="none"/>`,
  zap: `<polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" stroke-width="1.8" fill="none"/>`,
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth, className = '', style = {} }) {
  const d = ICONS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  )
}
