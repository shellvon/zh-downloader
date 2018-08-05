import * as types from './mutation-types';

export const addOrUpdateVideo = ({ commit }, payload) => {
  commit(types.ADD_OR_UPDATE_VIDEO, payload);
};

export const deleteVideo = ({ commit }, payload) => {
  commit(types.DELETE_VIDEO, payload);
};
