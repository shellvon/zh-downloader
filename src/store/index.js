import Vue from 'vue';
import Vuex from 'vuex';

import * as getters from './getters';
import mutations from './mutations';
import * as actions from './actions';

import VuexWebExtensions from 'vuex-webextensions';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    playlist: [], // 视频列表
  },
  plugins: [VuexWebExtensions({ persistentStates: ['playlist'] })],
  getters,
  mutations,
  actions,
});
