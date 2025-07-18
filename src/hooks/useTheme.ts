import { useEffect } from 'react'
import { loadTheme, applyTheme, listenThemeUpdate } from '@/utils/theme'

export const useTheme = () => {
  useEffect(() => {
    const initTheme = async () => {
      const savedTheme = await loadTheme()
      applyTheme(savedTheme)
    }
    initTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      loadTheme().then(applyTheme)
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    const off = listenThemeUpdate((theme) => {
      applyTheme(theme)
    })

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      off()
    }
  }, [])
}
