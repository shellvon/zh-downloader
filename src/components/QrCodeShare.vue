<template>
  <div v-if="show && shareItem.bgSrc && shareItem.text" class="qr-code-mask" @click="$emit('click')">
    <div class="qr-code">
      <p>{{ title }}</p>
      <vue-qr :margin="margin" :bgSrc="shareItem.bgSrc" :text="shareItem.text" :logoSrc="shareItem.logo" :size="size"> </vue-qr>
    </div>
  </div>
</template>

<script>
import VueQr from 'vue-qr';

export default {
  name: 'qr-code-share',
  props: {
    title: {
      type: String,
      default: '请扫描下方二维码进行分享',
    },
    size: {
      type: Number,
      default: 128,
    },
    margin: {
      type: Number,
      default: 5,
    },
    show: {
      type: Boolean,
      default: true,
    },
    shareItem: {
      type: Object,
      default: function() {
        return {};
      },
    },
  },
  components: {
    VueQr,
  },
};
</script>

<style>
/* See => https://tympanus.net/codrops/2013/11/07/css-overlay-techniques/ */

.qr-code-mask {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.qr-code {
  width: 300px;
  height: 200px;
  line-height: 1.2em;
  position: fixed;
  top: 50%;
  left: 50%;
  margin-top: -100px;
  margin-left: -150px;
  background-color: #fff;
  border-radius: 5px;
  text-align: center;
  z-index: 11;
}

.qr-code p {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.qr-code img {
  border-radius: 2px;
}
</style>
