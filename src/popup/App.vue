<template>
  <el-tabs v-model="latestTab">
    <el-tab-pane v-for="(item, key) in showTabs" :label="item.label" :key="key" :name="item.name">
    </el-tab-pane>
    <keep-alive>
      <component :ref="currentTabCompoent.name" :is="currentTabCompoent.name" v-on="currentTabCompoent.event" v-bind="currentTabCompoent.props"></component>
    </keep-alive>
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

import { startDownloadVideo, deleteVideo, collectVideo } from '../actions';

import { version } from '../../package.json';

import { Playlist, Settings, About, Recommend, Sniffer } from '../components';

export default {
  components: {
    Playlist,
    Settings,
    About,
    Recommend,
    Sniffer,
  },
  data() {
    const qualityMap = {
      hd: '高清',
      sd: '标清',
      ld: '普清',
    };
    return {
      port: chrome.runtime.connect({
        name: PORT_NAME,
      }),
      tabs: [
        {
          label: '视频',
          name: 'playlist',
          event: {
            download: this.onStartDownloadVideo,
            delete: this.onDeletedVideo,
            copy: this.onCopyText,
          },
          props: {
            qualityMap,
          },
        },
        {
          label: '高级嗅探',
          name: 'sniffer',
          show: false,
          event: {
            copy: this.onCopyText,
            delete: this.onDeletedVideo,
          },
          props: {},
        },
        {
          label: '推荐',
          name: 'recommend',
          event: {
            collect: this.onCollectVideo,
            copy: this.onCopyText,
          },
          props: {},
        },
        {
          label: '设置',
          name: 'settings',
          event: {},
          props: {
            qualityMap,
          },
        },
        {
          label: '关于',
          name: 'about',
          event: {},
          props: {
            version,
          },
        },
      ],
    };
  },

  computed: {
    showTabs() {
      // Avoid Unexpected side effect in computed property
      let tabs = this.tabs;
      tabs[1].show = !!this.$store.getters.customSettings.advancedSniffer;
      return tabs.filter(el => {
        return el.show !== false;
      });
    },
    currentTabCompoent() {
      let self = this;
      let selectedTabIndex = this.tabs.findIndex(el => {
        return el.name === self.$store.getters.latestTab;
      });
      return self.tabs[selectedTabIndex] || self.tabs[0];
    },
    latestTab: {
      get() {
        return this.$store.getters.latestTab;
      },
      set(val) {
        this.$store.dispatch('updateLatestTab', val);
      },
    },
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
    onCopyText(text) {
      let self = this;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          self.$message({
            showClose: true,
            message: '已成功复制到粘贴板',
            type: 'success',
          });
        })
        .catch(() => {
          self.$message({
            showClose: true,
            message: '抱歉,复制失败~请尝试打开此链接Ctrl-C进行复制',
            type: 'error',
          });
        });
    },

    /**
     * 来自子组件通知删除成功的消息
     *
     * @param {object} videoInfo 视频信息.
     */
    onDeletedVideo(videoInfo) {
      this.port.postMessage(deleteVideo(videoInfo));
    },

    /**
     * 子组件通知采集视频.
     */
    onCollectVideo(videoId) {
      this.port.postMessage(
        collectVideo({
          videoId: videoId,
          preferedFormat: this.$store.getters.customSettings.format,
          preferedQuality: this.$store.getters.customSettings.quality,
        })
      );
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
