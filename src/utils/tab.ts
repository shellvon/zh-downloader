export function isValidTab(tab: chrome.tabs.Tab | undefined | null): tab is chrome.tabs.Tab {
  return !!(
    tab &&
    tab.id &&
    tab.url &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('about:')
  )
}
