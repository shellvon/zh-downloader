# Zh-Downloader

这是Chrome插件, 能进行知乎视频嗅探以及下载功能。支持下载为TS格式( MPEG2-TS 格式) 或者 MP4 格式。


[![Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png)](https://chrome.google.com/webstore/detail/zh-downloader/gcknejnpflbcggigdinhahgngfhaomik?utm_source=chrome-ntp-icon)


[点击查看 GIF 动图](http://wx1.sinaimg.cn/large/9d8084a3gy1fu78jp21s4g20yl0hy4qz.gif)

# 使用说明

下载本代码之后执行 `npm install && npm run build` 之后在 `chrome://extensions/` 中选择"加载已解压的扩展程序" 选择 `dist` 目录即可。

或者你可以选择已经打包好的CRX/ZIP格式插件(1.0.3开始不再提供CRX,参见 [#6](https://github.com/shellvon/zh-downloader/issues/6) ),可以前往这里下载:[https://github.com/shellvon/zh-downloader/releases/](https://github.com/shellvon/zh-downloader/releases/)

# 功能特色

+ 所有知乎视频自动采集和嗅探,无需用户干预(Badge上实时显示已采集的视频数量))
+ 视频信息(ID/视频原地址/封面图/大小/时长/名称/格式)等多规格一览无余,支持复制地址至其他平台下载
+ 多清晰度/多种格式提供下载
+ 支持自定义偏好设置,比如您可以自己设置用于转化MP4的转化器是什么,偏爱的默认格式是什么
+ 实时友好展示下载/转化进度
+ 自动清理超过一定历史的视频文件
+ 可使用二维码分享视频
+ UI 不算太差
+ 纯前端Javascript实现
+ 最新采集的永远放在最前面
+ 自动重试机制(默认3次,每次重试间隔时间为5秒)
+ 精选视频推荐
+ 我编不下去了...


# 技术

本次计划使用 Vue，因此选择了 [Kocal/vue-web-extension](https://github.com/Kocal/vue-web-extension) 模版

+ [Vue2.0](https://vuejs.org/)
+ [Element](http://element.eleme.io/#/zh-CN)
+ [m3u8-parser](https://github.com/videojs/m3u8-parser)
+ [mpegts_to_mp4 魔改版](https://github.com/shellvon/mpegts)
+ [mux.js](https://github.com/videojs/mux.js)
+ [vuex-webextensions](https://github.com/MitsuhaKitsune/vuex-webextensions)

# 原理解释

本插件主要由 Popup Script 以及 Background Script 合作完成，参见:[Understanding Google Chrome Extensions](https://gist.github.com/jjperezaguinaga/4243341)

大体步骤:

-  使用 [chrome.webRequest.onBeforeRequest](https://developer.chrome.com/webRequest) 监听所有知乎发起的视频请求，根据简单抓包可以看到知乎当有视频的时候会向这个地址:[https://v.vzuu.com/video/ZHIHU_VIDEO_ID](https://v.vzuu.com/video) 发起请求，其中`ZHIHU_VIDEO_ID`即为知乎视频ID. 之后利用知乎 API: https://lens.zhihu.com/api/videos/ZHIHU_VIDEO_ID 找到视频的 m3u8 地址。

- 利用 [M3U8-Parser](https://github.com/videojs/m3u8-parser) 解析上述 API 返回的数据，并提交数据至 Popup 页面进行查看。

- 提交数据利用了 Vue 的 Store 状态管理，由于 Popup 生命周期的原因，因此将 Store 也存入了 [chrome.storage](https://developer.chrome.com/apps/storage) 进行持久化, 插件是 `vuex-webextensions`。

- Popup(前端)接受用户下载请求，利用 `chrome.runtime.connect` 连接 Port 与 Background.js (后端)进行双向通讯，通知其下载请求。

- Background.js 遍历所有 TS 数据包并将起合并为一个 TS 包，如果发现下载的是 mp4 格式，则利用 `mpegts_to_mp4` 或则 `mux.js` 进行数据转化。

- 利用 Port 实时通知 Popup 页的下载进度以及下载结果。

> ⚠️ 注意:  MP4 尝试了`mpegts_to_mp4`, `mux.js`, `videoconverter.js` 效果均不是很理想。因此不建议下载MP4。

1. mpegts_to_mp4: ~~读取 SPS 信息的时候宽度/高度信息错误~~ (调研发现是没有去掉 [Emulation Prevention Bytes](http://blog.51cto.com/danielllf/1758115). 目前已经修复))
2. mux.js 能正常读取宽/高，但是无法正常解析Duration(See [videojs/mux.js#210](https://github.com/videojs/mux.js/issues/210))，另一个有趣的问题是部分知乎用户的视频没有音频，因此不会触发 mux.js 的 `data` 事件(See [videojs/mux.js#194](https://github.com/videojs/mux.js/issues/194))，因此需要分开处理音频/视频。
3. videoconverter.js  Node 直接就爆内存错误

# 限制

1. 下载过程中不能关闭 Popup 页，否则后端无法与之通信然后通知下载结果
2. 不知道视频链接过期时间, 因此下载过程中会出现403，这时候可以点击ID进入知乎将自动刷新
3. 转化的MP4格式宽高不正确，因此普通视频播放器可能难以播放, 请尝试用 `mplayer` 播放。 或者下载 TS 之后用 `ffmpeg` 或者 [https://cloudconvert.com/](https://cloudconvert.com/) 在线转换

# TODO: 

- [x] 用户可自定义设置
- [x] 已下载视频增加打开功能
- [x] 自动删除采集超过一定时间的视频(时间/策略?)
- [ ] 用户忽略某些条件的视频采集(如大小/清晰度/作者/视频名)?
- [x] ~~直接搜索知乎视频(不知道有API没有)~~ 知乎推荐视频(无法搜索)
- [x] 修复导出 MP4 格式的问题,无论是 `mux.js` 还是 `mpegts_to_mp4`，任一即可
- [x] 发布至 Google Chrome 商店[Install from Google Chrome Store](https://chrome.google.com/webstore/detail/zh-downloader/gcknejnpflbcggigdinhahgngfhaomik?utm_source=chrome-ntp-icon)

# Change Logs:

#### 2018-08-22
 - [A] 发布 1.0.7
 - [U] 分享功能优化,支持二维码/链接🔗/新浪微博 [9d485b6b](https://github.com/shellvon/zh-downloader/commit/9d485b6bd2b45dda4be8ff702d9c9740e5de3dff)

#### 2018-08-22
 - [A] 发布 1.0.6
 - [A] 增加二维码分享功能 [d00d008c](https://github.com/shellvon/zh-downloader/commit/d00d008c1af0b4752f03f7eee21d8067a3795ece)
 - [U] 优化推荐功能 [#9](https://github.com/shellvon/zh-downloader/issues/9)

#### 2018-08-21
 - [A] 发布1.0.5版本
 - [U] 视频列表从滚动改为分页,提高响应速度 [#7](https://github.com/shellvon/zh-downloader/issues/7)
 - [U] 优化推荐页界面,统一卡片 [#8](https://github.com/shellvon/zh-downloader/issues/8)

#### 2018-08-16
 - [F] 修复下载MP4时提示不支持MP4格式的BUG [#5](https://github.com/shellvon/zh-downloader/issues/5)
 - [U] 发布仅提供ZIP格式, 参见 [#6](https://github.com/shellvon/zh-downloader/issues/6)

#### 2018-08-14
 - [A] 发布1.0.3至Chrome商店
 - [F] 修复  `mpegts_to_mp4` 导出时长宽数据不对 [#4](https://github.com/shellvon/zh-downloader/issues/4)
 - [U] 优化Components的export机制

#### 2018-08-13
 - [F] 优化版本号展示 [#3](https://github.com/shellvon/zh-downloader/issues/3)
 - [F] 更新 [MitsuhaKitsune/vuex-webextensions](https://github.com/MitsuhaKitsune/vuex-webextensions), See [MitsuhaKitsune/vuex-webextensions#7](https://github.com/MitsuhaKitsune/vuex-webextensions/issues/7)
 - [F] 未登录知乎时异常 [#2](https://github.com/shellvon/zh-downloader/issues/2)
 - [U] 调整部分文案,增加商店评价链接, 发布 1.0.2
 - [U] 发布版本 1.0.1
 - [U] 性能优化: 切换为动态组件 [#1](https://github.com/shellvon/zh-downloader/issues/1)

#### 2018-08-12
 - [A] 增加推荐视频,支持从将推荐视频加入采集队列 [aa068288](https://github.com/shellvon/zh-downloader/commit/aa068288446e57ce0c749ae9d6fb4a634cf00d9e)

#### 2018-08-11
 - [A] 增加M3u8复制功能以及查看采集时间/分辨率功能 [01479b38](https://github.com/shellvon/zh-downloader/commit/01479b3841908e97d08d74479a0fa6bf5e572663)
 - [U] 调整UI宽度为640px [01479b38](https://github.com/shellvon/zh-downloader/commit/01479b3841908e97d08d74479a0fa6bf5e572663)

#### 2018-08-10
 - [A] 自动删除采集超过一定时间的视频,用户可在设置页面自行设置 [dd39c90b](https://github.com/shellvon/zh-downloader/commit/dd39c90b235866b10999c494febced3a1ddee5dc)
 - [U] 优化下载信息的存储结构,进一步提供代码可读性 [65993b5a](https://github.com/shellvon/zh-downloader/commit/65993b5a1eaeb38bce1a2b5cd0f6a536c3f5db6c)
 - [U] 更新文档,增加 ChangeLogs 栏

#### 2018-08-09
 - [A] 增加查看已下载视频功能 [b9753a95](https://github.com/shellvon/zh-downloader/commit/b9753a9536b89e6b331c05f3dc3766d3619281ab)
 - [U] 重构拆分组件/CSS以及发布CRX

#### 2018-08-08
 - [A] 增加设置面板,可自行设置偏好的格式/清晰度 [f1851b5c](https://github.com/shellvon/zh-downloader/commit/f1851b5c3c42437f55858c16661395dff585112e)
 - [U] 下载详细进度,修改代码风格 [f1851b5c](https://github.com/shellvon/zh-downloader/commit/f1851b5c3c42437f55858c16661395dff585112e)

#### 2018-08-07
 - [A] 视频按照采集时间排序 [688afd0e](https://github.com/shellvon/zh-downloader/commit/688afd0e0b5ff39ca4e34f03c11a899944fd2332)
 - [F] 修改文档错别字 [22d0bc8a](https://github.com/shellvon/zh-downloader/commit/22d0bc8a06167391e571b3ce39a02ee62d04078e)


#### 2018-08-06
 - [A] 增加下载时文案提示 [c5bfc568](https://github.com/shellvon/zh-downloader/commit/c5bfc568d308701cf36ca4c0a01f5ad46c9b0c12)
 - [F] 修复`mpegts_to_mp4`不存在以及进度条不更新的BUG [c5bfc568](https://github.com/shellvon/zh-downloader/commit/c5bfc568d308701cf36ca4c0a01f5ad46c9b0c12)
 - [U] 更新文档

#### 2018-08-05
 - [A] 初版代码发布,支持采集视频和下载视频 [3b99a2d7](https://github.com/shellvon/zh-downloader/commit/3b99a2d7d8fef4dc6ea26a432ebbc960ae36aa95)
