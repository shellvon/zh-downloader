<template>
  <div class="container" v-on:scroll.passive="handleScroll" :style="{height: '280px', overflow: 'scroll'}">
    <el-row>
      <template v-if="recommendList.length===0">
        <div v-loading="isLoading" element-loading-text="努力加载中...">
          <p class="error-message nothing">\_(ツ)_/¯</p>
          <p class="error-message">暂时没有推荐视频哦
            <el-button type="text" class="el-icon-refresh" @click="loadMore"></el-button>
          </p>
        </div>
      </template>
      <template v-else>
        <el-col :span="11" v-for="(item, index) in recommendList" :key="index" :offset="index % 2" :style="{'min-height':'300px'}">
          <el-card :body-style="{padding: '5px'}" shadow="hover">
            <div class="origin_type">
              {{item.brief.type === 'answer' ? '答' : '文'}}
            </div>
            <img :src="item.banner.image_url" class="thumbail">
            <div style="padding: 14px;">
              <div class="title-info">
                <a :href="item.origin_url" target="_blank" class="link title"> {{item.object.title}}</a>
              </div>
              <div class="bottom">
                <div class="author-info">
                  <img :src="item.actor.avatar_url" class="author-avatar">
                  <a :href="item.actor.url" class="link author" target="_blank">{{item.actor.name}}</a>
                </div>
                <div class="operation-btn-group">
                  <el-button type="danger" icon="el-icon-minus" size="mini" circle @click="deleteVideo({index:index})"></el-button>
                  <el-button type="primary" icon="el-icon-plus" size="mini" circle @click="collectVideo({index:index, videoId:item.banner.video.video_id})"></el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="23" class="strike">
          <span v-if="isLoading">拼命加载中
            <i class="el-icon-loading"></i>
          </span>
          <span v-else-if="isEnd">哦豁 \_(ツ)_/¯ 没了...</span>
        </el-col>
        <el-button :style="{'display': showTopButton ? 'block': 'none'}" id="to-top" type="success" icon="el-icon-arrow-up" circle
          @click="toTop"></el-button>
      </template>
    </el-row>

  </div>
</template>

<script>
export default {
  name: 'Recommend',
  data() {
    return {
      showTopButton: false,
      isLoading: true,
      isEnd: false,
      // offset=1是为了跳过首页的banners,因为一个元素结构和其他不一样,会导致DOM失败, count没什么用
      videoAPI: 'https://api.zhihu.com/topstory/selected_videos?action=down&count=10&offset=1',
      timer: +new Date(),
      recommendList: [],
    };
  },
  created() {
    this.loadMore();
  },
  watch: {
    recommendList(newVal, oldVal) {
      if (newVal.length <= 2) {
        this.isEnd || this.loadMore();
      }
    },
  },
  methods: {
    deleteVideo({ index }) {
      this.recommendList.splice(index, 1);
    },
    collectVideo({ index, videoId }) {
      this.$emit('collect', videoId);
      this.deleteVideo({
        index,
      });
      this.$message({
        showClose: true,
        message: '已加入采集队列,请前往<视频>栏查看',
        type: 'info',
      });
    },
    // Copied from: https://gist.github.com/andjosh/6764939
    easeInOutQuad(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    },

    toTop() {
      let start = this.$el.scrollTop;
      let to = 0;
      let change = to - start;
      let currentTime = 0;
      let increment = 20;
      let duration = 1000;
      let self = this;
      let animateScroll = () => {
        currentTime += increment;
        let val = self.easeInOutQuad(currentTime, start, change, duration);
        this.$el.scrollTop = val;
        if (currentTime < duration) {
          setTimeout(animateScroll, increment);
        }
      };
      animateScroll();
    },

    handleScroll() {
      let now = +new Date();
      // 如果在2s内且API返回结束那么不再执行任何操作
      if (now - this.timer < 2000 && this.isEnd) {
        return;
      }

      this.timer = now;
      let scrollTop = this.$el.scrollTop;
      let scrollHeight = this.$el.scrollHeight;
      let clientHeight = this.$el.clientHeight;
      this.showTopButton = scrollTop > 40;

      // 判断是否到底部
      if (scrollTop + clientHeight + 10 >= scrollHeight) {
        if (this.isEnd) {
          this.$message({
            showClose: true,
            message: '没有更多数据啦',
            type: 'warning',
          });
        } else {
          this.loadMore();
        }
      }
    },

    loadMore() {
      let self = this;
      this.isLoading = true;
      fetch(this.videoAPI, {
        credentials: 'include',
      })
        .then(resp => resp.json())
        .then(resp => {
          let data = resp.data.map(el => {
            let brief = JSON.parse(el.brief);
            el.brief = brief;
            let originURL = 'javascript:void(0)';
            switch (brief.type) {
              case 'article':
                originURL = `https://zhuanlan.zhihu.com/p/${brief.id}`;
                break;
              case 'answer':
                originURL = `https://www.zhihu.com/question/${el.object.question.id}/answer/${brief.id}`;
                break;
              default:
                console.error(`unkown brief type: ${brief.type}`);
                break;
            }
            el.origin_url = originURL;
            return el;
          });
          self.recommendList = self.recommendList.concat(data);
          self.isLoading = false;
          if (resp.paging.is_end) {
            this.isEnd = true;
          } else {
            self.videoAPI = resp.paging.next;
          }
        })
        .catch(err => {
          self.isLoading = false;
          self.$message({
            showClose: true,
            message: '加载失败,请确保您已正确登录知乎!',
            type: 'error',
          });
          console.err(err.message);
        });
    },
  },
};
</script>

<style>
.strike {
  text-align: center;
  color: #409eff;
}

.strike > span {
  position: relative;
  display: inline-block;
}

.strike > span:before,
.strike > span:after {
  content: '';
  position: absolute;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #cbcbcb;
}

.strike > span:before {
  right: 100%;
  margin-right: 15px;
}

.strike > span:after {
  left: 100%;
  margin-left: 15px;
}

.nothing {
  font-size: 36px;
}

.error-message {
  text-align: center;
}

.thumbail {
  width: 280px;
  height: 156px;
  object-fit: cover;
}

.author-avatar {
  border-radius: 50%;
  width: 24px;
}

.title-info {
  margin: 10px 0px;
  position: relative;
  height: 3.6em;
  overflow: hidden;
  line-height: 1.2em;
}

.title-info:after {
  position: absolute;
  bottom: 0;
  right: 0;
  content: '';
  height: 1.2em;
  line-height: 1.2em;
  text-align: right;
  width: 30%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 50%);
}

.title {
  font-size: 1.2em;
}

.author {
  font-size: 0.8em;
  color: #8590a6 !important;
}

.author:hover {
  font-size: 0.8em;
  color: #5f6879 !important;
}

.bottom div {
  display: inline-block;
}

.author-info {
  float: left;
}

.operation-btn-group {
  float: right;
}

.operation-btn-group > button {
  margin-left: 0px !important;
}

.origin_type {
  position: absolute;
  background-color: #1296db;
  color: white;
  padding: 5px;
  border-radius: 2px;
  font-size: 1.2em;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.el-card {
  padding-bottom: 10px;
}

#to-top {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 30px;
  z-index: 99;
}
</style>
