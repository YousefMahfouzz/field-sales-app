import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext({
  darkMode: false,
  toggleDark: () => {},
})

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true' } catch { return false }
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
      localStorage.setItem('darkMode', String(darkMode))
    } catch {}
  }, [darkMode])

  const toggleDark = () => setDarkMode(v => !v)

  return (
    <SettingsContext.Provider value={{ darkMode, toggleDark }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
