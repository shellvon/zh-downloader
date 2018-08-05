<template>
  <el-tabs v-model="activeName">
    <el-tab-pane label="视频" name="playlist">
      <template v-if="playlist.length === 0">
        <div>
          <p class="error-message nothing">\_(ツ)_/¯</p>
          <p class="error-message">没有嗅探到知乎视频.</p>
        </div>
      </template>
      <template v-else>
        <el-table :data="playlist" style="width:100%" max-height="300">
          <el-table-column type="expand" fixed>
            <template slot-scope="props">
              <el-form label-position="left" inline class="table-expand">
                <el-form-item label="视频ID:">
                  <span>{{ props.row.id }}</span>
                </el-form-item>
                <el-form-item label="视频名:">
                  <span>{{ props.row.name }}</span>
                </el-form-item>
                <el-form-item label="M3U8地址:">
                  <span>
                    <a class="link" :href="props.row.playlist[props.row.currentQuality].m3u8" target="_blank">点击查看</a>
                  </span>
                </el-form-item>
                <el-form-item label="视频长度:">
                  <span>{{ props.row.playlist[props.row.currentQuality].duration | msToTime}}</span>
                </el-form-item>
                <el-form-item label="清晰度:">
                  <span>{{ props.row.playlist[props.row.currentQuality].quality | qualityStr}}</span>
                </el-form-item>
                <el-form-item label="视频大小:">
                  <span>{{ props.row.playlist[props.row.currentQuality].size | bytesToSize}}</span>
                </el-form-item>
              </el-form>
            </template>
          </el-table-column>
          <el-table-column label="缩略图">
            <template slot-scope="scope">
              <img class="thumbnail" :src="scope.row.thumbnail" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="视频名字">
          </el-table-column>
          <el-table-column label="清晰度" >
            <template slot-scope="scope">
              <el-select v-model="scope.row.currentQuality" size="small">
                <el-option
                  v-for="(item, key) in scope.row.playlist"
                  :key="key"
                  :label="item.quality | qualityStr"
                  :value="item.quality">
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="视频格式" >
            <template slot-scope="scope">
              <el-select v-model="scope.row.playlist[scope.row.currentQuality].format" size="small">
                <el-option label="MPEG2-TS" value="ts"></el-option>
                <el-option label="MP4" value="mp4"></el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="下载进度" width="80">
            <template slot-scope="scope">
              <el-progress :percentage="scope.row.playlist[scope.row.currentQuality].progress" type="circle" width=40 color="#8e71c7"></el-progress>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="100">
            <template slot-scope="scope">
              <el-tooltip class="item" effect="dark" content="下载" placement="bottom">
                <el-button @click="handleDownloadVideo(scope.row)" type="text" icon="el-icon-download"></el-button>
              </el-tooltip>

              <el-tooltip class="item" effect="dark" content="删除" placement="bottom">
                <el-button @click="handleDeleteVideo(scope.row)" type="text" icon="el-icon-delete"></el-button>
              </el-tooltip>

            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-tab-pane>
    <el-tab-pane label="关于" name="about">
      <el-container>
  <el-aside width="200px">
<img src='data:image/png;base64,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'/>
  </el-aside>
  <el-main>
    <el-row class="plugin-name">知乎下载器 <span class="plugin-version"> 1.0.0 </span></el-row>
    <el-row class="description">这是一个自动嗅探知乎视频资源并且支持直接下载保存的Chrome插件, 使用方式是直接打开知乎网页, 插件会自动嗅探出对应的视频资源用于用户进行操作. </el-row>
      <el-row class="warning"><span>注意: </span>由于MP4转化相当耗时,因此不建议下载MP4!</el-row>
      <el-row class="footer">
        <el-button size="medium"><a class="link" href="https://github.com/shellvon/zh-downloader" target="_blank">项目源码</a></el-button>
        <el-button size="medium"><a class="link" href="https://github.com/shellvon" target="_blank">作者</a></el-button>
     </el-row>
  </el-main>
</el-container>
    </el-tab-pane>
  </el-tabs>
</template>


<script>
import { ADD_NEW_VIDEO, UPDATE_DOWNLOAD_PROGRESS, DOWNLOAD_VIDEO_FINISHED } from '../constants';

import { startDownloadVideo, deleteVideo } from '../actions';
import * as mutationTypes from '../store/mutation-types';

export default {
  data() {
    return {
      activeName: 'playlist',
      port: chrome.runtime.connect({
        name: 'ZH_DOWNLOADER',
      }),
    };
  },
  mounted() {
    let self = this;
    this.port.onMessage.addListener(({ type, payload }) => {
      switch (type) {
        case ADD_NEW_VIDEO:
          self.$store.commit(mutationTypes.ADD_OR_UPDATE_VIDEO, payload);
          return true;
        case UPDATE_DOWNLOAD_PROGRESS:
          // 更新下载进度.
          self.$store.commit(mutationTypes.ADD_OR_UPDATE_VIDEO, payload);
          return true;
        case DOWNLOAD_VIDEO_FINISHED:
          // 视频下载完成
          // chrome.downloads.download({
          //   url: payload.downloadLink,
          //   saveAs: true,
          //   filename: (payload.name || new Date().getTime() )+ '.mp4',
          // });
          self.$store.commit(mutationTypes.ADD_OR_UPDATE_VIDEO, payload);

          let filename = self.getFileName(payload);

          self.downloadFile(payload.playlist[payload.currentQuality].downloadLink, filename);

          return true;
        default:
          console.log('Unsupported message type.', type);
          break;
      }
    });
    this.port.onDisconnect.addListener(() => {
      // reconnect again.
      self.port = chrome.runtime.connect({
        name: 'ZH_DOWNLOADER',
      });
    });
  },
  methods: {
    getFileName(videoInfo) {
      let choosedQuality = videoInfo.currentQuality;
      let choosedVideoItem = videoInfo.playlist[choosedQuality];
      let filename = videoInfo.name + '-' + videoInfo.currentQuality.toUpperCase() + '.' + choosedVideoItem.format;
      return filename;
    },

    downloadFile(link, filename = undefined) {
      var a = document.createElement('a');
      (a.href = link), (a.download = filename || new Date().getTime() + '.mp4');
      a.click();
    },
    handleDownloadVideo(videoInfo) {
      let choosedQuality = videoInfo.currentQuality;
      let choosedVideoItem = videoInfo.playlist[choosedQuality];
      // if (choosedVideoItem.downloadLink) {
      //   let filename = this.getFileName(videoInfo)
      //   this.downloadFile(link, filename)
      //   return;
      // }
      // chrome.runtime.sendMessage()

      this.port.postMessage(startDownloadVideo(videoInfo));
    },
    handleDeleteVideo(videoInfo) {
      this.$store.dispatch('deleteVideo', videoInfo);
      this.$message({
        showClose: true,
        message: '删除成功',
        type: 'success',
      });
      this.port.postMessage(deleteVideo(videoInfo));
    },

    handleStep(progress) {
      return progress === 0 ? 0 : progress == 100 ? 2 : 1;
    },

    bytesToSize(row, column) {
      // from http://scratch99.com/web-development/javascript/convert-bytes-to-mb-kb/
      var bytes = row.size || row;
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0) return 'n/a';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i == 0) return bytes + ' ' + sizes[i];
      return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },

    progressToStatus(row, column) {
      var progress = row.progress;
      return progress == 0 ? '待下载' : progress == 100 ? '已下载' : '下载中';
    },

    qualityStr(row, column) {
      let qualityMap = {
        sd: '标清',
        hd: '高清',
        ld: '普清',
      };
      return qualityMap[row.quality] || '标清';
    },
  },

  filters: {
    qualityStr(value) {
      let qualityMap = {
        sd: '标清',
        hd: '高清',
        ld: '普清',
      };
      return qualityMap[value] || '标清';
    },
    msToTime(s) {
      // https://stackoverflow.com/questions/9763441/milliseconds-to-time-in-javascript
      var pad = (n, z = 2) => ('00' + n).slice(-z);
      return pad((s / 3.6e6) | 0) + ':' + pad(((s % 3.6e6) / 6e4) | 0) + ':' + pad(((s % 6e4) / 1000) | 0);
    },
    bytesToSize(bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0) return 'n/a';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i == 0) return bytes + ' ' + sizes[i];
      return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },
  },
  computed: {
    playlist() {
      return this.$store.state.playlist;
    },
  },
  created() {},
};
</script>
