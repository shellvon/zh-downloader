import Vue from 'vue';
import Vuex from 'vuex';

import * as getters from './getters';
import mutations from './mutations';
import * as actions from './actions';
import { DEFAULT_VIDEO_CONVERTER, DEFAULT_VIDEO_FORMAT, DEFAULT_VIDEO_QUALITY } from '../constants';
import VuexWebExtensions from 'vuex-webextensions';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    customSettings: {
      quality: DEFAULT_VIDEO_QUALITY,
      converter: DEFAULT_VIDEO_CONVERTER,
      format: DEFAULT_VIDEO_FORMAT,
    },
    playlist: [], // 视频列表
    downloadInfo: [], // 下载列表信息
  },
  plugins: [new VuexWebExtensions({ persistentStates: ['playlist', 'downloadInfo', 'customSettings'] })],
  getters,
  mutations,
  actions,
});
