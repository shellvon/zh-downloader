export interface SiteConfig {
  enabled: boolean
  videoSelectors: string[]
  titleSelectors?: string[]
  authorSelectors?: string[]
  dataAttributes?: string[]
  builtin?: boolean
  containerSelectors?: string[]
}

export interface Config {
  sites: Record<string, SiteConfig>
  universal: {
    videoSelectors: string[]
    containerSelectors: string[]
  }
  advancedModeEnabled: boolean
}

export interface VideoInfo {
  src: string
  title: string
  quality: string
  format: string
  isStreamable: boolean
}

export interface HistoryRecord {
  type: 'download' | 'screenshot'
  title: string
  domain: string
  url: string
  videoSrc: string
  timestamp: number
  format?: string
  fileSize?: number
  downloadId?: number
  screenshotTime?: string
  screenshotSeconds?: number
}

export interface ElementSelectorData {
  selector: string
  tagName: string
  className: string
  id: string
  selectorType: 'video' | 'title' | 'author' | 'container'
  hostname: string
  documentTitle: string
}
