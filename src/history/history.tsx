'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Trash2,
  Search,
  CalendarDays,
  XCircle,
  Download,
  Camera,
  FolderOpen,
  Copy,
  ExternalLink,
  Filter,
  Database,
  Clock,
  HardDrive,
  AlertCircle,
  Loader,
} from 'lucide-react'
import type { HistoryRecord } from '@/types'
import { loadTheme, applyTheme, listenThemeUpdate } from '@/utils/theme'
import './history.css'
import '@/styles/theme.css'

// 辅助函数：截断 URL
const truncateUrl = (url: string, maxLength: number) => {
  if (url.length <= maxLength) return url
  return `${url.substring(0, maxLength)}...`
}

// 辅助函数：复制到剪贴板
const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // 创建一个临时的成功提示
      const toast = document.createElement('div')
      toast.textContent = '已复制到剪贴板！'
      toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-solid);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      z-index: 10000;
      box-shadow: var(--shadow-lg);
      animation: slideInRight 0.3s ease-out;
    `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 2000)
    })
    .catch((err) => {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制。')
    })
}

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [_, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'download' | 'screenshot'>('all')
  const [totalCount, setTotalCount] = useState(0)
  const [downloadCount, setDownloadCount] = useState(0)
  const [screenshotCount, setScreenshotCount] = useState(0)
  const [totalSize, setTotalSize] = useState<number | undefined>(0)
  const [downloadProgress, setDownloadProgress] = useState<
    Map<number, { progress: number; filename: string }>
  >(new Map())

  // 初始化主题
  useEffect(() => {
    const initTheme = async () => {
      const savedTheme = await loadTheme()
      applyTheme(savedTheme)
      setLoading(false)
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

  // 监听下载进度消息
  useEffect(() => {
    const handleMessage = (request: any, sender: any, sendResponse: any) => {
      if (request.action === 'downloadProgress') {
        setDownloadProgress((prev) => {
          const newMap = new Map(prev)
          newMap.set(request.downloadId, {
            progress: request.progress,
            filename: request.filename,
          })
          return newMap
        })
      } else if (request.action === 'downloadComplete') {
        setDownloadProgress((prev) => {
          const newMap = new Map(prev)
          newMap.delete(request.downloadId)
          return newMap
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  const updateStats = useCallback((currentHistory: HistoryRecord[]) => {
    const newTotalCount = currentHistory.length
    const newDownloadCount = currentHistory.filter((record) => record.type === 'download').length
    const newScreenshotCount = currentHistory.filter(
      (record) => record.type === 'screenshot',
    ).length
    const newTotalSize = currentHistory.reduce((acc, record) => acc + (record.fileSize || 0), 0)

    setTotalCount(newTotalCount)
    setDownloadCount(newDownloadCount)
    setScreenshotCount(newScreenshotCount)
    setTotalSize(newTotalSize)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(['downloadHistory'])
      const records = result.downloadHistory || []
      setHistory(records)
      updateStats(records)
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setLoading(false)
    }
  }, [updateStats])

  // 监听存储变化，实时更新历史记录
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.downloadHistory) {
        const newHistory = changes.downloadHistory.newValue || []
        setHistory(newHistory)
        updateStats(newHistory)
        console.log('History updated from storage change')
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [updateStats])

  const clearHistory = useCallback(async () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
      try {
        await chrome.storage.local.set({ downloadHistory: [] })
        setHistory([])
        updateStats([])

        // 显示成功提示
        const toast = document.createElement('div')
        toast.textContent = '历史记录已清空'
        toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-solid);
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        z-index: 10000;
        box-shadow: var(--shadow-lg);
        animation: slideInRight 0.3s ease-out;
      `
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.remove()
        }, 2000)
      } catch (error) {
        console.error('清空历史记录失败:', error)
        alert('清空历史记录失败。')
      }
    }
  }, [updateStats])

  const deleteRecord = useCallback(
    async (timestamp: number) => {
      if (confirm('确定要删除此条历史记录吗？')) {
        try {
          const updatedHistory = history.filter((record) => record.timestamp !== timestamp)
          await chrome.storage.local.set({ downloadHistory: updatedHistory })
          setHistory(updatedHistory)
          updateStats(updatedHistory)

          // 显示成功提示
          const toast = document.createElement('div')
          toast.textContent = '记录已删除'
          toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--accent-solid);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          z-index: 10000;
          box-shadow: var(--shadow-lg);
          animation: slideInRight 0.3s ease-out;
        `
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
          }, 2000)
        } catch (error) {
          console.error('删除历史记录失败:', error)
          alert('删除历史记录失败。')
        }
      }
    },
    [history, updateStats],
  )

  const openDownloadedFile = useCallback(async (downloadId: number) => {
    try {
      await chrome.downloads.show(downloadId) // 修改为 show 方法
    } catch (error) {
      console.error('打开文件位置失败:', error)
      alert('打开文件位置失败，可能文件已被移动或删除。')
    }
  }, [])

  const formatFileSize = (bytes: number | undefined) => {
    if (bytes === undefined || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const filteredHistory = history.filter((record) => {
    const matchesSearch =
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.videoSrc.toLowerCase().includes(searchTerm.toLowerCase())

    const recordDate = new Date(record.timestamp)
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const matchesDate =
      (!start || recordDate >= start) &&
      (!end || recordDate <= new Date(end.setHours(23, 59, 59, 999)))

    const matchesType = typeFilter === 'all' || record.type === typeFilter

    return matchesSearch && matchesDate && matchesType
  })

  return (
    <div className="history-container">
      <div className="main-content">
        {/* 头部 */}
        <div className="header-section">
          <div className="header-content">
            <div className="header-info">
              <h1 className="header-title">
                <Database size={32} />
                下载历史中心
              </h1>
              <p className="header-subtitle">管理和分析您的下载记录</p>
            </div>
            <button onClick={clearHistory} className="clear-all-btn">
              <Trash2 size={16} />
              清空历史
            </button>
          </div>
        </div>

        {/* 历史记录限制提示 */}
        {totalCount >= 450 && (
          <div className="limit-warning">
            <AlertCircle size={20} />
            <div className="warning-content">
              <div className="warning-title">存储空间提醒</div>
              <div className="warning-text">
                当前已有 {totalCount} 条记录，系统最多保留 500 条历史记录。
                {totalCount >= 500 && '已达到上限，新记录将覆盖最旧的记录。'}
              </div>
            </div>
          </div>
        )}

        {/* 统计仪表板 */}
        <div className="stats-dashboard">
          <div className="stat-card total">
            <div className="stat-icon">
              <Database size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">总记录数</div>
            </div>
          </div>

          <div className="stat-card downloads">
            <div className="stat-icon">
              <Download size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{downloadCount}</div>
              <div className="stat-label">下载次数</div>
            </div>
          </div>

          <div className="stat-card screenshots">
            <div className="stat-icon">
              <Camera size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{screenshotCount}</div>
              <div className="stat-label">截图次数</div>
            </div>
          </div>

          <div className="stat-card storage">
            <div className="stat-icon">
              <HardDrive size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatFileSize(totalSize)}</div>
              <div className="stat-label">总文件大小</div>
            </div>
          </div>
        </div>

        {/* 筛选控制面板 */}
        <div className="filters-panel">
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="搜索标题、域名或链接..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="clear-search-btn">
                  <XCircle size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="filter-section">
            <div className="date-filters">
              <div className="date-input-wrapper">
                <CalendarDays size={16} className="date-icon" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                  title="开始日期"
                />
              </div>
              <div className="date-input-wrapper">
                <CalendarDays size={16} className="date-icon" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                  title="结束日期"
                />
              </div>
            </div>

            <div className="type-filter-wrapper">
              <Filter size={16} className="filter-icon" />
              <div className="type-filter-buttons">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`type-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
                >
                  全部
                </button>
                <button
                  onClick={() => setTypeFilter('download')}
                  className={`type-filter-btn ${typeFilter === 'download' ? 'active' : ''}`}
                >
                  <Download size={14} />
                  下载
                </button>
                <button
                  onClick={() => setTypeFilter('screenshot')}
                  className={`type-filter-btn ${typeFilter === 'screenshot' ? 'active' : ''}`}
                >
                  <Camera size={14} />
                  截图
                </button>
              </div>
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="clear-filters-btn"
                title="清除日期筛选"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="history-section">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Database size={48} />
              </div>
              <h3>暂无历史记录</h3>
              <p>开始使用扩展下载视频或截图，记录将显示在这里</p>
            </div>
          ) : (
            <div className="history-grid">
              {filteredHistory.map((record, index) => {
                const progress = record.downloadId ? downloadProgress.get(record.downloadId) : null

                return (
                  <div
                    key={record.timestamp}
                    className={`history-card ${record.type}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="card-header">
                      <div className="card-type-indicator">
                        {record.type === 'download' ? <Download size={20} /> : <Camera size={20} />}
                      </div>
                      <button
                        onClick={() => deleteRecord(record.timestamp)}
                        className="delete-btn"
                        title="删除此记录"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="card-content">
                      <h3 className="card-title">{record.title}</h3>

                      {/* 下载进度条 */}
                      {progress && (
                        <div className="download-progress">
                          <div className="progress-info">
                            <Loader size={14} className="progress-spinner" />
                            <span className="progress-text">下载中... {progress.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="card-details">
                        <div className="detail-item">
                          <span className="detail-label">域名</span>
                          <span className="detail-value">{record.domain}</span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">格式</span>
                          <span className="detail-value">{record.format || '未知'}</span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">大小</span>
                          <span className="detail-value">{formatFileSize(record.fileSize)}</span>
                        </div>

                        {/* 新增：为截图显示视频时间位置 */}
                        {record.type === 'screenshot' && record.screenshotTime && (
                          <div className="detail-item">
                            <span className="detail-label">截图时间</span>
                            <span className="detail-value">
                              <Clock size={12} />
                              {record.screenshotTime}
                            </span>
                          </div>
                        )}

                        <div className="detail-item">
                          <span className="detail-label">时间</span>
                          <span className="detail-value">
                            <Clock size={12} />
                            {new Date(record.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="card-links">
                        <div className="link-item">
                          <span className="link-label">页面:</span>
                          <a
                            href={record.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-url"
                            title={record.url}
                          >
                            {truncateUrl(record.url, 40)}
                            <ExternalLink size={12} />
                          </a>
                          <button
                            onClick={() => copyToClipboard(record.url)}
                            className="copy-btn"
                            title="复制页面链接"
                          >
                            <Copy size={12} />
                          </button>
                        </div>

                        {record.videoSrc && (
                          <div className="link-item">
                            <span className="link-label">视频源:</span>
                            <a
                              href={record.videoSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-url"
                              title={record.videoSrc}
                            >
                              {truncateUrl(record.videoSrc, 40)}
                              <ExternalLink size={12} />
                            </a>
                            <button
                              onClick={() => copyToClipboard(record.videoSrc)}
                              className="copy-btn"
                              title="复制视频源链接"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {record.downloadId && (
                        <div className="card-actions">
                          <button
                            onClick={() => openDownloadedFile(record.downloadId!)}
                            className="open-file-btn"
                            title="打开文件位置"
                          >
                            <FolderOpen size={14} />
                            打开文件位置
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<HistoryPage />)
}
