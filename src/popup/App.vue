<template>
  <el-tabs v-model="activeName">
    <el-tab-pane label="视频" name="playlist">
      <playlist :quality-map="qualityMap" ref="playlist" v-on:download="onStartDownloadVideo" v-on:delete="onDeletedVideo"></playlist>
    </el-tab-pane>
    <el-tab-pane label="设置" name="settings">
      <settings :quality-map="qualityMap"></settings>
    </el-tab-pane>
    <el-tab-pane label="关于" name="about">
      <about></about>
    </el-tab-pane>
  </el-tabs>
</template>

<style>
body {
  width: 640px;
}

.link {
  text-decoration: none;
  color: #409eff;
}
</style>

<script>
import { ADD_NEW_VIDEO, UPDATE_DOWNLOAD_PROGRESS, DOWNLOAD_VIDEO_FINISHED, PORT_NAME } from '../constants';

import { startDownloadVideo, deleteVideo } from '../actions';

import Playlist from '../components/Playlist.vue';
import Settings from '../components/Settings.vue';
import About from '../components/About.vue';

export default {
  components: {
    Playlist,
    Settings,
    About,
  },
  data() {
    return {
      activeName: 'playlist',
      qualityMap: {
        hd: '高清',
        sd: '标清',
        ld: '普清',
      },
      port: chrome.runtime.connect({
        name: PORT_NAME,
      }),
    };
  },
  mounted() {
    let self = this;
    this.port.onMessage.addListener(({ type, payload }) => {
      // console.debug(`Popup.js Recieved event type: ${type} =>`, payload);
      switch (type) {
        case ADD_NEW_VIDEO:
          self.$refs.playlist.onAddVideo(payload);
          break;
        case UPDATE_DOWNLOAD_PROGRESS:
          self.$refs.playlist.onProgressUpdate(payload);
          break;
        case DOWNLOAD_VIDEO_FINISHED:
          self.$refs.playlist.onFinishedDownload(payload);
          break;
        default:
          break;
      }
      return true;
    });

    this.port.onDisconnect.addListener(() => {
      // reconnect again.
      self.port = chrome.runtime.connect({
        name: PORT_NAME,
      });
    });
  },
  methods: {
    /**
     * 来自子组件通知删除成功的消息
     *
     * @param {object} videoInfo 视频信息.
     */
    onDeletedVideo(videoInfo) {
      this.port.postMessage(deleteVideo(videoInfo));
    },

    /**
     * 来自自组件通知需要开始下载的消息
     *
     * @param {object} videoInfo 视频信息.
     */
    onStartDownloadVideo(videoInfo) {
      this.port.postMessage(startDownloadVideo(videoInfo));
    },
  },
};
</script>
