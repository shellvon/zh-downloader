<template>
    <el-container>
        <el-main>
            <el-form label-position='left'>
                <el-form-item label="偏爱的视频格式:">
                    <el-select placeholder="请选择你偏好的视频格式" @change="onChange('format', $event)" :value="customSettings.format">
                        <el-option label="MPEG2-TS" value="ts"></el-option>
                        <el-option label="MP4" value="mp4">
                            <span style="float: left">MP4</span>
                            <span :style="{paddingLeft: '13px', float: 'right', color: 'red', fontSize: '12px'}">
                                MP4格式可能存在兼容性问题,请慎用</span>
                        </el-option>
                    </el-select>
                    <el-tooltip class="item" effect="dark" content="采集到的视频将优先为你展示此格式" placement="top-start">
                        <i class="el-icon-question"></i>
                    </el-tooltip>
                </el-form-item>
                <el-form-item label="偏爱的MP4转化器:">
                    <el-select placeholder="请选择你MP4转化器" @change="onChange('converter', $event)" :value="customSettings.converter">
                        <el-option label="mux.js" value="mux.js">
                            <span style="float: left">mux.js</span>
                            <span :style="{paddingLeft: '13px', float: 'right', color: 'red', fontSize: '12px'}">转化后长宽正确,时间不正确</span>
                        </el-option>
                        <el-option label="mpegts-to-mp4" value="mpegts-to-mp4">
                            <span style="float: left">mpegts-to-mp4 魔改版</span>
                            <span :style="{paddingLeft: '13px', float: 'right', color: 'red', fontSize: '12px'}">转换速度较慢</span>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="偏爱的清晰度:">
                    <el-select placeholder="请选择你偏好的清晰度" @change="onChange('quality', $event)" :value="customSettings.quality">
                        <el-option v-for="(item, key) in qualityMap" :key="key" :label="item" :value="key"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="视频过期时间:">
                    <el-input-number controls-position="right" :value="customSettings.expiredAt" @change="onChange('expiredAt', $event)"
                        :min="5" :max="240"></el-input-number>
                    <el-tooltip class="item" effect="dark" content="单位为分钟,从采集时间算起,超过这个时间的数据将会被删除(真正删除可能有一定延迟)"
                        placement="top-start">
                        <i class="el-icon-question"></i>
                    </el-tooltip>
                </el-form-item>
                <el-form-item label="高级嗅探:">
                    <el-switch v-model="advancedSniffer" :width="50">
                    </el-switch>
                    <el-tooltip class="item" effect="dark" content="开启此模式之后您可以嗅探其他网站的多媒体资源(视频/音频/图片)" placement="top-start">
                        <i class="el-icon-question"></i>
                    </el-tooltip>
                </el-form-item>
                <template v-if="advancedSniffer">
                    <el-form-item label="嗅探配置(JSON):" >
                        <el-input type="textarea" placeholder="请输入高级嗅探配置" :value="customSettings.advancedSnifferConfig | toJSONStr" @change="onChange('advancedSnifferConfig', $event)"></el-input>
                        <el-tooltip class="item" effect="dark" content="点击查看配置说明,留空则为默认配置" placement="top-start">
                            <i class="el-icon-question exclude-icon" @click="handleClickHelp('https://github.com/shellvon/zh-downloader/wiki/%E9%85%8D%E7%BD%AE%E8%AF%B4%E6%98%8E')"></i>
                        </el-tooltip>
                    </el-form-item>
                </template>
            </el-form>
        </el-main>
    </el-container>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'Settings',
  props: ['qualityMap'],
  filters: {
    toJSONStr(value) {
      return JSON.stringify(value, null, 4);
    },
  },
  methods: {
    onChange(key, value) {
      // 高级嗅探配置特殊处理
      if (key === 'advancedSnifferConfig') {
        try {
          value = JSON.parse(value);
        } catch (error) {
          return;
        }
      }
      this.$store.dispatch('updateSettings', {
        [key]: value,
      });
    },
    handleClickHelp(url) {
      window.open(url, '_blank');
    },
  },
  computed: {
    ...mapGetters(['customSettings']),
    advancedSniffer: {
      get() {
        return this.$store.getters.customSettings.advancedSniffer;
      },
      set(newValue) {
        this.$store.dispatch('updateSettings', {
          advancedSniffer: !!newValue,
        });
      },
    },
  },
};
</script>

<style>
label {
  width: 150px;
  text-align: right;
}

.el-textarea {
  width: 50%;
}
.el-icon-question {
  cursor: pointer;
}

textarea {
  min-height: 120px;
}

.exclude-icon {
  color: #2997ff;
  position: absolute;
  top: 50%;
  margin-top: -6px;
  margin-left: 3px;
}
</style>
