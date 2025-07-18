export enum ConfigEvent {
  UPDATED = 'configUpdated',
  THEME_UPDATED = 'themeUpdated',
}

export enum SelectorEvent {
  START = 'startElementSelector',
  STOP = 'stopElementSelector',
  HIGHLIGHT = 'highlightElement',
}

export enum DownloadEvent {
  START = 'download',
  PROGRESS = 'downloadProgress',
  COMPLETE = 'downloadComplete',
  GET_PROGRESS = 'getDownloadProgress',
}

export enum ContentEvent {
  RELOAD = 'reloadContentScript',
  GET_VIDEO_COUNT = 'getVideoCount',
  PING = 'ping',
  THEME_UPDATED = 'themeUpdated',
}

export enum PageEvent {
  OPEN_OPTIONS = 'openOptionsPage',
}
