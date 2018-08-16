import { downloadSegments, fetchNewVideoById, refreshBadgeText } from './utils';

import * as types from './constants';

import store from './store';

import {
  downloadProgressUpdate, // 视频下载更新
  finishedDownloadVideo, // 下载完成新的视频,
  errorAction,
} from './actions';

import { ADD_OR_UPDATE_VIDEO, ADD_OR_UPDATE_DOWNLOAD_INFO } from './store/mutation-types';

// 设置为红色
chrome.browserAction.setBadgeBackgroundColor({
  color: 'red',
});

/**
 * 监听知乎视频请求.
 */
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    const videoId = details.url.replace(/^.*\/video\/(\d+)/, '$1');
    const customSettings = store.getters.customSettings;
    const preferedFormat = customSettings.format || types.DEFAULT_VIDEO_FORMAT;
    const preferedQuality = customSettings.quality || types.DEFAULT_VIDEO_QUALITY;
    fetchNewVideoById(videoId, preferedFormat, preferedQuality)
      .then(videoInfo => {
        store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);
        refreshBadgeText(store.state.playlist.length);
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
            // console.debug(`ProgressCallback : ${type} => `, payload);
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
            safeSendResponse(
              downloadProgressUpdate({
                msg,
              })
            );
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
        refreshBadgeText(store.state.playlist.length);
        break;

      // 前端消息: 采集视频
      case types.COLLECT_VIDEO:
        fetchNewVideoById(payload.videoId, payload.preferedFormat || types.DEFAULT_VIDEO_FORMAT, payload.preferedQuality || types.DEFAULT_VIDEO_QUALITY)
          .then(videoInfo => {
            store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);
            refreshBadgeText(store.state.playlist.length);
          })
          .catch(err => {
            safeSendResponse(errorAction({ msg: `采集视频时出现错误:${err.message}`, type: types.COLLECT_VIDEO }));
          });
        break;
      default:
        safeSendResponse(errorAction({ msg: `无法识别的指令:${type}`, type: types.UNKNOWN_ACTION }));
        break;
    }

    return true;
  });

  globalPort.onDisconnect.addListener(() => {
    globalPort = null;
  });
});

const getAlarmsConfig = () => {
  // 获取间隔时间.
  let checkInternal = store.state.customSettings.checkInternal || types.DEFAULT_CHECK_INTERNAL;
  // 如果过期时间更小,选择此时间
  checkInternal = Math.min(checkInternal, store.state.customSettings.expiredAt);
  return {
    delayInMinutes: checkInternal,
    periodInMinutes: checkInternal,
  };
};

// 首次创建一个.
chrome.alarms.create(types.ALARM_NAME, getAlarmsConfig());

/**
 * 定时删除过期的视频.
 */
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== types.ALARM_NAME) {
    return;
  }
  store.dispatch('deletedExpiredVideo', {
    expiredAt: (store.state.customSettings.expiredAt || types.DEFAULT_EXPIRED_AT) * 6e4,
  });
  refreshBadgeText(store.state.playlist.length);
  // 刷新替换之
  chrome.alarms.create(types.ALARM_NAME, getAlarmsConfig());
});
