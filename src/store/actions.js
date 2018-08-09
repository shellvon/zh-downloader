import * as types from './mutation-types';

export const addOrUpdateVideo = ({ commit }, payload) => {
  commit(types.ADD_OR_UPDATE_VIDEO, payload);
};

export const deleteVideo = ({ commit }, payload) => {
  commit(types.DELETE_VIDEO, payload);
  commit(types.DELETE_DOWNLOAD_INFO, { id: payload.id });
};

export const updateSettings = ({ commit }, payload) => {
  commit(types.UPDATE_SETTINGS, payload);
};
