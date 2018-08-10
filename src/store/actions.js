import * as types from './mutation-types';

export const addOrUpdateVideo = ({ commit }, payload) => {
  commit(types.ADD_OR_UPDATE_VIDEO, payload);
};

export const deleteVideo = ({ commit }, payload) => {
  commit(types.DELETE_VIDEO, payload);
  commit(types.DELETE_DOWNLOAD_INFO, { id: payload.id });
};

export const deletedExpiredVideo = ({ commit, state }, { expiredAt }) => {
  const outdatedVideoIds = [];
  // 寻找没有过期的视频
  const filteredVideo = state.playlist.filter(el => {
    const isUpToDate = el.updatedAt + expiredAt > new Date().getTime();
    if (!isUpToDate) {
      outdatedVideoIds.push(el.id);
    }
    return isUpToDate;
  });

  commit(types.RESET_VIDEO_INFO, filteredVideo);

  if (!outdatedVideoIds) {
    return;
  }
  // 寻找所有不在已过期视频列表内的下载信息
  const filteredDownloadInfo = state.downloadInfo.filter(el => outdatedVideoIds.indexOf(el.videoId) < 0);
  commit(types.RESET_DOWNLOAD_INFO, filteredDownloadInfo);
};

export const updateSettings = ({ commit, state }, payload) => {
  // 尝试更新
  let newSettings = state.customSettings || {};
  for (let profileKey in payload) {
    newSettings[profileKey] = payload[profileKey];
  }
  commit(types.UPDATE_SETTINGS, newSettings);
};
