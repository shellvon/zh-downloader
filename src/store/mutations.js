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
    let downloadInfo = Object.assign({}, state.downloadInfo);
    if (!downloadInfo[videoId]) {
      downloadInfo[videoId] = {};
    }
    if (!downloadInfo[videoId][quality]) {
      downloadInfo[videoId][quality] = {};
    }
    if (!downloadInfo[videoId][quality][format]) {
      downloadInfo[videoId][quality][format] = {};
    }
    downloadInfo[videoId][quality][format].progress = progress;
    if (link) {
      downloadInfo[videoId][quality][format].link = link;
    }
    if (name) {
      downloadInfo[videoId][quality][format].name = name;
    }
    state.downloadInfo = downloadInfo;
  },
  [types.DELETE_DOWNLOAD_INFO](state, { id: videoId }) {
    delete state.downloadInfo[videoId];
  },
};
