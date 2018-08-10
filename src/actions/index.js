import * as types from '../constants';

/**
 * 加入新视频
 */
export const addNewVideo = payload => {
  return { type: types.ADD_NEW_VIDEO, payload: payload };
};

/**
 * 开始下载视频
 * @param {object} payload
 */
export const startDownloadVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_START, payload: payload };
};

/**
 * 正在下载视频
 * @param {object}} payload
 */
export const downloadingVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_INPROGRESS, payload: payload };
};

/**
 * 合并视频(将多个ts->mp4或者将多个TS->单个TS)
 * @param {object} payload
 */
export const mergeVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_MERGING, payload: payload };
};

/**
 * 合并完成视频, 也就是下载完成了
 *
 * @param {object} payload
 * @see finishedDownloadVideo
 */
export const finishedMergeVideo = payload => {
  return downloadProgressUpdate(payload);
};

/**
 * 完成下载视频
 * @param {object} payload
 */
export const finishedDownloadVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_FINISHED, payload: payload };
};

/**
 * 更新下载进度
 * @param {object} payload
 */
export const downloadProgressUpdate = payload => {
  return { type: types.UPDATE_DOWNLOAD_PROGRESS, payload: payload };
};

/**
 * 删除视频
 * @param {object} payload
 */
export const deleteVideo = payload => {
  return { type: types.DELETED_VIDEO, payload: payload };
};

/**
 * 未知事件
 * @param {object} payload
 */
export const unknownAction = payload => {
  return { type: types.UNKNOWN_ACTION, payload: payload };
};
