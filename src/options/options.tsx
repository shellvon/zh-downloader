'use client'

import type React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Target,
  Check,
  X,
  Plus,
  Trash2,
  Edit,
  Info,
  Sun,
  Moon,
  Zap,
  Globe,
  Video,
  Type,
  User,
  Box,
} from 'lucide-react'
import type { Config, SiteConfig, ElementSelectorData } from '@/types'
import { loadConfig, saveConfig, getDefaultConfig } from '@/utils/config'
import { saveTheme, type Theme } from '@/utils/theme'
import { useTheme } from '@/hooks/useTheme'
import { useChromeEvent } from '@/hooks/useChromeEvent'
import { STORAGE_KEYS } from '@/utils/constants'
import './options.css'
import '@/styles/theme.css'
import logger from '@/utils/logger'
import { ConfigEvent, SelectorEvent} from '@/utils/events'

const OptionsPage: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null)
  const [_, setLoading] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isElementSelectorActive, setIsElementSelectorActive] = useState(false)
  const [selectedElement, setSelectedElement] = useState<
    (ElementSelectorData & { selectorType: 'video' | 'title' | 'author' | 'container' }) | null
  >(null)
  const [editingDomain, setEditingDomain] = useState<string | null>(null)
  // 主题由 useTheme 统一管理
  useTheme()

  const importFileInputRef = useRef<HTMLInputElement>(null)

  // 切换主题
  const [theme, setTheme] = useState<Theme>('system')
  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    await saveTheme(newTheme)
    setTheme(newTheme)
  }, [theme])

  // 加载配置
  const loadConfigData = useCallback(async () => {
    try {
      const configData = await loadConfig()
      setConfig(configData)
    } catch (error) {
      logger.error('加载配置失败:', error)
      setConfig(getDefaultConfig())
      showMessage('加载配置失败，使用默认配置', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // 保存配置
  const saveConfigData = useCallback(async (newConfig: Config) => {
    try {
      await saveConfig(newConfig)
      setConfig(newConfig)
      showMessage('配置保存成功！', 'success')
      chrome.runtime.sendMessage({ action: ConfigEvent.UPDATED }).catch((error) => {
        logger.warn('Failed to send configUpdated message to background:', error)
      })
    } catch (error) {
      logger.error('保存配置失败:', error)
      showMessage('配置保存失败: ' + (error as Error).message, 'error')
    }
  }, [])

  // 切换站点启用状态
  const toggleSiteEnabled = useCallback(
    (domain: string) => {
      if (!config) return

      const newConfig = {
        ...config,
        sites: {
          ...config.sites,
          [domain]: {
            ...config.sites[domain],
            enabled: !config.sites[domain].enabled,
          },
        },
      }

      saveConfigData(newConfig)
    },
    [config, saveConfigData],
  )

  // 删除站点
  const deleteSite = useCallback(
    (domain: string) => {
      if (!config || config.sites[domain]?.builtin) return

      if (confirm(`确定要删除 ${domain} 的配置吗？`)) {
        const newConfig = { ...config }
        delete newConfig.sites[domain]
        saveConfigData(newConfig)
      }
    },
    [config, saveConfigData],
  )

  // 添加或更新站点
  const addOrUpdateSite = useCallback(
    (
      domain: string,
      videoSelectors: string[],
      titleSelectors?: string[],
      authorSelectors?: string[],
      containerSelectors?: string[],
      isBuiltin = false,
    ) => {
      if (!config || !domain.trim() || videoSelectors.length === 0) {
        showMessage('域名和视频选择器不能为空', 'error')
        return
      }

      const siteConfig: SiteConfig = {
        enabled: true,
        videoSelectors,
        builtin: isBuiltin,
      }

      if (titleSelectors && titleSelectors.length > 0) {
        siteConfig.titleSelectors = titleSelectors
      }
      if (authorSelectors && authorSelectors.length > 0) {
        siteConfig.authorSelectors = authorSelectors
      }
      if (containerSelectors && containerSelectors.length > 0) {
        siteConfig.containerSelectors = containerSelectors
      }

      const newConfig = {
        ...config,
        sites: {
          ...config.sites,
          [domain]: siteConfig,
        },
      }

      saveConfigData(newConfig)
      setEditingDomain(null)
    },
    [config, saveConfigData],
  )

  // 启动元素选择器
  const startElementSelector = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (
        !tab ||
        !tab.id ||
        !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:')
      ) {
        showMessage('请在普通网页中启动元素选择器', 'error')
        return
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { action: SelectorEvent.START })
        logger.log('Sent startElementSelector message to content script.')
      } catch (error) {
        logger.warn('Failed to send message to content script, attempting re-injection:', error)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        })
        logger.log('Content script re-injected. Retrying startElementSelector message.')
        await new Promise((resolve) => setTimeout(resolve, 500))
        await chrome.tabs.sendMessage(tab.id, { action: SelectorEvent.START })
      }

      setIsElementSelectorActive(true)
      showMessage('元素选择器已启动，请在当前网页中点击目标元素', 'success')
    } catch (error) {
      logger.error('启动元素选择器失败:', error)
      showMessage('启动元素选择器失败: ' + (error as Error).message, 'error')
    }
  }, [])

  // 停止元素选择器
  const stopElementSelector = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { action: SelectorEvent.STOP })
        setIsElementSelectorActive(false)
        setSelectedElement(null)
      }
    } catch (error) {
      logger.error('停止元素选择器失败:', error)
    }
  }, [])

  // 恢复默认配置
  const resetToDefault = useCallback(() => {
    if (confirm('确定要恢复到默认配置吗？这将清除所有自定义设置。')) {
      saveConfigData(getDefaultConfig())
    }
  }, [saveConfigData])

  // 导出配置
  const exportConfig = useCallback(() => {
    if (!config) return

    const configJson = JSON.stringify(config, null, 2)
    const blob = new Blob([configJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `video-downloader-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
    showMessage('配置已导出', 'success')
  }, [config])

  // 导入配置
  const importConfig = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string)

          if (!importedConfig.sites || !importedConfig.universal) {
            throw new Error('配置格式不正确')
          }

          saveConfigData(importedConfig)
        } catch (error) {
          showMessage('导入失败: ' + (error as Error).message, 'error')
        }
      }

      reader.readAsText(file)
      event.target.value = ''
    },
    [saveConfigData],
  )

  // 切换高级模式
  const toggleAdvancedMode = useCallback(() => {
    if (!config) return
    const newConfig = { ...config, advancedModeEnabled: !config.advancedModeEnabled }
    saveConfigData(newConfig)
  }, [config, saveConfigData])

  // 初始化
  useEffect(() => {
    loadConfigData()
  }, [loadConfigData])

  // 监听配置变更（storage）
  useChromeEvent(
    (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEYS.VIDEO_DOWNLOADER_CONFIG]) {
        const newConfig = changes[STORAGE_KEYS.VIDEO_DOWNLOADER_CONFIG].newValue
        if (newConfig) setConfig(newConfig)
      }
    },
    chrome.storage.onChanged
  )

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="options-container">
      <div className="main-content">
        {/* 头部 */}
        <div className="header-card">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-info">
                <h1>
                  <Zap size={32} />
                  扩展程序配置
                </h1>
                <p>自定义网站支持和选择器配置</p>
              </div>
              <div className="header-actions">
                <button onClick={exportConfig} className="btn btn-secondary">
                  <Download size={16} />
                  导出配置
                </button>
                <label htmlFor="importFile" className="btn btn-secondary">
                  <Upload size={16} />
                  导入配置
                  <input
                    id="importFile"
                    type="file"
                    accept=".json"
                    onChange={importConfig}
                    style={{ display: 'none' }}
                    ref={importFileInputRef}
                  />
                </label>
                <button
                  onClick={resetToDefault}
                  className="btn"
                  style={{ background: 'var(--destructive)' }}
                >
                  <RotateCcw size={16} />
                  恢复默认
                </button>
                <button onClick={toggleTheme} className="btn btn-ghost">
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {theme === 'light' ? '暗色模式' : '亮色模式'}
                </button>
              </div>
            </div>
          </div>
          {/* 消息提示 */}
          {message && (
            <div
              className={`message-banner ${message.type === 'success' ? 'message-success' : 'message-error'}`}
            >
              {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
              {message.text}
            </div>
          )}
        </div>

        {/* 高级模式开关 */}
        <div className="mode-toggle-card">
          <div className="mode-info">
            <h2>
              <Settings size={24} />
              高级模式
            </h2>
            <p className="mode-description">
              高级模式允许您自定义视频和标题的选择器，以及添加新的网站支持。如果您不熟悉 CSS
              选择器，请谨慎操作。
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config?.advancedModeEnabled || false}
              onChange={toggleAdvancedMode}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">{config?.advancedModeEnabled ? '已开启' : '已关闭'}</span>
        </div>

        {/* 元素选择器 (仅在高级模式下显示) */}
        {config?.advancedModeEnabled && (
          <div className="selector-card">
            <div className="selector-header">
              <Target size={24} />
              <h2>智能元素选择器</h2>
            </div>
            <div className="selector-buttons">
              <button
                onClick={startElementSelector}
                disabled={isElementSelectorActive}
                className={`btn ${isElementSelectorActive ? 'btn-ghost' : 'btn-primary'}`}
              >
                <Target size={16} />
                启动元素选择器
              </button>
              {isElementSelectorActive && (
                <button
                  onClick={stopElementSelector}
                  className="btn"
                  style={{ background: 'var(--destructive)' }}
                >
                  <X size={16} />
                  停止选择
                </button>
              )}
            </div>
            {selectedElement && (
              <div className="selector-info">
                <p
                  style={{
                    color: 'var(--muted-foreground)',
                    fontSize: '0.875rem',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  已选择元素:
                </p>
                <div className="selector-code">{selectedElement.selector}</div>
                <div className="selector-meta">
                  类型: {selectedElement.selectorType} | 网站: {selectedElement.hostname} |
                  页面标题: {selectedElement.documentTitle}
                </div>
              </div>
            )}
            <div className="info-tip">
              <Info size={14} style={{ color: 'var(--primary-solid)', flexShrink: 0 }} />
              点击上方按钮后，请切换到您要操作的网页（例如知乎、B站），然后在该页面中点击目标元素。选择结果将自动填充到此页面。
            </div>
          </div>
        )}

        {/* 站点配置 */}
        <div className="sites-card">
          <div className="sites-header">
            <Globe size={24} />
            <h2>网站配置</h2>
          </div>
          <div className="sites-grid">
            {Object.entries(config?.sites || {}).map(([domain, siteConfig]) => (
              <SiteConfigCard
                key={domain}
                domain={domain}
                config={siteConfig}
                onToggleEnabled={() => toggleSiteEnabled(domain)}
                onDelete={() => deleteSite(domain)}
                onEdit={() => setEditingDomain(domain)}
                advancedModeEnabled={config?.advancedModeEnabled || false}
              />
            ))}
          </div>
          {/* 添加新站点表单 */}
          {!editingDomain && config?.advancedModeEnabled && (
            <AddSiteForm
              onAddSite={addOrUpdateSite}
              selectedElement={selectedElement}
              advancedModeEnabled={config?.advancedModeEnabled || false}
            />
          )}
          {/* 编辑站点表单 */}
          {editingDomain && config?.sites[editingDomain] && config?.advancedModeEnabled && (
            <EditSiteForm
              domain={editingDomain}
              initialConfig={config.sites[editingDomain]}
              onSave={addOrUpdateSite}
              onCancel={() => setEditingDomain(null)}
              advancedModeEnabled={config.advancedModeEnabled || false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// 站点配置卡片组件
interface SiteConfigCardProps {
  domain: string
  config: SiteConfig
  onToggleEnabled: () => void
  onDelete: () => void
  onEdit: () => void
  advancedModeEnabled: boolean
}

const SiteConfigCard: React.FC<SiteConfigCardProps> = ({
  domain,
  config,
  onToggleEnabled,
  onDelete,
  onEdit,
  advancedModeEnabled,
}) => {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`site-card ${config.enabled ? 'enabled' : ''}`}>
      <div className="site-header">
        <div className="site-title">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={onToggleEnabled}
            className="site-checkbox"
          />
          <span className="site-name">{domain}</span>
          {config.builtin && <span className="site-badge">内置</span>}
        </div>
        <div className="site-actions">
          {advancedModeEnabled && (
            <button onClick={onEdit} className="icon-button" title="编辑配置">
              <Edit size={16} />
            </button>
          )}
          {!config.builtin && advancedModeEnabled && (
            <button onClick={onDelete} className="icon-button danger" title="删除配置">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <button onClick={() => setShowDetails(!showDetails)} className="details-toggle">
        {showDetails ? '隐藏详情' : '显示详情'}
      </button>

      {showDetails && (
        <div className="site-details">
          <div className="selector-group">
            <h4>视频选择器</h4>
            <div className="selector-list">
              {config.videoSelectors.length > 0 ? (
                config.videoSelectors.map((selector, index) => (
                  <div key={index} className="selector-item">
                    <span className="selector-text">{selector}</span>
                  </div>
                ))
              ) : (
                <span style={{ color: 'var(--muted-foreground)' }}>无</span>
              )}
            </div>
          </div>

          {config.titleSelectors && (
            <div className="selector-group">
              <h4>标题选择器</h4>
              <div className="selector-list">
                {config.titleSelectors.length > 0 ? (
                  config.titleSelectors.map((selector, index) => (
                    <div key={index} className="selector-item">
                      <span className="selector-text">{selector}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--muted-foreground)' }}>无</span>
                )}
              </div>
            </div>
          )}

          {config.authorSelectors && (
            <div className="selector-group">
              <h4>作者选择器</h4>
              <div className="selector-list">
                {config.authorSelectors.length > 0 ? (
                  config.authorSelectors.map((selector, index) => (
                    <div key={index} className="selector-item">
                      <span className="selector-text">{selector}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--muted-foreground)' }}>无</span>
                )}
              </div>
            </div>
          )}

          {config.containerSelectors && (
            <div className="selector-group">
              <h4>容器选择器</h4>
              <div className="selector-list">
                {config.containerSelectors.length > 0 ? (
                  config.containerSelectors.map((selector, index) => (
                    <div key={index} className="selector-item">
                      <span className="selector-text">{selector}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--muted-foreground)' }}>无</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 添加站点表单组件
interface AddSiteFormProps {
  onAddSite: (
    domain: string,
    videoSelectors: string[],
    titleSelectors?: string[],
    authorSelectors?: string[],
    containerSelectors?: string[],
  ) => void
  selectedElement:
    | (ElementSelectorData & {
        selectorType: 'video' | 'title' | 'author' | 'container'
        hostname: string
        documentTitle: string
      })
    | null
  advancedModeEnabled: boolean
}

const AddSiteForm: React.FC<AddSiteFormProps> = ({
  onAddSite,
  selectedElement,
  advancedModeEnabled,
}) => {
  const [domain, setDomain] = useState('')
  const [videoSelectors, setVideoSelectors] = useState('')
  const [titleSelectors, setTitleSelectors] = useState('')
  const [authorSelectors, setAuthorSelectors] = useState('')
  const [containerSelectors, setContainerSelectors] = useState('')

  // 当选择了元素时，自动填充选择器
  useEffect(() => {
    if (selectedElement) {
      setDomain(selectedElement.hostname)
      if (selectedElement.selectorType === 'video') {
        setVideoSelectors((prev) =>
          prev ? `${prev}\n${selectedElement.selector}` : selectedElement.selector,
        )
      } else if (selectedElement.selectorType === 'title') {
        setTitleSelectors((prev) =>
          prev ? `${prev}\n${selectedElement.selector}` : selectedElement.selector,
        )
      } else if (selectedElement.selectorType === 'author') {
        setAuthorSelectors((prev) =>
          prev ? `${prev}\n${selectedElement.selector}` : selectedElement.selector,
        )
      } else if (selectedElement.selectorType === 'container') {
        setContainerSelectors((prev) =>
          prev ? `${prev}\n${selectedElement.selector}` : selectedElement.selector,
        )
      }
    }
  }, [selectedElement])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!domain.trim()) {
      alert('请输入网站域名')
      return
    }

    const videoSelectorList = videoSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)

    if (videoSelectorList.length === 0) {
      alert('请输入至少一个视频选择器')
      return
    }

    const titleSelectorList = titleSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)
    const authorSelectorList = authorSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)
    const containerSelectorList = containerSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)

    onAddSite(
      domain,
      videoSelectorList,
      titleSelectorList.length > 0 ? titleSelectorList : undefined,
      authorSelectorList.length > 0 ? authorSelectorList : undefined,
      containerSelectorList.length > 0 ? containerSelectorList : undefined,
    )

    // 清空表单
    setDomain('')
    setVideoSelectors('')
    setTitleSelectors('')
    setAuthorSelectors('')
    setContainerSelectors('')
  }

  if (!advancedModeEnabled) return null

  return (
    <div className="form-section">
      <h3 className="form-title">
        <Plus size={20} />
        添加新站点
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">网站域名 *</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="例如: example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Video size={14} /> 视频选择器 * (每行一个)
            </label>
            <textarea
              value={videoSelectors}
              onChange={(e) => setVideoSelectors(e.target.value)}
              placeholder="video\n.video-player video\n[data-video]"
              className="form-input form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Type size={14} /> 标题选择器 (可选，每行一个)
            </label>
            <textarea
              value={titleSelectors}
              onChange={(e) => setTitleSelectors(e.target.value)}
              placeholder="h1\n.title\n.video-title"
              className="form-input form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <User size={14} /> 作者选择器 (可选，每行一个)
            </label>
            <textarea
              value={authorSelectors}
              onChange={(e) => setAuthorSelectors(e.target.value)}
              placeholder=".author-name\n.user-name"
              className="form-input form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Box size={14} /> 容器选择器 (可选，每行一个)
            </label>
            <textarea
              value={containerSelectors}
              onChange={(e) => setContainerSelectors(e.target.value)}
              placeholder=".video-container\n.player-wrapper"
              className="form-input form-textarea"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          添加站点
        </button>
      </form>
    </div>
  )
}

// 编辑站点表单组件
interface EditSiteFormProps {
  domain: string
  initialConfig: SiteConfig
  onSave: (
    domain: string,
    videoSelectors: string[],
    titleSelectors?: string[],
    authorSelectors?: string[],
    containerSelectors?: string[],
    isBuiltin?: boolean,
  ) => void
  onCancel: () => void
  advancedModeEnabled: boolean
}

const EditSiteForm: React.FC<EditSiteFormProps> = ({
  domain,
  initialConfig,
  onSave,
  onCancel,
  advancedModeEnabled,
}) => {
  const [videoSelectors, setVideoSelectors] = useState(initialConfig.videoSelectors.join('\n'))
  const [titleSelectors, setTitleSelectors] = useState(
    (initialConfig.titleSelectors || []).join('\n'),
  )
  const [authorSelectors, setAuthorSelectors] = useState(
    (initialConfig.authorSelectors || []).join('\n'),
  )
  const [containerSelectors, setContainerSelectors] = useState(
    (initialConfig.containerSelectors || []).join('\n'),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const videoSelectorList = videoSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)

    if (videoSelectorList.length === 0) {
      alert('请输入至少一个视频选择器')
      return
    }

    const titleSelectorList = titleSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)
    const authorSelectorList = authorSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)
    const containerSelectorList = containerSelectors
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s)

    onSave(
      domain,
      videoSelectorList,
      titleSelectorList.length > 0 ? titleSelectorList : undefined,
      authorSelectorList.length > 0 ? authorSelectorList : undefined,
      containerSelectorList.length > 0 ? containerSelectorList : undefined,
      initialConfig.builtin,
    )
  }

  if (!advancedModeEnabled) return null

  return (
    <div className="form-section">
      <h3 className="form-title">
        <Edit size={20} />
        编辑站点: {domain}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">
              <Video size={14} /> 视频选择器 * (每行一个)
            </label>
            <textarea
              value={videoSelectors}
              onChange={(e) => setVideoSelectors(e.target.value)}
              className="form-input form-textarea"
              style={{ minHeight: '150px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Type size={14} /> 标题选择器 (可选，每行一个)
            </label>
            <textarea
              value={titleSelectors}
              onChange={(e) => setTitleSelectors(e.target.value)}
              className="form-input form-textarea"
              style={{ minHeight: '150px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <User size={14} /> 作者选择器 (可选，每行一个)
            </label>
            <textarea
              value={authorSelectors}
              onChange={(e) => setAuthorSelectors(e.target.value)}
              className="form-input form-textarea"
              style={{ minHeight: '150px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Box size={14} /> 容器选择器 (可选，每行一个)
            </label>
            <textarea
              value={containerSelectors}
              onChange={(e) => setContainerSelectors(e.target.value)}
              className="form-input form-textarea"
              style={{ minHeight: '150px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary">
            <Check size={16} />
            保存更改
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            <X size={16} />
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

// 渲染应用
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<OptionsPage />)
}
