import logger from '@/utils/logger'
import { STORAGE_KEYS } from './constants'
import { ConfigEvent } from './events'
import { ThemeUpdatedMessage } from '@/types'

export type Theme = 'light' | 'dark' | 'system'
const DEFAULT_THEME: Theme = 'system'

/**
 * 加载当前主题（从 storage）
 */
export const loadTheme = async (): Promise<Theme> => {
  const result = await chrome.storage.sync.get([STORAGE_KEYS.THEME])
  return (result[STORAGE_KEYS.THEME] as Theme) || DEFAULT_THEME
}

/**
 * 保存主题到 storage，并广播主题变更
 */
export const saveTheme = async (theme: Theme): Promise<void> => {
  await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme })
  await broadcastThemeUpdate(theme)
}

/**
 * 应用主题到页面（加/去 dark class）
 */
export const applyTheme = (theme: Theme, target?: HTMLElement) => {
  const root = target || document.documentElement
  if (theme === 'system') {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  } else if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * 广播主题变更消息（所有页面都能收到）
 */
export const broadcastThemeUpdate = async (theme: Theme) => {
  try {
    await chrome.runtime.sendMessage<ThemeUpdatedMessage>({
      action: ConfigEvent.THEME_UPDATED,
      theme,
    })
  } catch (error) {
    logger.warn('无法发送主题更新消息:', error)
  }
}
