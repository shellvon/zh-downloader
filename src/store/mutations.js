import * as types from './mutation-types';

export default {
  [types.ADD_OR_UPDATE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => el.id == payload.id);
    index = index < 0 ? state.playlist.length : index;

    state.playlist[index] = payload;
    state.playlist = [...state.playlist];
  },

  [types.DELETE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => {
      return el.id == payload.id;
    });
    if (index > -1) {
      state.playlist.splice(index, 1);
    }
  },
  [types.UPDATE_VIDEO_BY_INDEX](state, index, payload) {
    if (index >= 0 && index < state.playlist.length) {
      state.playlist[index] = payload;
      state.playlist = [...state.playlist];
    }
  },
};
