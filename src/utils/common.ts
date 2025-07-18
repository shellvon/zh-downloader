import logger from '@/utils/logger'

// 截断 URL 显示
export const truncateUrl = (url: string, maxLength: number): string => {
  if (url.length <= maxLength) return url
  return `${url.substring(0, maxLength)}...`
}

// 复制到剪贴板
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    logger.log('复制成功:', text)
  } catch (err) {
    logger.error('复制失败:', err)
    throw new Error('复制失败，请手动复制。')
  }
}

// 格式化文件大小
export const formatFileSize = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 创建临时提示
export const createToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
): void => {
  const toast = document.createElement('div')
  toast.textContent = message

  const baseStyles = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 10000;
    box-shadow: var(--shadow-lg);
    animation: slideInRight 0.3s ease-out;
  `

  const typeStyles = {
    success: 'background: var(--accent-solid); color: white;',
    error: 'background: var(--red-9); color: white;',
    info: 'background: var(--blue-9); color: white;',
  }

  toast.style.cssText = baseStyles + typeStyles[type]
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 2000)
}

// 带提示的复制函数
export const copyWithToast = async (text: string): Promise<void> => {
  try {
    await copyToClipboard(text)
    createToast('已复制到剪贴板！')
  } catch (error) {
    createToast('复制失败，请手动复制。', 'error')
  }
}
