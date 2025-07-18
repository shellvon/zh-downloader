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
  CREATED = 'downloadCreated',
  PROGRESS = 'downloadProgress',
  COMPLETE = 'downloadComplete',
}

export enum RecordType {
  VIDEO = 'video',
  SCREENSHOT = 'screenshot',
}

export enum ContentEvent {
  RELOAD = 'reloadContentScript',
  GET_VIDEO_COUNT = 'getVideoCount',
  PING = 'ping',
}

export enum PageEvent {
  OPEN_OPTIONS = 'openOptionsPage',
}

// 类型安全的事件注册和解绑工具
export function on<
  T extends { addListener: (...args: any[]) => any; removeListener: (cb: any) => any },
>(target: T, ...args: Parameters<T['addListener']>) {
  target.addListener(...args)
  // 返回解绑函数
  return () => target.removeListener(args[0])
}
