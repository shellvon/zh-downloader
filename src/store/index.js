import Vue from 'vue';
import Vuex from 'vuex';

import * as getters from './getters';
import mutations from './mutations';
import * as actions from './actions';
import { DEFAULT_VIDEO_CONVERTER, DEFAULT_VIDEO_FORMAT, DEFAULT_VIDEO_QUALITY, DEFAULT_EXPIRED_AT, DEFAULT_CHECK_INTERNAL, DEFAULT_ADVANCED_SNIFFER_CONFIG } from '../constants';
import VuexWebExtensions from 'vuex-webextensions';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    customSettings: {
      quality: DEFAULT_VIDEO_QUALITY,
      converter: DEFAULT_VIDEO_CONVERTER,
      format: DEFAULT_VIDEO_FORMAT,
      expiredAt: DEFAULT_EXPIRED_AT,
      checkInternal: DEFAULT_CHECK_INTERNAL,
      advancedSniffer: false, // 高级嗅探
      advancedSnifferConfig: DEFAULT_ADVANCED_SNIFFER_CONFIG,
    },
    latestTab: 'playlist',
    playlist: [], // 视频列表
    downloadInfo: [], // 下载列表信息,
    snifferObj: {},
  },
  plugins: [new VuexWebExtensions({ persistentStates: ['playlist', 'latestTab', 'downloadInfo', 'customSettings'] })],
  getters,
  mutations,
  actions,
});
