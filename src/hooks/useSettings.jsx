import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

  // Apply dark mode class + RTL direction to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    localStorage.setItem('lang', lang)
  }, [lang])

  const toggleDark = () => setDarkMode(v => !v)
  const toggleLang = () => setLang(v => v === 'en' ? 'ar' : 'en')

  return (
    <SettingsContext.Provider value={{ darkMode, lang, toggleDark, toggleLang, isArabic: lang === 'ar' }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
