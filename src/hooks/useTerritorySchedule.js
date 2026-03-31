import { useState, useEffect } from 'react'

const STORAGE_KEY = 'territory_schedule'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function useTerritorySchedule() {
  const [schedule, setSchedule] = useState({}) // { 'Block Name': 'Monday' }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSchedule(JSON.parse(saved))
    } catch { }
  }, [])

  const assignDay = (block, day) => {
    setSchedule(prev => {
      const next = { ...prev }
      if (day === null) {
        delete next[block]
      } else {
        next[block] = day
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const getBlocksForDay = (day) =>
    Object.entries(schedule)
      .filter(([, d]) => d === day)
      .map(([block]) => block)

  const getTodayBlocks = () => {
    const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
    return getBlocksForDay(today)
  }

  return { schedule, assignDay, getBlocksForDay, getTodayBlocks, DAYS }
}
