import * as types from './mutation-types';

export default {
  /**
   * 更新视频信息
   */
  [types.ADD_OR_UPDATE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => el.id === payload.id);
    index = index < 0 ? state.playlist.length : index;

    state.playlist[index] = payload;
    state.playlist = [...state.playlist];
  },

  /**
   * 删除视频信息
   */
  [types.DELETE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => {
      return el.id === payload.id;
    });
    if (index > -1) {
      state.playlist.splice(index, 1);
    }
  },

  /**
   * 重置新视频列表
   */
  [types.RESET_VIDEO_INFO](state, payload) {
    state.playlist = payload;
  },

  /**
   * 重置新的下载历史列表
   */
  [types.RESET_DOWNLOAD_INFO](state, payload) {
    state.downloadInfo = payload;
  },

  /**
   * 更新视频下载信息
   */
  [types.ADD_OR_UPDATE_DOWNLOAD_INFO](state, { id: videoId, quality = 'hd', format = 'ts', progress = 0, link = '', name = '' }) {
    let downloadInfo = state.downloadInfo || [];
    let newDownloadRecord = { videoId, quality, format, progress, link, name };
    let index = downloadInfo.findIndex(downloadItem => {
      return downloadItem.videoId === videoId && downloadItem.quality === quality && downloadItem.format === format;
    });
    index = index < 0 ? downloadInfo.length : index;
    downloadInfo[index] = newDownloadRecord;
    state.downloadInfo = downloadInfo;
  },

  /**
   * 删除某个视频ID的下载信息
   */
  [types.DELETE_DOWNLOAD_INFO](state, { id: videoId }) {
    let index = state.downloadInfo.findIndex(downloadItem => {
      return downloadItem.videoId === videoId;
    });
    if (index > -1) {
      state.downloadInfo.splice(index, 1);
    }
  },

  /**
   * 更新设置
   */
  [types.UPDATE_SETTINGS](state, newSettings) {
    state.customSettings = newSettings;
  },

  /**
   * 最近最新的Tab页
   */
  [types.UPDATE_LATEST_TAB](state, latestTab) {
    state.latestTab = latestTab;
  },

  /**
   * 增加/更新嗅探项
   */
  [types.ADD_OR_UPDATE_SNIFFER_ITEM](state, { tabId, item }) {
    let snifferList = state.snifferObj[tabId] || [];
    let index = snifferList.findIndex(el => el.url === item.url);
    index = index < 0 ? snifferList.length : index;
    snifferList[index] = item;
    state.snifferObj[tabId] = snifferList;
  },

  /**
   * Tab被移除,需要清空数据
   */
  [types.REMOVE_TAB](state, tabId) {
    delete state.snifferObj[tabId];
  },

  /**
   * 删除某个Tab下的数据.
   */
  [types.DELETE_SNIFFER_ITEM](state, { tabId, index }) {
    let snifferList = state.snifferObj[tabId];
    if (snifferList) {
      snifferList.splice(index, 1);
      state.snifferObj[tabId] = snifferList;
    }
  },
};
