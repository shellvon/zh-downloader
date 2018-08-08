import { parseM3u8File, downloadSegments } from './utils';

import * as types from './constants';

import store from './store';

import {
  downloadProgressUpdate, // 视频下载更新
  finishedDownloadVideo, // 下载完成新的视频,
  unknownAction,
} from './actions';

import { ADD_OR_UPDATE_VIDEO, ADD_OR_UPDATE_DOWNLOAD_INFO } from './store/mutation-types';

/**
 * 监听知乎视频请求.
 */
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    let videoId = details.url.replace(/^.*\/video\/(\d+)/, '$1');
    fetch(`https://lens.zhihu.com/api/videos/${videoId}`)
      .then(resp => resp.json())
      .then(async function(resp) {
        let videoName = resp.title || '未命名';
        let playlist = resp.playlist;
        let parsedPlaylist = {};
        let customSettings = store.getters.customSettings;
        let preferedFormat = customSettings.format || types.DEFAULT_VIDEO_FORMAT;
        let preferedQuality = customSettings.quality || types.DEFAULT_VIDEO_QUALITY;

        for (var quality in playlist) {
          var m3u8 = playlist[quality].play_url;
          var manifest = await parseM3u8File(m3u8);
          var videoItem = {
            id: resp.id,
            quality: quality,
            duration: manifest.segments.reduce((a, b) => a + b.duration, 0) * 1000, // second -> ms
            m3u8: m3u8,
            baseUri: m3u8.replace(/[^/]+$/i, ''),
            size: playlist[quality].size,
            name: videoName,
            manifest: manifest,
            format: preferedFormat,
            ...resp.cover_info,
          };
          parsedPlaylist[quality] = videoItem;
          // Update The download Info.
          store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, { id: resp.id, quality: quality, progress: 0, format: preferedFormat });
        }

        return {
          id: resp.id,
          name: videoName,
          thumbnail: resp.cover_info.thumbnail,
          updatedAt: new Date().getTime(),
          playlist: parsedPlaylist,
          currentQuality: preferedQuality,
        };
      })
      .then(videoInfo => {
        store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);

        chrome.browserAction.setBadgeText({ text: store.state.playlist.length + '' });
        chrome.browserAction.setBadgeBackgroundColor({ color: 'red' });
      })
      .catch(error => {
        console.error(error);
      });
    return true;
  },
  {
    urls: ['https://v.vzuu.com/video/*'],
  },
  []
);

let globalPort;

// 处理来自Popup的消息
chrome.extension.onConnect.addListener(function(port) {
  if (port.name !== types.PORT_NAME) {
    return;
  }
  console.debug('Connection onconnect...');
  globalPort = port;
  globalPort.onMessage.addListener(function({ type, payload }) {
    console.debug(`Background.js received event type: ${type}`);

    const safeSendResponse = message => {
      if (globalPort) {
        globalPort.postMessage(message);
      } else {
        chrome.runtime.sendMessage(message);
      }
    };

    switch (type) {
      // 下载视频
      case types.DOWNLOAD_VIDEO_START:
        let videoInfo = payload;
        let quality = videoInfo.currentQuality; // 选择下载的清晰度
        let selectVideoItem = videoInfo.playlist[quality];
        let segments = selectVideoItem.manifest.segments; // 对应清晰度的视频分片数据.
        let format = selectVideoItem.format || types.DEFAULT_VIDEO_FORMAT; // 下载格式.
        let converter = store.getters.customSettings.converter || types.DEFAULT_VIDEO_CONVERTER; // 默认的转化器
        let start = 0;
        let total = segments.length;

        // 初始化下载信息.
        let downloadInfo = {
          id: videoInfo.id,
          quality: quality,
          progress: start,
          format: format,
          name: videoInfo.name + '-' + quality.toUpperCase() + '.' + format,
        };
        store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, downloadInfo);

        downloadSegments(
          selectVideoItem.baseUri,
          segments,
          format,
          ({ type, payload }) => {
            console.debug(`ProgressCallback : ${type} => `, payload);
            let msg = payload.msg;
            switch (type) {
              // 正在下载中....
              case types.DOWNLOAD_VIDEO_INPROGRESS:
                start += 1;
                let percent = parseInt((start * 100) / total);
                // 不让它变成100,因为有可能转化需要一定时间
                downloadInfo.progress = percent >= 100 ? 99.99 : percent;
                store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, downloadInfo);
                msg = `下载分片数据中(${start}/${total})...请耐心等待`;
                break;
              // 开始合并数据了...
              case types.DOWNLOAD_VIDEO_MERGING:
                break;
              // ....
            }
            // 通知前端刷新
            safeSendResponse(downloadProgressUpdate({ msg }));
          },
          converter
        )
          .then(data => {
            downloadInfo.link = data.downloadLink;
            downloadInfo.progress = 100;
            console.debug(`Download ${downloadInfo['name']} finished`, data);
            safeSendResponse(finishedDownloadVideo(downloadInfo));
          })
          .catch(err => {
            downloadInfo.error = err.message;
            safeSendResponse(finishedDownloadVideo(downloadInfo));
          });
        break;

      // 删除视频,更新一下当前的Badge
      case types.DELETED_VIDEO:
        chrome.browserAction.setBadgeText({
          text: '' + (store.state.playlist.length || ''),
        });
        break;

      default:
        safeSendResponse(unknownAction(payload));
        break;
    }

    return true;
  });

  globalPort.onDisconnect.addListener(() => {
    console.debug('Connection disconnect...');
    globalPort = null;
  });
});
