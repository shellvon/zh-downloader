<template>
  <el-row>
    <template v-if="playlist.length === 0">
      <p class="error-message nothing">\_(ツ)_/¯</p>
      <p class="error-message">没有嗅探到知乎视频.</p>
    </template>
    <template v-else>
      <el-alert
        v-if="isDownloading"
        title="视频下载过程中请勿关闭本页面"
        description="若视频源不是MP4,下载为MP4可能有兼容性问题并且转换过程可能会相当耗时,请耐心等待"
        type="warning"
      >
      </el-alert>
      <el-table :data="playlist" style="width:100%">
        <el-table-column type="expand" fixed>
          <template slot-scope="props">
            <el-form label-position="left" inline class="table-expand">
              <el-form-item label="视频ID:">
                <span>
                  <el-tooltip class="item" effect="dark" content="点击可直接进入知乎播放" placement="bottom">
                    <a class="link" :href="'https://www.zhihu.com/video/' + props.row.id" target="_blank">{{ props.row.id }}</a>
                  </el-tooltip>
                </span>
              </el-form-item>
              <el-form-item label="视频名称:">
                <span>{{ props.row.name }}</span>
              </el-form-item>
              <el-form-item :label="props.row.playlist[props.row.currentQuality].m3u8 ? 'm3u8地址:' : 'mp4地址:'">
                <span>
                  <el-tooltip class="item" effect="dark" :content="props.row.playlist[props.row.currentQuality].play_url" placement="bottom">
                    <a class="link" :href="props.row.playlist[props.row.currentQuality].play_url" target="_blank">打开</a>
                  </el-tooltip>
                  <a class="link" href="javascript:void(0);" @click="$emit('copy', props.row.playlist[props.row.currentQuality].play_url)">复制</a>
                </span>
              </el-form-item>
              <el-form-item label="视频长度:">
                <span>{{ props.row.playlist[props.row.currentQuality].duration | msToTime }}</span>
              </el-form-item>
              <el-form-item label="清晰度:">
                <span>{{ qualityMap[props.row.playlist[props.row.currentQuality].quality] || '未知' }}</span>
              </el-form-item>
              <el-form-item label="视频大小:">
                <span>{{ props.row.playlist[props.row.currentQuality].size | bytesToSize }}</span>
              </el-form-item>
              <el-form-item label="分辨率:">
                <span>{{ props.row.playlist[props.row.currentQuality].width }} x {{ props.row.playlist[props.row.currentQuality].height }} </span>
              </el-form-item>
              <el-form-item label="采集时间:">
                <span>{{ new Date(props.row.updatedAt).toLocaleString() }}</span>
              </el-form-item>
            </el-form>
          </template>
        </el-table-column>
        <el-table-column label="缩略图">
          <template slot-scope="scope">
            <img class="thumbnail" :src="scope.row.thumbnail" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="视频名字"> </el-table-column>
        <el-table-column label="清晰度">
          <template slot-scope="scope">
            <el-select v-model="scope.row.currentQuality" size="small">
              <el-option v-for="(item, key) in scope.row.playlist" :key="key" :label="qualityMap[item.quality] || item.quality" :value="item.quality"> </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="视频格式">
          <template slot-scope="scope">
            <el-select v-if="scope.row.playlist[scope.row.currentQuality].m3u8" v-model="scope.row.playlist[scope.row.currentQuality].format" size="small">
              <el-option label="MPEG2-TS" value="ts"></el-option>
              <el-option label="MP4" value="mp4"></el-option>
            </el-select>
            <span v-else>MP4</span>
          </template>
        </el-table-column>
        <el-table-column label="下载进度" width="80">
          <template slot-scope="scope">
            <el-tooltip>
              <div slot="content">{{ isDownloading && progressMessage && scope.row.id === downloadingVedioId ? progressMessage : '点击右边下载按钮即会自动更新此进度' }}</div>
              <el-progress :percentage="progressValue(scope.row)" type="circle" :width="40" color="#8e71c7"></el-progress>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" content="下载" placement="bottom">
              <el-button @click="handleDownloadVideo(scope.row)" type="text" :disabled="isDownloading" icon="el-icon-download"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" content="分享" placement="bottom">
              <el-dropdown trigger="click" @command="handleCommand">
                <span class="el-dropdown-link">
                  <el-button type="text" icon="el-icon-share"></el-button>
                </span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item v-for="it in dropdownItem" :key="it.key" :command="{ command: it.key, payload: scope.row }">{{ it.text }} </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" content="删除" placement="bottom">
              <el-button @click="handleDeleteVideo(scope.row)" type="text" :disabled="isDownloading" icon="el-icon-delete"></el-button>
            </el-tooltip>
            <el-tooltip v-if="progressValue(scope.row) === 100" class="item" effect="dark" content="打开文件所在位置" placement="bottom">
              <el-button @click="handleShowFile(scope.row)" type="text" icon="el-icon-view"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        small
        @current-change="handlePageChange"
        layout="total, prev, pager, next"
        :page-size="pageSize"
        :current-page="currentPage"
        :total="total"
        :style="{ textAlign: 'right' }"
      >
      </el-pagination>
    </template>
    <qr-code-share :share-item="shareItem" :show="isDialogShow" @click="isDialogShow = false"></qr-code-share>
  </el-row>
</template>

<script>
import { ADD_OR_UPDATE_VIDEO, ADD_OR_UPDATE_DOWNLOAD_INFO } from '../store/mutation-types';

import QrCodeShare from './QrCodeShare.vue';
export default {
  name: 'Playlist',
  data() {
    return {
      isDialogShow: false,
      downloadingVedioId: 0,
      progressMessage: '',
      isDownloading: false,
      pageSize: 3,
      currentPage: 1,
      shareItem: {},
      dropdownItem: [
        {
          icon: '',
          key: 'qrcode',
          text: '二维码',
        },
        {
          key: 'link',
          text: '复制链接',
        },
        {
          key: 'weibo',
          text: '新浪微博',
        },
      ],
    };
  },
  components: {
    QrCodeShare,
  },

  props: ['qualityMap'],
  computed: {
    playlist() {
      return this.$store.getters.playlist.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    },
    total() {
      return this.$store.getters.playlist.length || 0;
    },
  },
  methods: {
    handleCommand({ command, payload }) {
      switch (command) {
        case 'qrcode':
          this.showQRCode(payload);
          break;
        case 'link':
          let text = `这个知乎视频不错, 来看看吧 《${payload.name}》 分享自 zh-downloader \nhttps://www.zhihu.com/video/${payload.id}`;
          this.$emit('copy', text);
          break;
        case 'weibo':
          let shareAPI = 'http://service.weibo.com/share/share.php';
          let title = `这个知乎视频不错, 来看看吧 《${payload.name}》 分享自 zh-downloader \nhttps://www.zhihu.com/video/${payload.id}`;
          let picture = payload.thumbnail;
          window.open(`${shareAPI}?title=${title}&pic=${picture}`, '_blank');
          break;
      }
    },

    showQRCode(videoInfo) {
      this.isDialogShow = true;
      this.shareItem = {
        bgSrc: videoInfo.thumbnail,
        text: `https://www.zhihu.com/video/${videoInfo.id}`,
      };
    },
    handlePageChange(currentPage) {
      this.currentPage = currentPage;
    },

    /**
     * 来自父组件通知的信息,当后台某个视频被采集到的消息
     *
     * @param {object} progressInfo 下载的进度信息,因下载格式不同而不同,但一定包含msg字段
     */
    onAddVideo(newVideoInfo) {
      this.$store.commit(ADD_OR_UPDATE_VIDEO, newVideoInfo);
    },

    /**
     * 来自父组件通知的信息,当后台某个视频正在下载的通知.
     *
     * @param {object} progressInfo 下载的进度信息,因下载格式不同而不同,但一定包含msg字段
     */
    onProgressUpdate(progressInfo) {
      this.progressMessage = progressInfo.msg || '';
    },

    /**
     * 来自父组件通知的信息,当后台某个视频下载结束之后通知.
     *
     * @param {object} downloadInfo 下载信息.
     */
    onFinishedDownload(downloadInfo) {
      this.isDownloading = false;
      this.progressMessage = '';
      if (downloadInfo.error) {
        this.$message({
          showClose: true,
          message: downloadInfo.error,
          type: 'error',
        });
        return;
      }
      this.$store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, downloadInfo);
      this.downloadFile(downloadInfo.link, downloadInfo.name);
    },

    /**
     * 指定文件名下载资源.
     *
     * @param {string} link     下载链接
     * @param {string} filename 下载文件名,如果不给则是当前时间结尾的mp4格式
     */
    downloadFile(link, filename = undefined) {
      var a = document.createElement('a');
      a.href = link;
      // See https://stackoverflow.com/a/33910145
      // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download
      a.download = filename || new Date().getTime() + '.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    /**
     * 获取下载的进度条数据,没找到就默认返回0.
     *
     * @param {object} videoInfo 需要查看进度的视频信息
     */
    progressValue(videoInfo) {
      // 获取下载的进度条数据,没找到就默认返回0.
      return this.$store.getters.getDownloadInfoByVideoItemInfo(this.getSelectedVideoItemInfo(videoInfo), 'progress', 0);
    },

    /**
     * 处理下载按钮事件
     *
     * @param {object} videoInfo 需要下载的视频信息
     */
    handleDownloadVideo(videoInfo) {
      this.isDownloading = true;
      this.downloadingVedioId = videoInfo.id;
      this.$emit('download', videoInfo);
    },

    /**
     * 处理删除按钮事件
     *
     * @param {object} videoInfo 需要删除的视频信息
     */
    handleDeleteVideo(videoInfo) {
      if (this.playlist.length === 1 && this.currentPage > 1) {
        this.currentPage -= 1;
      }
      this.$store.dispatch('deleteVideo', videoInfo);
      this.$message({
        showClose: true,
        message: ' (✌ﾟ∀ﾟ)☞ 删除成功',
        type: 'success',
      });
      // 通知父组件
      this.$emit('delete', videoInfo);
    },

    /**
     * 获取当前用户现在的视频信息(用于查询用户的下载信息)
     */
    getSelectedVideoItemInfo(videoInfo) {
      const selectedVideoItemInfo = {
        id: videoInfo.id,
        quality: videoInfo.currentQuality,
        format: videoInfo.playlist[videoInfo.currentQuality].format,
      };
      return selectedVideoItemInfo;
    },

    /**
     * 获取在Chrome中下载文件的下载信息
     *
     * 由于下载文件用的chrome API无法修改文件名(filename没有用), 因此下载的时候是使用a标签
     * 这是拿不到chrome需要的downloadId的，所以只能通过搜索接口取检索到downloadId,然后才能打开.
     *
     * See: https://developer.chrome.com/extensions/downloads#method-search
     * See: https://developer.chrome.com/extensions/downloads#method-show
     *
     * @param {object} videoInfo 文件信息
     */
    getChromeDownloadInfoByVideoInfo(videoInfo) {
      // 找一下当时用户的下载链接,可以通过下载链接找到chrome的downloadId.
      const link = this.$store.getters.getDownloadInfoByVideoItemInfo(this.getSelectedVideoItemInfo(videoInfo), 'link');
      if (!link) {
        return;
      }

      return new Promise((resolve, reject) => {
        chrome.downloads.search(
          {
            finalUrl: link,
          },
          downloadItems => {
            const downloadInfo = downloadItems[0] && downloadItems[0];
            resolve(downloadInfo);
          }
        );
      });
    },

    /**
     * 查看 Chrome 下载的文件所在位置(不是使用程序直接打开文件)
     * 由于download信息不是实时更新的,因此可能出现downloadInfo.exists误判的情况
     * 这时候是没有响应的
     *
     * @param {object} videoInfo
     */
    async handleShowFile(videoInfo) {
      const downloadInfo = await this.getChromeDownloadInfoByVideoInfo(videoInfo);
      console.log('Got download info:', downloadInfo);
      // 如果存在下载信息且文件还存在且没有错误,则尝试打开.
      if (downloadInfo && downloadInfo.exists && !downloadInfo.error) {
        chrome.downloads.show(downloadInfo.id);
      } else {
        this.$message({
          showClose: true,
          message: 'ಥ﹏ಥ 文件不存在,请尝试重新下载!',
          type: 'error',
        });
      }
    },
  },

  filters: {
    /**
     * 毫秒->人类友好的H:M:S格式
     *
     * @param {integer|string} s 需要格式化的时间字符串
     */
    msToTime(s) {
      // https://stackoverflow.com/questions/9763441/milliseconds-to-time-in-javascript
      var pad = (n, z = 2) => ('00' + n).slice(-z);
      return pad((s / 3.6e6) | 0) + ':' + pad(((s % 3.6e6) / 6e4) | 0) + ':' + pad(((s % 6e4) / 1000) | 0);
    },
    /**
     * 比特转化到Mb/TB
     *
     * @param {integer} bytes 需要格式化的的bytes大小
     */
    bytesToSize(bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return 'n/a';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i === 0) return bytes + ' ' + sizes[i];
      return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },
  },
};
</script>

<style>
.el-button + .el-button {
  margin-left: 1px;
}

.nothing {
  font-size: 36px;
}

.error-message {
  text-align: center;
}

.thumbnail {
  width: 128px;
  max-height: 72px;
  object-fit: cover;
  border-radius: 2px;
}

.table-expand {
  font-size: 0;
}

.table-expand label {
  width: 90px;
  color: #cbcbcb;
}

.table-expand .el-form-item {
  margin-right: 0;
  margin-bottom: 0;
  width: 50%;
}
</style>
