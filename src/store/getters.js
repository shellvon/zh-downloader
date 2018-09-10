/**
 * 视频列表信息,按照更新视频排序(最近更新的在最前面).
 *
 * @param {object} state
 */
export const playlist = state => {
  const items = [...state.playlist].sort(({ updatedAt: a = 0 }, { updatedAt: b = 0 }) => {
    return b - a;
  });
  return items;
};

/**
 * 视频信息
 *
 * @param {object} state
 *
 */
export const downloadInfo = state => state.downloadInfo;

/**
 *  通过视频信息获取下载信息,视频信息中应该包含视频Id,视频清晰度和视频格式.
 *
 * @param {object} state
 */
export const getDownloadInfoByVideoItemInfo = state => {
  return (videoItemInfo, key = undefined, defaultValue = undefined) => {
    const index = state.downloadInfo.findIndex(downloadItem => {
      // 视频Id/清晰度/视频格式.
      return downloadItem.videoId === videoItemInfo.id && downloadItem.quality === videoItemInfo.quality && downloadItem.format === videoItemInfo.format;
    });
    // 如果找到了就是尝试取key,没找到就是默认值.
    return index < 0 ? defaultValue : key ? state.downloadInfo[index][key] : state.downloadInfo[index];
  };
};

/**
 * 自定义的设置信息
 *
 * @param {object} state
 */
export const customSettings = state => state.customSettings || {};

export const latestTab = state => state.latestTab;
