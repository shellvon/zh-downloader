'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Settings,
  History,
  Video,
  Zap,
  ChevronRight,
  Globe,
  CheckCircle,
  Target,
  Shield,
  Sun,
  Moon,
} from 'lucide-react' // 导入 Sun 和 Moon 图标
import { loadTheme, saveTheme, applyTheme, type Theme, listenThemeUpdate } from '@/utils/theme' // 导入 Theme 类型
import { loadConfig } from '@/utils/config'
import type { Config } from '@/types'
import './popup.css'
import '@/styles/theme.css'
import logger from '@/utils/logger'
import { ConfigEvent, SelectorEvent, DownloadEvent, ContentEvent, PageEvent } from '@/utils/events'

const PopupPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('正在检测当前页面...')
  const [videoCount, setVideoCount] = useState<number>(0)
  const [isStatusActive, setIsStatusActive] = useState(false)
  const [currentSite, setCurrentSite] = useState<string>('')
  const [config, setConfig] = useState<Config | null>(null)
  const [activeConfig, setActiveConfig] = useState<string>('')
  const [currentTheme, setCurrentTheme] = useState<Theme>('system') // 添加主题状态

  // 初始化主题和配置
  useEffect(() => {
    logger.log('Popup: Initializing theme and config...')
    const init = async () => {
      const savedTheme = await loadTheme()
      setCurrentTheme(savedTheme) // 设置当前主题状态
      applyTheme(savedTheme)

      const configData = await loadConfig()
      setConfig(configData)

      setLoading(false)
      logger.log('Popup: Theme and config loaded.')
    }
    init()

    const off = listenThemeUpdate((theme) => {
      setCurrentTheme(theme)
      applyTheme(theme)
    })
    return off
  }, [])

  // 获取当前页面状态和视频数量
  useEffect(() => {
    const getPageStatus = async () => {
      logger.log('Popup: Getting page status...')
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })

        if (
          !tab ||
          !tab.id ||
          !tab.url ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('about:')
        ) {
          setStatusMessage('请在普通网页中使用此扩展')
          setIsStatusActive(false)
          setVideoCount(0)
          setCurrentSite('系统页面')
          setActiveConfig('无')
          logger.log('Popup: Invalid tab URL or ID.')
          return
        }

        const hostname = new URL(tab.url).hostname
        setCurrentSite(hostname)
        logger.log('Popup: Current hostname:', hostname)

        // 检查当前网站的配置
        let matchedConfig = '通用模式'
        if (config) {
          for (const [site, siteConfig] of Object.entries(config.sites)) {
            if (hostname.includes(site) && siteConfig.enabled) {
              matchedConfig = site
              break
            }
          }
        }
        setActiveConfig(matchedConfig)

        // 检查是否是知乎网站
        const isZhihu = hostname.includes('zhihu.com')

        let count = 0
        try {
          logger.log('Popup: Attempting to get video count from content script...')
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: ContentEvent.GET_VIDEO_COUNT,
          })
          if (response && typeof response.videoCount === 'number') {
            count = response.videoCount
            logger.log('Popup: Received video count:', count)
          } else {
            logger.warn('Popup: Did not receive valid video count, response:', response)
          }
        } catch (error) {
          logger.warn(
            'Popup: Failed to get video count from content script, attempting re-injection:',
            error,
          )
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js'],
            })
            logger.log('Popup: Content script re-injected. Retrying get video count...')
            await new Promise((resolve) => setTimeout(resolve, 500))
            const response = await chrome.tabs.sendMessage(tab.id, {
              action: ContentEvent.GET_VIDEO_COUNT,
            })
            if (response && typeof response.videoCount === 'number') {
              count = response.videoCount
              logger.log('Popup: Received video count after re-injection:', count)
            } else {
              logger.warn(
                'Popup: Did not receive valid video count after re-injection, response:',
                response,
              )
            }
          } catch (reinjectError) {
            logger.error(
              'Popup: Failed to re-inject content script and get video count:',
              reinjectError,
            )
          }
        }
        setVideoCount(count)

        if (isZhihu) {
          setStatusMessage('知乎视频检测已激活')
          setIsStatusActive(true)
        } else {
          setStatusMessage('通用视频检测模式')
          setIsStatusActive(true)
        }
      } catch (error) {
        logger.error('Popup: Failed to get page status:', error)
        setStatusMessage('无法检测当前页面状态')
        setIsStatusActive(false)
        setVideoCount(0)
        setCurrentSite('未知')
        setActiveConfig('无')
      }
    }

    if (config) {
      getPageStatus()
    }
  }, [config])

  const openOptionsPage = useCallback(() => {
    logger.log('Popup: Opening options page.')
    chrome.runtime.openOptionsPage()
  }, [])

  const openHistoryPage = useCallback(() => {
    logger.log('Popup: Opening history page.')
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/history/index.html'),
    })
  }, [])

  // 切换主题函数
  const handleThemeToggle = useCallback(async () => {
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light'
    await saveTheme(newTheme)
    setCurrentTheme(newTheme)
    applyTheme(newTheme)
    logger.log('Popup: Theme toggled to', newTheme)
  }, [currentTheme])

  // 启动元素选择器
  const startElementSelector = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (
        !tab ||
        !tab.id ||
        !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:')
      ) {
        alert('请在普通网页中启动元素选择器')
        return
      }

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: SelectorEvent.START,
        })
        logger.log('Sent startElementSelector message to content script.')
        window.close()
      } catch (error) {
        logger.warn('Failed to send message to content script, attempting re-injection:', error)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        })
        logger.log('Content script re-injected. Retrying startElementSelector message.')
        await new Promise((resolve) => setTimeout(resolve, 500))
        await chrome.tabs.sendMessage(tab.id, {
          action: SelectorEvent.START,
        })
        window.close()
      }
    } catch (error) {
      logger.error('启动元素选择器失败:', error)
      alert('启动元素选择器失败: ' + (error as Error).message)
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">正在初始化...</div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      {/* 可滚动内容区域 */}
      <div className="popup-content">
        {/* 头部 */}
        <div className="popup-header">
          <div className="popup-header-top">
            {' '}
            {/* 新增一个 div 来包裹标题和主题切换 */}
            <h1 className="popup-title">
              <Zap size={24} />
              知乎视频下载器
            </h1>
            <button onClick={handleThemeToggle} className="theme-toggle-button" title="切换主题">
              {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          <p className="popup-subtitle">专业的视频内容提取工具</p>
        </div>

        {/* 状态卡片 */}
        <div className={`status-card ${isStatusActive ? 'active' : ''}`}>
          <div className="status-info">
            <div className="status-icon">
              {isStatusActive ? <CheckCircle size={20} /> : <Globe size={20} />}
            </div>
            <div className="status-text">
              <div className="status-title">{statusMessage}</div>
              <div className="status-description">当前网站: {currentSite}</div>
            </div>
          </div>

          <div className="video-counter">
            <div className="counter-label">
              <Video size={16} />
              检测到的视频
            </div>
            <div className="counter-value">{videoCount}</div>
          </div>
        </div>

        {/* 配置状态 */}
        <div className="config-status">
          <div className="config-info">
            <Shield size={16} />
            <span>当前配置: {activeConfig}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button onClick={openHistoryPage} className="action-button primary">
            <History className="action-icon" />
            <span className="action-text">下载历史</span>
            <ChevronRight size={16} />
          </button>

          {/* 高级模式下的元素选择按钮 */}
          {config?.advancedModeEnabled && (
            <>
              <button onClick={() => startElementSelector()} className="action-button">
                <Target className="action-icon" />
                <span className="action-text">智能元素选择器</span>
                <ChevronRight size={16} />
              </button>
            </>
          )}

          <button onClick={openOptionsPage} className="action-button">
            <Settings className="action-icon" />
            <span className="action-text">扩展设置</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 版本信息 - 固定在底部 */}
      <div className="version-info">
        <p className="version-text">
          v{chrome.runtime.getManifest().version} • Made with ❤️ by shellvon
        </p>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  logger.log('Popup: Root container found, rendering React app.')
  const root = createRoot(container)
  root.render(<PopupPage />)
} else {
  logger.error('Popup: Root container #root not found!')
}
