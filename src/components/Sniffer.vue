<template>
  <el-row>
    <template v-if="snifferLst.length===0">
      <p class="error-message nothing">\_(ツ)_/¯</p>
    </template>
    <template v-else>
      <el-table :data="snifferLst" style="width: 100%">
        <el-table-column prop="host" label="来源站点">
        </el-table-column>
        <el-table-column prop="host" label="预览">
          <template slot-scope="scope">
            <video width="100%" controls :src="scope.row.url" v-if="scope.row.mimetype.match(/video\//)"></video>
            <audio :style="{width: '50px'}" controls :src="scope.row.url" v-else-if="scope.row.mimetype.match(/audio\//)"></audio>
            <img class="thumbnail" :src="scope.row.url" v-else-if="scope.row.mimetype.match(/image\//)" />
            <span v-else>暂不支持此格式预览</span>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" sortable>
          <template slot-scope="scope">
            {{scope.row.size | bytesToSize}}
          </template>
        </el-table-column>
        <!-- <el-table-column prop="mimetype" label="MIME格式" sortable>
        </el-table-column> -->
        <el-table-column prop="type" label="分类" width="100" :filters="this.types" :filter-method="filterType"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-popover trigger="hover" placement="top">
              <p>请求类型: {{ scope.row.type }}</p>
              <p>MIME: {{ scope.row.mimetype }}</p>
              <p v-if="scope.row.filename">文件名: {{ scope.row.filename }}</p>
              <div slot="reference" class="name-wrapper">
                <el-tag size="medium" :type="getTypeInfo(scope.row.mimetype).cls">{{
                  getTypeInfo(scope.row.mimetype).text }}</el-tag>
              </div>
            </el-popover>
          </template>
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
  </el-row>
</template>

<script>
import { DELETE_SNIFFER_ITEM } from '../store/mutation-types';

export default {
  name: 'sniffer',
  data() {
    return {
      // snifferLst: [],
      tabId: null,
      types: [
        {
          text: '视频',
          value: '^video/',
          cls: 'primary',
        },
        {
          text: '音频',
          value: '^audio/',
          cls: 'success',
        },
        {
          text: '图片',
          value: '^image/',
          cls: 'warning',
        },
        {
          text: '其他',
          value: '^(?!(video|audio|image)/)',
          cls: 'danger',
        },
      ],
    };
  },

  methods: {
    filterType(value, row) {
      return new RegExp(value, 'i').test(row.mimetype);
    },
    getTypeInfo(mimetype) {
      for (let item of this.types) {
        if (new RegExp(item.value, 'i').test(mimetype)) {
          return item;
        }
      }
      return {
        text: '未知',
        cls: 'danger',
      };
    },
    handleDownload({ url, filename }) {
      chrome.downloads.download({
        url,
        // filename
      });
    },
    handleDelete(index) {
      this.$store.commit(DELETE_SNIFFER_ITEM, {
        tabId: this.tabId,
        index,
      });
      this.$message({
        showClose: true,
        message: ' (✌ﾟ∀ﾟ)☞ 删除成功',
        type: 'success',
      });
      // 通知父组件
      this.$emit('delete');
    },
  },
  computed: {
    snifferLst() {
      return (this.tabId && this.$store.getters.snifferObj[this.tabId]) || [];
    },
  },
  created() {
    let self = this;
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function(tabs) {
        if (!tabs || !tabs[0]) {
          return;
        }
        self.tabId = tabs[0].id;
      }
    );
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
label.el-checkbox {
  width: auto;
}

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
