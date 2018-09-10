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
};
