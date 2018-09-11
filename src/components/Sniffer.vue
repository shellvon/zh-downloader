<template>
    <el-table :data="snifferLst" style="width: 100%">
        <el-table-column prop="host" label="来源站点">
        </el-table-column>
        <el-table-column prop="host" label="预览">
            <template slot-scope="scope">
                <video width="100%" controls :src="scope.row.url" v-if="scope.row.mimetype.match(/video/)"></video>
                <audio :style="{width: '50px'}" controls :src="scope.row.url" v-else-if="scope.row.mimetype.match(/audio/)"></audio>
                <img class="thumbnail" :src="scope.row.url" v-else-if="scope.row.mimetype.match(/image/)"/>
                <span v-else>暂不支持此格式预览</span>
            </template>
        </el-table-column>
        <el-table-column prop="size" label="大小">
            <template slot-scope="scope">
                {{scope.row.size | bytesToSize}}
            </template>
        </el-table-column>
        <el-table-column prop="mimetype" label="MIME格式">
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
            <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" content="下载" placement="bottom">
                    <el-button @click="handleDownload(scope.row)" type="text" icon="el-icon-download"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" content="复制链接" placement="bottom">
                    <el-button @click="$emit('copy', scope.row.url);" type="text" icon="el-icon-tickets"></el-button>
                </el-tooltip>
                 <el-tooltip class="item" effect="dark" content="删除" placement="bottom">
                    <el-button @click="handleDelete(scope.$index)" type="text" icon="el-icon-delete"></el-button>
                </el-tooltip>
            </template>
        </el-table-column>

    </el-table>
</template>

<script>
export default {
  name: 'sniffer',
  data() {
    return {
      snifferLst: [],
      tabId: -1,
    };
  },

  methods: {
    handleDownload({ url, filename }) {
      chrome.downloads.download({
        url,
        // filename
      });
    },
    handleDelete(index) {
      this.snifferLst.splice(index, 1);
      this.$message({
        showClose: true,
        message: ' (✌ﾟ∀ﾟ)☞ 删除成功',
        type: 'success',
      });
      // 通知父组件
      this.$emit('delete');
    },
  },
  created() {
    let self = this;
    let snifferObj = chrome.extension.getBackgroundPage().snifferObj || {};
    chrome.windows.getCurrent(wnd => {
      chrome.tabs.getSelected(wnd.id, tab => {
        self.snifferLst = (snifferObj[tab.id] || []).reverse();
        self.tabId = tab.id;
      });
    });
  },
  filters: {
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
div#tab-sniffer:after {
  color: red;
  content: 'beta';
  height: 30px;
  margin-top: -8px;
  padding: 0 2px;
  position: absolute;
  text-align: center;
  font-size: 11px;
  border-radius: 10px;
}
.thumbnail {
  width: 128px;
  max-height: 72px;
  object-fit: cover;
  border-radius: 2px;
}
</style>
