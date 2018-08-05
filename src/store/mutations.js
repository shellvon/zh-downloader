import * as types from './mutation-types';

export default {
  [types.ADD_OR_UPDATE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => el.id === payload.id);
    index = index < 0 ? state.playlist.length : index;

    state.playlist[index] = payload;
    state.playlist = [...state.playlist];
  },

  [types.DELETE_VIDEO](state, payload) {
    let index = state.playlist.findIndex(el => {
      return el.id === payload.id;
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

  [types.ADD_OR_UPDATE_DOWNLOAD_INFO](state, { id: videoId, quality = 'hd', format = 'ts', progress = 0, link = '', name = '' }) {
    // Ugly Code.
    if (!state.downloadInfo[videoId]) {
      state.downloadInfo[videoId] = {};
    }
    if (!state.downloadInfo[videoId][quality]) {
      state.downloadInfo[videoId][quality] = {};
    }
    if (!state.downloadInfo[videoId][quality][format]) {
      state.downloadInfo[videoId][quality][format] = {};
    }
    state.downloadInfo[videoId][quality][format].progress = progress;
    if (link) {
      state.downloadInfo[videoId][quality][format].link = link;
    }
    if (name) {
      state.downloadInfo[videoId][quality][format].name = name;
    }
  },
  [types.DELETE_DOWNLOAD_INFO](state, { id: videoId }) {
    delete state.downloadInfo[videoId];
  },
};
