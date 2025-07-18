import { loadTheme, saveTheme, Theme } from '@/utils/theme'
import { loadConfig } from '@/utils/config'
import logger from '@/utils/logger'
import {
  ConfigEvent,
  SelectorEvent,
  DownloadEvent,
  ContentEvent,
  PageEvent,
  on,
} from '@/utils/events'

const CONTEXT_MENU_ID_START_SELECTOR = 'startUnifiedElementSelector'

// 类型定义
interface MessageRequest {
  action: string
  url?: string
  filename?: string
  theme?: string
  selector?: string
}

interface DownloadRequest {
  url: string
  filename: string
}

interface ThemeRequest {
  theme?: Theme
}

interface HighlightRequest {
  selector?: string
}

/**
 * 检查标签页是否有效（可以接收消息）
 */
const isValidTab = (tab: chrome.tabs.Tab): boolean => {
  return !!(tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:'))
}

/**
 * 向所有有效标签页发送消息
 */
const sendMessageToAllTabs = async (message: any, errorMessage: string): Promise<void> => {
  try {
    const tabs = await chrome.tabs.query({})
    const promises = tabs.filter(isValidTab).map((tab) =>
      chrome.tabs.sendMessage(tab.id!, message).catch(() => {
        // 忽略错误，可能内容脚本未加载
      }),
    )
    await Promise.all(promises)
    logger.info('消息已转发给所有内容脚本')
  } catch (error) {
    logger.error(errorMessage, error)
    throw error
  }
}

/**
 * Fired when one of the following events occurs:
 *  - the extension is first installed
 *  - the extension is updated to a new version
 *  - Chrome is updated to a new version.
 *
 * see: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
 */
const handleExtensionInstalled = async (
  details: chrome.runtime.InstalledDetails,
): Promise<void> => {
  logger.info(`通用视频下载器已安装: ${details.reason}`)
  const currentTheme = await loadTheme()
  if (!currentTheme) {
    await saveTheme('system') // 默认主题为系统
  }
  await updateContextMenuVisibility()
}

/**
 * 处理配置更新消息
 */
const handleConfigUpdated = (): void => {
  updateContextMenuVisibility()
}

/**
 * 处理下载开始消息
 */
const handleDownloadStart = (
  request: DownloadRequest,
  sendResponse: (response?: any) => void,
): void => {
  if (!request.url || !request.filename) {
    sendResponse({ success: false, error: '缺少必要的下载参数' })
    return
  }

  chrome.downloads
    .download({
      url: request.url,
      filename: request.filename,
      saveAs: false, // 直接下载到默认目录
    })
    .then((downloadId) => {
      logger.info(`开始下载: ${request.filename} (ID: ${downloadId})`)
      sendResponse({ success: true, downloadId })
    })
    .catch((error) => {
      logger.error('下载失败:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '下载失败',
      })
    })
}

/**
 * 处理主题更新消息
 */
const handleThemeUpdated = (
  request: ThemeRequest,
  sendResponse: (response?: any) => void,
): void => {
  sendMessageToAllTabs(
    {
      action: ContentEvent.THEME_UPDATED,
      theme: request.theme,
    },
    '转发主题更新消息失败',
  )
    .then(() => {
      sendResponse({ success: true })
    })
    .catch(() => {
      sendResponse({ success: false, error: '转发主题更新失败' })
    })
}

/**
 * 处理重新加载内容脚本消息
 */
const handleReloadContentScript = (sendResponse: (response?: any) => void): void => {
  sendMessageToAllTabs(
    {
      action: ContentEvent.RELOAD,
    },
    '转发重新加载消息失败',
  )
    .then(() => {
      sendResponse({ success: true })
    })
    .catch(() => {
      sendResponse({ success: false, error: '转发重新加载失败' })
    })
}

/**
 * 处理高亮元素消息
 */
const handleHighlightElement = (
  request: HighlightRequest,
  sendResponse: (response?: any) => void,
): void => {
  chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      const tab = tabs[0]
      if (isValidTab(tab)) {
        return chrome.tabs
          .sendMessage(tab.id!, {
            action: SelectorEvent.HIGHLIGHT,
            selector: request.selector,
          })
          .then(() => {
            logger.info('高亮元素消息已转发给当前标签页')
            sendResponse({ success: true })
          })
      } else {
        sendResponse({ success: false, error: '无法找到有效的活动标签页' })
        return Promise.resolve()
      }
    })
    .catch((error) => {
      logger.error('转发高亮元素消息失败:', error)
      sendResponse({ success: false, error: '转发高亮元素失败' })
    })
}

/**
 * 处理打开选项页面消息
 */
const handleOpenOptionsPage = (sendResponse: (response?: any) => void): void => {
  try {
    chrome.runtime.openOptionsPage()
    logger.info('已打开选项页面')
    sendResponse({ success: true })
  } catch (error) {
    logger.error('打开选项页面失败:', error)
    sendResponse({ success: false, error: '打开选项页面失败' })
  }
}

/**
 * 处理 ping 消息
 */
const handlePing = (sendResponse: (response?: any) => void): void => {
  sendResponse({ success: true, message: 'pong' })
}

/**
 * 处理来自内容脚本的消息
 *
 * Fired when a message is sent from either an extension process (by runtime.sendMessage) or a content script (by tabs.sendMessage).
 *
 * see: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
 */
const handleMessage = (
  request: MessageRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): boolean => {
  logger.info('收到消息:', request.action)

  switch (request.action) {
    case ConfigEvent.UPDATED:
      handleConfigUpdated()
      return false

    case DownloadEvent.START:
      handleDownloadStart(request as DownloadRequest, sendResponse)
      return true

    case ContentEvent.THEME_UPDATED:
      handleThemeUpdated(request as ThemeRequest, sendResponse)
      return true

    case ContentEvent.RELOAD:
      handleReloadContentScript(sendResponse)
      return true

    case SelectorEvent.HIGHLIGHT:
      handleHighlightElement(request as HighlightRequest, sendResponse)
      return true

    case PageEvent.OPEN_OPTIONS:
      handleOpenOptionsPage(sendResponse)
      return false

    case ContentEvent.PING:
      handlePing(sendResponse)
      return false

    default:
      logger.warn('未知消息类型:', request.action)
      return false
  }
}

/**
 * 处理右键菜单点击事件
 *
 * Fired when the user clicks a context menu item.
 *
 * see: https://developer.chrome.com/docs/extensions/reference/contextMenus/#event-onClicked
 */
const handleContextMenuClicked = async (
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> => {
  if (!tab?.id) return
  if (info.menuItemId !== CONTEXT_MENU_ID_START_SELECTOR) return

  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: SelectorEvent.START,
    })
    logger.info(`已发送 'startElementSelector' 消息 (通过右键菜单)。`)
  } catch (error) {
    logger.error('右键菜单启动元素选择器失败，内容脚本可能未准备好或发生错误:', error)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '操作失败',
      message: '无法启动元素选择器，请尝试刷新页面后重试。',
    })
  }
}

/**
 * 处理下载状态变化事件
 *
 * Fired when the download state changes.
 *
 * see: https://developer.chrome.com/docs/extensions/reference/downloads/#event-onChanged
 */
const handleDownloadChanged = async (downloadDelta: chrome.downloads.DownloadDelta) => {
  const { id, state } = downloadDelta
  if (!id) return

  const status = state?.current
  if (!status) return

  switch (status) {
    case 'complete':
      await handleDownloadComplete(id)
      break
    case 'interrupted':
      logger.error(`Download ${id} interrupted: ${downloadDelta.error?.current}`)
      break
    case 'in_progress':
      await handleDownloadProgress(id, downloadDelta)
      break
    default:
      logger.debug(`Download ${id} status changed to: ${status}`)
  }
}

/**
 * 处理下载完成
 */
const handleDownloadComplete = async (downloadId: number) => {
  logger.info(`Download ${downloadId} completed successfully`)

  // 通知历史页面
  chrome.runtime
    .sendMessage({
      action: DownloadEvent.COMPLETE,
      downloadId,
    })
    .catch(() => {
      // 忽略错误，可能没有历史页面在监听
    })
}

/**
 * 处理下载进度
 */
const handleDownloadProgress = async (
  downloadId: number,
  downloadDelta: chrome.downloads.DownloadDelta,
) => {
  try {
    const downloads = await chrome.downloads.search({ id: downloadId })
    const download = downloads[0]

    if (
      download &&
      download.totalBytes &&
      download.totalBytes > 0 &&
      download.bytesReceived !== undefined
    ) {
      const progress = Math.round((download.bytesReceived / download.totalBytes) * 100)

      logger.info(`Download ${downloadId} progress: ${progress}%`)

      // 通知历史页面更新进度
      chrome.runtime
        .sendMessage({
          action: DownloadEvent.PROGRESS,
          downloadId,
          progress,
          filename: download.filename,
          bytesReceived: download.bytesReceived,
          totalBytes: download.totalBytes,
        })
        .catch(() => {
          // 忽略错误，可能没有历史页面在监听
        })
    }
  } catch (error) {
    logger.error('Error handling download progress:', error)
  }
}

/**
 * 处理下载创建事件，初始化进度跟踪
 *
 * Fired when a download is created.
 *
 * see: https://developer.chrome.com/docs/extensions/reference/downloads/#event-onCreated
 */
const handleDownloadCreated = (downloadItem: chrome.downloads.DownloadItem): void => {
  logger.info('Download created:', downloadItem)

  // 通知历史页面有新下载开始
  chrome.runtime
    .sendMessage({
      action: DownloadEvent.CREATED,
      downloadId: downloadItem.id,
      filename: downloadItem.filename,
      url: downloadItem.url,
      totalBytes: downloadItem.totalBytes,
    })
    .catch(() => {
      // 忽略错误，可能没有历史页面在监听
    })
}

/**
 * 更新右键菜单可见性
 */
async function updateContextMenuVisibility(): Promise<void> {
  const config = await loadConfig()
  const advancedModeEnabled = config.advancedModeEnabled
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      logger.warn('Error removing context menus:', chrome.runtime.lastError.message)
    }
    if (advancedModeEnabled) {
      chrome.contextMenus.create({
        id: CONTEXT_MENU_ID_START_SELECTOR,
        title: '启动智能元素选择器',
        contexts: ['page', 'video', 'selection', 'image'],
      })
      logger.info('右键菜单已创建 (高级模式 - 统一选择器)。')
    } else {
      logger.info('右键菜单已移除 (非高级模式)。')
    }
  })
}

/**
 * 统一注册 background 所有事件
 */
export function registerBackgroundEvents() {
  on(chrome.runtime.onInstalled, handleExtensionInstalled)
  on(chrome.runtime.onMessage, handleMessage)
  on(chrome.contextMenus.onClicked, handleContextMenuClicked)
  on(chrome.downloads.onChanged, handleDownloadChanged)
  on(chrome.downloads.onCreated, handleDownloadCreated)
}

// 立即注册（如需按需注册可导出 registerBackgroundEvents 并在入口调用）
registerBackgroundEvents()
