import { downloadSegments, fetchNewVideoById, refreshBadgeText, parseM3u8File, snifferByRules } from './utils';

import * as types from './constants';

import store from './store';

import {
  downloadProgressUpdate, // 视频下载更新
  finishedDownloadVideo, // 下载完成新的视频,
  errorAction,
} from './actions';

import { ADD_OR_UPDATE_VIDEO, ADD_OR_UPDATE_DOWNLOAD_INFO, ADD_OR_UPDATE_SNIFFER_ITEM, REMOVE_TAB } from './store/mutation-types';

/**
 * 当列表资源变更时触发的回调函数,用于更新BadgeText以及颜色.
 *
 * @param {number} tabId 需要修改的Tab,如果为空则自动获取当前Tab.
 * @param {string} resourceType 资源类型,有知乎视频和高级嗅探两种,保留字段.
 */
const onResourceSizeChange = (tabId = undefined, resourceType = null) => {
  const updateCallback = () => {
    let snifferLst = store.getters.snifferObj[tabId] || [];
    let count = snifferLst.length;
    let color = 'blue';
    let latestTab = store.getters.latestTab;
    if (count === 0) {
      latestTab = (latestTab === 'sniffer' && 'playlist') || latestTab;
      count = store.getters.playlist.length;
      color = 'red';
    }
    refreshBadgeText(count, color, tabId);
    store.dispatch('updateLatestTab', latestTab);
  };

  if (tabId === undefined) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs || !tabs[0]) {
        return;
      }
      tabId = tabs[0].id;
      updateCallback();
    });
  } else {
    updateCallback();
  }
};

/**
 * 监听知乎视频请求.
 */
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    const videoId = details.url.replace(/^.*\/videos\/(\d+)/, '$1');
    const customSettings = store.getters.customSettings;
    const preferedFormat = customSettings.format || types.DEFAULT_VIDEO_FORMAT;
    const preferedQuality = customSettings.quality || types.DEFAULT_VIDEO_QUALITY;
    fetchNewVideoById(videoId, preferedFormat, preferedQuality)
      .then(videoInfo => {
        store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);
        onResourceSizeChange(details.tabId);
      })
      .catch(error => {
        console.error(error);
      });
    return true;
  },
  {
    urls: ['https://lens.zhihu.com/api/v4/videos/*'],
  },
  []
);

let globalPort;

// 处理来自Popup的消息
chrome.runtime.onConnect.addListener(function(port) {
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
        let format = selectVideoItem.format || types.DEFAULT_VIDEO_FORMAT; // 下载格式.
        let sourceFormat = selectVideoItem.sourceFormat;
        let converter = store.getters.customSettings.converter || types.DEFAULT_VIDEO_CONVERTER; // 默认的转化器

        // 初始化下载信息.
        let downloadInfo = {
          id: videoInfo.id,
          quality: quality,
          progress: 0,
          format: format,
          name: videoInfo.name + '-' + quality.toUpperCase() + '.' + format,
        };
        store.commit(ADD_OR_UPDATE_DOWNLOAD_INFO, downloadInfo);

        // 如果视频源本来就是MP4,不需要转化,直接通知认为下载OK.
        if (sourceFormat === types.VIDEO_FORMAT_MP4) {
          downloadInfo = { ...downloadInfo, link: selectVideoItem.mp4, progress: 100 };
          safeSendResponse(finishedDownloadVideo(downloadInfo));
          return;
        }

        // See https://github.com/shellvon/zh-downloader/issues/7

        parseM3u8File(selectVideoItem.m3u8)
          .then(manifest => {
            let segments = manifest.segments;
            if (!segments.length) {
              throw new Error(`无法获取视频分片数据,视频可能已过期,请点击ID重新采集`);
            }

            let start = 0;
            let total = segments.length;

            return downloadSegments(
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
            );
          })
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
        onResourceSizeChange();
        break;

      // 前端消息: 采集视频
      case types.COLLECT_VIDEO:
        fetchNewVideoById(payload.videoId, payload.preferedFormat || types.DEFAULT_VIDEO_FORMAT, payload.preferedQuality || types.DEFAULT_VIDEO_QUALITY)
          .then(async videoInfo => {
            store.commit(ADD_OR_UPDATE_VIDEO, videoInfo);
            await onResourceSizeChange();
          })
          .catch(err => {
            safeSendResponse(
              errorAction({
                msg: `采集视频时出现错误:${err.message}`,
                type: types.COLLECT_VIDEO,
              })
            );
          });
        break;
      default:
        safeSendResponse(
          errorAction({
            msg: `无法识别的指令:${type}`,
            type: types.UNKNOWN_ACTION,
          })
        );
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
  onResourceSizeChange();
  // 刷新替换之
  chrome.alarms.create(types.ALARM_NAME, getAlarmsConfig());
});

/**
 * 当响应返回给浏览器时触发的回调函数,用于高级嗅探, See https://github.com/shellvon/zh-downloader/issues/11
 */
chrome.webRequest.onResponseStarted.addListener(
  async details => {
    const statusCode = details.statusCode;
    if (statusCode < 200 || statusCode >= 300) {
      return;
    }
    const tabId = details.tabId;
    if (tabId < 0) {
      return;
    }
    const customSettings = store.getters.customSettings;
    if (!customSettings.advancedSniffer) {
      // 站点并未开启高级嗅探
      return;
    }
    const advancedSnifferCfg = customSettings.advancedSnifferConfig || types.DEFAULT_ADVANCED_SNIFFER_CONFIG;
    const { url: requestUrl, type: requestType, responseHeaders: headers } = details;

    chrome.tabs.get(tabId, function(info) {
      if (chrome.runtime.lastError || !info) {
        return;
      }
      const originUrl = info.url;
      let snifferResult = snifferByRules(originUrl, requestUrl, requestType, headers, advancedSnifferCfg);
      if (!snifferResult) {
        return;
      }
      snifferResult.title = info.title;

      store.commit(ADD_OR_UPDATE_SNIFFER_ITEM, { tabId, item: snifferResult });
      onResourceSizeChange(tabId);
    });
  },
  {
    urls: ['<all_urls>'],
  },
  ['responseHeaders']
);

// 在更新之前清除之前的记录
// 但是如果请求的URL地址本就是需要采集的资源，可能会导致先触发Sniffer再触发onUpdate，导致刚采集的数据被重置
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading' && tabId > 0) {
    store.commit(REMOVE_TAB, tabId);
    onResourceSizeChange(tabId);
  }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  store.commit(REMOVE_TAB, tabId);
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (activeInfo.tabId < 0) {
    return;
  }
  onResourceSizeChange(activeInfo.tabId);
});
