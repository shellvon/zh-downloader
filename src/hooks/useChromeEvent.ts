import { useEffect } from 'react'
import { on as chromeOn } from '@/utils/events'

/**
 * 通用 Chrome 事件监听 Hook
 * @param handler 事件回调（类型自动推断）
 * @param target  事件对象，默认 chrome.runtime.onMessage
 */
export function useChromeEvent<
  Target extends {
    addListener: (...args: any[]) => any
    removeListener: (cb: any) => any
  } = typeof chrome.runtime.onMessage,
>(handler: Parameters<Target['addListener']>[0], target?: Target) {
  useEffect(() => {
    const actualTarget = target ?? chrome.runtime.onMessage
    return chromeOn(actualTarget, ...([handler] as Parameters<Target['addListener']>))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, handler])
}
