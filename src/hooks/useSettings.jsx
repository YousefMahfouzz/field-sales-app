import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext({
  darkMode: false,
  lang: 'en',
  isArabic: false,
  toggleDark: () => {},
  toggleLang: () => {},
})

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true' } catch { return false }
  })
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') || 'en' } catch { return 'en' }
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
      localStorage.setItem('darkMode', String(darkMode))
    } catch {}
  }, [darkMode])

  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', lang)
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
      localStorage.setItem('lang', lang)
    } catch {}
  }, [lang])

  const toggleDark = () => setDarkMode(v => !v)
  const toggleLang = () => setLang(v => v === 'en' ? 'ar' : 'en')
  const isArabic = lang === 'ar'

  return (
    <SettingsContext.Provider value={{ darkMode, lang, isArabic, toggleDark, toggleLang }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
