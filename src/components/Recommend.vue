<template>
  <el-row v-loading="isLoading" element-loading-text="正在加载中....">
    <template v-if="recommendList.length===0">
      <p class="error-message nothing">\_(ツ)_/¯</p>
      <p class="error-message">暂时没有推荐视频哦
        <el-button type="text" class="el-icon-refresh" @click="loadMore"></el-button>
      </p>
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
                <el-button type="danger" icon="el-icon-minus" size="mini" circle @click="deleteVideoByIndex(index)"></el-button>
                <el-button type="primary" icon="el-icon-plus" size="mini" circle @click="collectByVideoId(item.banner.video.video_id)"></el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-button :style="{'display': showTopButton ? 'block': 'none'}" id="to-top" type="success" icon="el-icon-arrow-up" circle
        @click="toTop"></el-button>
    </template>
  </el-row>
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
      recommendList: [],
    };
  },
  beforeMount() {
    window.addEventListener('scroll', this.handleScroll);
  },
  mounted() {
    this.loadMore();
  },
  destroyed() {
    window.removeEventListener('scroll');
  },
  methods: {
    deleteVideoByIndex(index) {
      this.recommendList.splice(index, 1);
    },
    // 采集视频
    collectByVideoId(videoId) {
      this.$emit('collect', videoId);
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
      let start = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
      let to = 0;
      let change = to - start;
      let currentTime = 0;
      let increment = 20;
      let duration = 1000;
      let self = this;
      let animateScroll = function() {
        currentTime += increment;
        let val = self.easeInOutQuad(currentTime, start, change, duration);
        document.documentElement.scrollTop = val;
        document.body.scrollTop = val;
        if (currentTime < duration) {
          setTimeout(animateScroll, increment);
        }
      };
      animateScroll();
    },
    handleScroll() {
      if (document.body.scrollTop > 40 || document.documentElement.scrollTop >= 40) {
        this.showTopButton = true;
      } else {
        this.showTopButton = false;
      }
      // https://stackoverflow.com/questions/9439725/javascript-how-to-detect-if-browser-window-is-scrolled-to-bottom
      const offset = document.body.offsetHeight - (window.innerHeight + window.scrollY);
      if (offset <= 50) {
        // 知乎这个神奇的接口似乎没有end的时候..
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
            message: '加载失败,请确认您已正确登录知乎!',
            type: 'error',
          });
          console.err(err.message);
        });
    },
  },
};
</script>

<style>
.nothing {
  font-size: 36px;
}

.error-message {
  text-align: center;
}

.thumbail {
  width: 280px;
}

.author-avatar {
  border-radius: 50%;
  width: 24px;
}

.title-info {
  margin: 10px 0px;
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
