import { loadTheme, saveTheme } from '@/utils/theme' // 导入主题工具
import { loadConfig } from '@/utils/config' // 导入配置工具
import logger from '@/utils/logger'
import { ConfigEvent, SelectorEvent, DownloadEvent, ContentEvent, PageEvent } from '@/utils/events'

chrome.runtime.onInstalled.addListener(async () => {
  logger.info('通用视频下载器已安装')

  // 检查并设置默认主题
  const currentTheme = await loadTheme()
  if (!currentTheme) {
    await saveTheme('system') // 默认主题为系统
  }

  // 初始化右键菜单
  await updateContextMenuVisibility()
})

// 监听配置更新，以更新右键菜单可见性
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === ConfigEvent.UPDATED) {
    updateContextMenuVisibility()
    sendResponse({ success: true })
  }
  return true // Keep message channel open for async response
})

// 更新右键菜单可见性的函数
async function updateContextMenuVisibility() {
  const config = await loadConfig()
  const advancedModeEnabled = config.advancedModeEnabled

  // 移除旧的菜单项
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      logger.warn('Error removing context menus:', chrome.runtime.lastError.message)
    }
    // 只有在高级模式开启时才创建统一选择器菜单项
    if (advancedModeEnabled) {
      chrome.contextMenus.create({
        id: 'startUnifiedElementSelector',
        title: '启动智能元素选择器',
        contexts: ['page', 'video', 'selection', 'image'], // 可以在页面、视频、选中文本、图片上右键
      })
      logger.info('右键菜单已创建 (高级模式 - 统一选择器)。')
    } else {
      logger.info('右键菜单已移除 (非高级模式)。')
    }
  })
}

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.id) {
    if (info.menuItemId === 'startUnifiedElementSelector') {
      try {
        // 尝试向内容脚本发送消息，指示启动统一元素选择器
        await chrome.tabs.sendMessage(tab.id, {
          action: SelectorEvent.START,
        })
        logger.info(`已发送 'startElementSelector' 消息 (通过右键菜单)。`)
      } catch (error) {
        logger.error('右键菜单启动元素选择器失败，内容脚本可能未准备好或发生错误:', error)
        // 可以向用户发送通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: '操作失败',
          message: '无法启动元素选择器，请尝试刷新页面后重试。',
        })
      }
    }
  }
})

// 存储下载进度信息
const downloadProgress = new Map<
  number,
  { progress: number; filename: string; totalBytes: number }
>()

// 监听下载状态变化
chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  logger.info('Download changed:', downloadDelta)

  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    // 下载完成，清理进度信息
    downloadProgress.delete(downloadDelta.id)
    logger.info(`Download ${downloadDelta.id} completed`)

    // 通知历史页面下载完成
    chrome.runtime
      .sendMessage({
        action: DownloadEvent.COMPLETE,
        downloadId: downloadDelta.id,
      })
      .catch(() => {
        // 忽略错误，可能没有历史页面在监听
      })
  } else {
    // 获取完整的下载信息来计算进度
    try {
      const downloads = await chrome.downloads.search({ id: downloadDelta.id })
      if (downloads.length > 0) {
        const download = downloads[0]
        logger.info('Download info:', {
          id: download.id,
          bytesReceived: download.bytesReceived,
          totalBytes: download.totalBytes,
          state: download.state,
        })

        if (
          download.totalBytes &&
          download.totalBytes > 0 &&
          download.bytesReceived !== undefined
        ) {
          const progress = Math.round((download.bytesReceived / download.totalBytes) * 100)

          // 更新进度信息
          downloadProgress.set(downloadDelta.id, {
            progress,
            filename: download.filename || 'Unknown',
            totalBytes: download.totalBytes,
          })

          logger.info(`Download ${downloadDelta.id} progress: ${progress}%`)

          // 通知历史页面更新进度
          chrome.runtime
            .sendMessage({
              action: DownloadEvent.PROGRESS,
              downloadId: downloadDelta.id,
              progress,
              filename: download.filename,
              bytesReceived: download.bytesReceived,
              totalBytes: download.totalBytes,
            })
            .catch(() => {
              // 忽略错误，可能没有历史页面在监听
            })
        }
      }
    } catch (error) {
      logger.error('Error getting download info:', error)
    }
  }
})

// 监听下载创建，初始化进度跟踪
chrome.downloads.onCreated.addListener((downloadItem) => {
  logger.info('Download created:', downloadItem)
  downloadProgress.set(downloadItem.id, {
    progress: 0,
    filename: downloadItem.filename,
    totalBytes: downloadItem.totalBytes || 0,
  })
})

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === ContentEvent.THEME_UPDATED) {
    logger.info('Background: Received theme update, broadcasting to all tabs')
    // 通知所有标签页主题已更新
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: ContentEvent.THEME_UPDATED,
              theme: request.theme,
            })
            .catch(() => {
              // 忽略错误，可能某些标签页没有content script
            })
        }
      })
    })

    // 同时广播到所有扩展页面（popup, options, history等）
    chrome.runtime
      .sendMessage({
        action: ContentEvent.THEME_UPDATED,
        theme: request.theme,
      })
      .catch(() => {
        // 忽略错误，可能没有其他页面在监听
      })

    sendResponse({ success: true })
    return true
  }
  if (request.action === DownloadEvent.START) {
    // 使用Chrome下载API
    chrome.downloads.download(
      {
        url: request.url,
        filename: request.filename,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          })
        } else {
          logger.info(`Download started with ID: ${downloadId}`)
          sendResponse({ success: true, downloadId: downloadId }) // 返回 downloadId
        }
      },
    )
    return true // 保持消息通道开放
  } else if (request.action === ContentEvent.RELOAD) {
    // 重新注入内容脚本
    if (sender.tab?.id) {
      chrome.scripting
        .executeScript({
          target: { tabId: sender.tab.id },
          files: ['content.js'], // 确保这里是正确的路径
        })
        .then(() => {
          logger.info('Content script re-injected successfully.')
          sendResponse({ success: true })
        })
        .catch((error) => {
          logger.error('Failed to re-inject content script:', error)
          sendResponse({ success: false, error: error.message })
        })
    } else {
      sendResponse({
        success: false,
        error: 'No tab ID found for content script reload.',
      })
    }
    return true // Keep message channel open for async response
  } else if (request.action === ContentEvent.GET_VIDEO_COUNT) {
    // 接收视频数量并更新徽章
    if (sender.tab?.id && request.videoCount !== undefined) {
      const count = request.videoCount > 0 ? String(request.videoCount) : ''
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: count })
      chrome.action.setBadgeBackgroundColor({
        tabId: sender.tab.id,
        color: '#EF4444',
      }) // 红色
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: 'Invalid getVideoCount request.' })
    }
  } else if (request.action === SelectorEvent.HIGHLIGHT) {
    // 转发高亮请求到当前活动标签页的内容脚本
    if (sender.tab?.id && request.selector) {
      chrome.tabs.sendMessage(
        sender.tab.id,
        { action: SelectorEvent.HIGHLIGHT, selector: request.selector },
        (response) => {
          sendResponse(response)
        },
      )
      return true // 保持消息通道开放
    } else {
      sendResponse({
        success: false,
        error: 'Invalid highlightElement request.',
      })
    }
  } else if (request.action === DownloadEvent.GET_PROGRESS) {
    // 获取下载进度
    const progress = downloadProgress.get(request.downloadId)
    sendResponse({ progress: progress || null })
  } else if (request.action === PageEvent.OPEN_OPTIONS) {
    // 打开选项页面
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        logger.error('Failed to open options page:', chrome.runtime.lastError.message)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        logger.info('Options page opened successfully')
        sendResponse({ success: true })
      }
    })
    return true // 保持消息通道开放
  }
})
