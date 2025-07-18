import type { Config } from '@/types'

export const getDefaultConfig = (): Config => ({
  sites: {
    'zhihu.com': {
      enabled: true,
      videoSelectors: [
        'video',
        '.VideoCard-video',
        '.ZVideoItem',
        '.ZVideo',
        '[data-za-detail-view-element_name="Video"]',
        '.css-1qyytj7',
        '.VideoAnswerPlayer',
        '._1k7bcr7',
      ],
      titleSelectors: [
        '.ContentItem-title',
        '.QuestionHeader-title',
        '.QuestionHeader-main .QuestionHeader-title',
        '.AnswerItem .RichContent',
        'h1',
      ],
      authorSelectors: [
        '.AuthorInfo-name .UserLink-link',
        '.AuthorInfo-head .UserLink-link',
        '.UserLink.AuthorInfo-name a',
        '.AuthorInfo .UserLink-link',
        '.ContentItem-meta .UserLink-link',
        '.AnswerItem-meta .UserLink-link',
      ],
      dataAttributes: ['data-zop'],
      builtin: true,
    },
  },
  universal: {
    videoSelectors: [
      'video',
      'video[src]',
      'video source',
      '[data-video-src]',
      '[data-src*=".mp4"]',
      '[data-src*=".webm"]',
      '[data-src*=".ogg"]',
    ],
    containerSelectors: [
      '.video-container',
      '.player-container',
      '.video-wrapper',
      '.media-container',
    ],
  },
  advancedModeEnabled: false,
})

export const loadConfig = async (): Promise<Config> => {
  try {
    const result = await chrome.storage.sync.get(['videoDownloaderConfig'])
    const loadedConfig = result.videoDownloaderConfig || getDefaultConfig()
    return loadedConfig
  } catch (error) {
    console.warn('加载配置失败，使用默认配置:', error)
    return getDefaultConfig()
  }
}

export const saveConfig = async (config: Config): Promise<void> => {
  await chrome.storage.sync.set({ videoDownloaderConfig: config })
  // 判断是否有 chrome.tabs（background 才有）
  if (chrome.tabs && typeof chrome.tabs.query === 'function') {
    const tabs = await chrome.tabs.query({})
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'configUpdated' }).catch(() => {})
      }
    })
  }
}
