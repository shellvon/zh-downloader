import logger from '@/utils/logger'
import { STORAGE_KEYS } from './constants'
import { ConfigEvent } from './events'
import { ThemeUpdatedMessage } from '@/types'

export type Theme = 'light' | 'dark' | 'system'

const DEFAULT_THEME = 'system'

export const loadTheme = async (): Promise<Theme> => {
  const result = await chrome.storage.sync.get([STORAGE_KEYS.THEME])
  return (result[STORAGE_KEYS.THEME] as Theme) || DEFAULT_THEME
}

export const saveTheme = async (theme: Theme): Promise<void> => {
  await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme })

  // 通知所有页面主题已更新
  try {
    await chrome.runtime.sendMessage<ThemeUpdatedMessage>({
      action: ConfigEvent.THEME_UPDATED,
      theme,
    })
  } catch (error) {
    logger.warn('无法发送主题更新消息:', error)
  }
}

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

export const MESSAGE_EVENTS = {
  THEME_UPDATED: 'themeUpdated',
  CONFIG_UPDATED: 'configUpdated',
  // 可扩展更多事件
} as const
export type MessageEventType = (typeof MESSAGE_EVENTS)[keyof typeof MESSAGE_EVENTS]

export const broadcastThemeUpdate = async (theme: Theme) => {
  try {
    await chrome.runtime.sendMessage({ action: MESSAGE_EVENTS.THEME_UPDATED, theme })
  } catch (e) {
    // ...
  }
}

export const listenThemeUpdate = (cb: (theme: Theme) => void) => {
  const handler = (msg: any) => {
    if (msg.action === MESSAGE_EVENTS.THEME_UPDATED) {
      cb(msg.theme)
    }
  }
  chrome.runtime.onMessage.addListener(handler)
  return () => chrome.runtime.onMessage.removeListener(handler)
}
