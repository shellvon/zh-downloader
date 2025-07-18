import { ConfigEvent, DownloadEvent, RecordType } from '@/utils/events'
import { Theme } from '@/utils/theme'

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
  type: RecordType
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

// 下载相关消息类型
export interface DownloadProgressMessage {
  action: DownloadEvent.PROGRESS
  downloadId: number
  progress: number
  filename: string
  bytesReceived?: number
  totalBytes?: number
}

export interface DownloadCompleteMessage {
  action: DownloadEvent.COMPLETE
  downloadId: number
}

export interface DownloadCreatedMessage {
  action: DownloadEvent.CREATED
  downloadId: number
  filename: string
  url: string
  totalBytes?: number
}

export type DownloadEventMessage =
  | DownloadProgressMessage
  | DownloadCompleteMessage
  | DownloadCreatedMessage

export type ThemeUpdatedMessage = {
  action: ConfigEvent.THEME_UPDATED
  theme?: Theme
}
