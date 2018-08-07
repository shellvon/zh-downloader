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
        let defaultFormat = types.DEFAULT_VIDEO_FORMAT;

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
            format: defaultFormat,
            ...resp.cover_info,
          };
          parsedPlaylist[quality] = videoItem;
          // Update The download Info.
          store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, { id: resp.id, quality: quality, progress: 0, format: defaultFormat });
        }

        return {
          id: resp.id,
          name: videoName,
          thumbnail: resp.cover_info.thumbnail,
          updatedAt: new Date().getTime(),
          playlist: parsedPlaylist,
          currentQuality: quality,
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
  globalPort = port;
  globalPort.onMessage.addListener(function({ type, payload }) {
    console.debug(`Background.js received event type: ${type}`);
    switch (type) {
      // 下载视频
      case types.DOWNLOAD_VIDEO_START:
        let videoInfo = payload;
        let quality = videoInfo.currentQuality;
        let selectVideoItem = videoInfo.playlist[quality];
        let segments = selectVideoItem.manifest.segments;
        let total = segments.length;
        let current = 0;
        let format = selectVideoItem.format || types.DEFAULT_VIDEO_FORMAT;
        let downloadInfo = {
          id: videoInfo.id,
          quality: quality,
          progress: 0,
          format: format,
          name: videoInfo.name + '-' + quality.toUpperCase() + '.' + format,
        };
        downloadSegments(selectVideoItem.baseUri, segments, format, chunkInfo => {
          current += 1;
          downloadInfo.progress = parseInt((current * 100) / total);
          if (globalPort) {
            console.debug(`Download progress update: ${JSON.stringify(downloadInfo)} `);
            globalPort.postMessage(downloadProgressUpdate(downloadInfo));
          }
        })
          .then(data => {
            downloadInfo.link = data.downloadLink;
            if (globalPort) {
              console.debug(`Download ${downloadInfo['name']} finished`);
              globalPort.postMessage(finishedDownloadVideo(downloadInfo));
            }
          })
          .catch(err => {
            console.error(err);
            downloadInfo.error = err.message || '系统错误';
            if (globalPort) {
              globalPort.postMessage(finishedDownloadVideo(downloadInfo));
            }
          });
        break;

      // 删除视频,更新一下当前的Badge
      case types.DELETED_VIDEO:
        chrome.browserAction.setBadgeText({
          text: '' + (store.state.playlist.length || ''),
        });
        break;

      default:
        chrome.runtime.sendMessage(unknownAction(payload));
        break;
    }

    return true;
  });

  globalPort.onDisconnect.addListener(() => {
    console.debug('Connection disconnect');
    globalPort = null;
  });
});
