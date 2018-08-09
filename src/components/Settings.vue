<template>
    <el-container>
        <el-main>
            <el-form label-position='left'>
                <el-form-item label="偏爱的视频格式:">
                    <el-select placeholder="请选择你偏好的视频格式" @change="onChange('format', $event)" :value="customSettings.format">
                        <el-option label="MPEG2-TS" value="ts"></el-option>
                        <el-option label="MP4" value="mp4"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="偏爱的MP4转化器:">
                    <el-select placeholder="请选择你MP4转化器" @change="onChange('converter', $event)" :value="customSettings.converter">
                        <el-option label="mux.js" value="mux.js">
                            <span style="float: left">mux.js</span>
                            <span style="float: right; color: red; font-size: 12px">转化后长宽正确,时间不正确</span>
                        </el-option>
                        <el-option label="mpegts-to-mp4" value="mpegts-to-mp4">
                            <span style="float: left">mpegts-to-mp4</span>
                            <span style="float: right; color: red; font-size: 12px">转化后时间正确,长度不正确</span>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="偏爱的清晰度:">
                    <el-select placeholder="请选择你偏好的清晰度" @change="onChange('quality', $event)" :value="customSettings.quality">
                        <el-option v-for="(item, key) in qualityMap" :key="key" :label="item" :value="key"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
        </el-main>
    </el-container>
</template>

<script>
import { mapGetters } from 'vuex';
import { UPDATE_SETTINGS } from '../store/mutation-types';

export default {
  name: 'Settings',
  props: ['qualityMap'],
  methods: {
    onChange(key, value) {
      this.$store.commit(UPDATE_SETTINGS, {
        [key]: value,
      });
    },
  },
  computed: {
    ...mapGetters(['customSettings']),
  },
};
</script>

<style>
</style>
