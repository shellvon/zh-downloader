import { parseM3u8File, downloadSegments } from './utils';

import * as types from './constants';

import store from './store';

import {
  downloadProgressUpdate, // 视频下载更新
  finishedDownloadVideo, // 下载完成新的视频,
  unknownAction,
} from './actions';

import { ADD_OR_UPDATE_VIDEO } from './store/mutation-types';

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
            format: 'ts',
            progress: 0, //
            ...resp.cover_info,
          };
          parsedPlaylist[quality] = videoItem;
        }

        return {
          id: resp.id,
          name: videoName,
          thumbnail: resp.cover_info.thumbnail,
          playlist: parsedPlaylist,
          currentQuality: quality,
        };
      })
      .then(videoInfo => {
        store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);

        chrome.browserAction.setBadgeText({ text: store.state.playlist.length + '' });
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
  if (port.name !== 'ZH_DOWNLOADER') {
    return;
  }
  globalPort = port;
  globalPort.onMessage.addListener(function({ type, payload }) {
    switch (type) {
      // 下载视频
      case types.DOWNLOAD_VIDEO_START:
        let videoInfo = payload;
        let selectVideoItem = videoInfo.playlist[videoInfo.currentQuality];
        let segments = selectVideoItem.manifest.segments;
        let total = segments.length;
        let current = 0;
        downloadSegments(selectVideoItem.baseUri, segments, selectVideoItem.format || 'ts', chunkInfo => {
          current += 1;
          selectVideoItem.progress = parseInt((current * 100) / total);
          videoInfo.playlist[videoInfo.currentQuality] = selectVideoItem;
          console.log(selectVideoItem);
          if (globalPort) globalPort.postMessage(downloadProgressUpdate(videoInfo));
        }).then(data => {
          selectVideoItem.downloadLink = data.downloadLink;
          videoInfo.playlist[videoInfo.currentQuality] = selectVideoItem;
          if (globalPort) globalPort.postMessage(finishedDownloadVideo(videoInfo));
        }); // 通知前端已经下载完成
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
    globalPort = null;
  });
});
