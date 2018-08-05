import * as types from '../constants';

export const addNewVideo = payload => {
  return { type: types.ADD_NEW_VIDEO, payload: payload };
};
export const startDownloadVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_START, payload: payload };
};

export const finishedDownloadVideo = payload => {
  return { type: types.DOWNLOAD_VIDEO_FINISHED, payload: payload };
};

export const downloadProgressUpdate = payload => {
  return { type: types.UPDATE_DOWNLOAD_PROGRESS, payload: payload };
};

export const deleteVideo = payload => {
  return { type: types.DELETED_VIDEO, payload: payload };
};

export const unknownAction = payload => {
  return { type: types.UNKNOWN_ACTION, payload: payload };
};
