import { useEffect, useState, useCallback, useRef } from 'react'
import { loadTheme, saveTheme, applyTheme, type Theme } from '@/utils/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const mediaQueryRef = useRef<MediaQueryList | null>(null)

  // 初始化加载 theme
  useEffect(() => {
    loadTheme().then((t) => {
      setTheme(t)
      applyTheme(t)
    })
  }, [])

  // 监听系统主题变化（仅 theme 为 system 时）
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQueryRef.current = mediaQuery

    const handleSystemThemeChange = () => {
      applyTheme('system')
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme])

  // theme 变化时自动应用
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // 切换主题
  const toggleTheme = useCallback(async () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
    await saveTheme(newTheme)
    setTheme(newTheme)
  }, [theme])

  return { theme, setTheme, toggleTheme }
}
