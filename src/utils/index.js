import { Parser } from 'm3u8-parser';
import jBinary from 'jbinary';
import MPEGTS from 'mpegts_to_mp4/mpegts_to_mp4/mpegts';
import mpegts_to_mp4 from 'mpegts_to_mp4/mpegts_to_mp4/index'; // eslint-disable-line camelcase

import { downloadingVideo, mergeVideo, finishedMergeVideo } from '../actions';
import { DEFAULT_VIDEO_CONVERTER, DEFAULT_FETCH_RETRY_CNT, DEFAULT_VIDEO_FORMAT, VIDEO_FORMAT_MP4, VIDEO_FORMAT_TS, DEFAULT_VIDEO_QUALITY } from '../constants';

import muxjs from 'mux.js';

const noop = () => {};

/**
 * 将m3u8给定的地址下载下来使用m3u8-parser进行处理.
 *
 * @param {string} uri 需要下载的m3u8完整地址.
 */
export async function parseM3u8File(uri) {
  const m3u8Parser = new Parser();
  const manifest = await fetch(uri).then(resp => resp.text());
  m3u8Parser.push(manifest);
  m3u8Parser.end();
  const parsedManifest = m3u8Parser.manifest;
  return parsedManifest;
}

/**
 * @param {int} seconds 需要sleep的时间.
 */
export async function sleep(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds);
  });
}

/**
 * 支持自动重试的fetch函数
 *
 * @param {string}  url      需要请求的API地址
 * @param {object}  options  提供给fetch函数的可选参数.
 * @param {int}     retryCnt 重试次数,默认为 `DEFAULT_FETCH_RETRY_CNT`次
 * @param {int}     delay    每次失败重试知乎的延迟时间,单位秒.默认5s.
 */
export async function fetchRetry(url, options, retryCnt = DEFAULT_FETCH_RETRY_CNT, delay = 5) {
  try {
    return fetch(url, options);
  } catch (err) {
    if (retryCnt <= 1) throw err;
    await sleep(delay);
    return fetchRetry(url, options, retryCnt - 1);
  }
}

/**
 * 下载单个TS数据
 *
 * @param {string}  url      需要请求的API地址
 * @param {object}  options  提供给fetch函数的可选参数.
 * @param {int}     retryCnt 重试次数,默认为 `DEFAULT_FETCH_RETRY_CNT`次
 */
export function downloadSingleSegment(uri, options = {}, retryCnt = DEFAULT_FETCH_RETRY_CNT) {
  return fetchRetry(uri, options, retryCnt).then(resp => {
    if (!resp.ok) {
      throw new Error(`下载失败,服务端返回:${resp.status}`);
    }
    return resp;
  });
}

/**
 *  使用mux.js 转化MP4格式时的收尾工作.
 *
 * @param {callable} progressCallback
 */
const mp4ByMuxJSFinishedJob = progressCallback => {
  const transmuxer = new muxjs.mp4.Transmuxer({ keepOriginalTimestamps: true });
  let remuxedSegments = [];
  let remuxedBytesLength = 0;
  let remuxedInitSegment = null;

  transmuxer.on('data', event => {
    if (!remuxedInitSegment) {
      remuxedInitSegment = event.initSegment;
    }
    remuxedBytesLength = event.data.byteLength;
    remuxedSegments.push(event);
  });

  let onConvertedDonePromise = new Promise((resolve, reject) => {
    transmuxer.on('done', () => {
      let offset = 0;
      let bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength);
      bytes.set(remuxedInitSegment, offset);
      offset += remuxedInitSegment.byteLength;

      for (var j = 0, i = offset; j < remuxedSegments.length; j++) {
        bytes.set(remuxedSegments[j].data, i);
        i += remuxedSegments[j].byteLength;
      }
      const mp4Blob = new Blob([bytes], { type: 'video/mp4' });
      let data = { downloadLink: URL.createObjectURL(mp4Blob) };
      resolve(data);
    });
  });

  let finishedJob = async dataChunks => {
    // 等待下载完之后再做数据转化,这样可以确保push的数据顺序.
    dataChunks.forEach((el, index) => {
      transmuxer.push(new Uint8Array(el.resp));
    });
    transmuxer.flush();
    // 返回转化结果.
    return onConvertedDonePromise;
  };

  return finishedJob;
};

/**
 *  使用mpegts-to-mp4转化格式时的收尾工作.
 * @param {callbale} progressCallback
 */
const mp4ByJbinaryFinishedJob = progressCallback => {
  let finishedJob = async dataChunks => {
    const blob = new Blob(
      dataChunks.map(el => new Uint8Array(el.resp)),
      { type: 'video/mp2t' }
    );

    return new Promise((resolve, reject) => {
      jBinary.load(blob, MPEGTS, (err, mpegts) => {
        if (err) {
          reject(err);
        }
        const start = new Date().getTime();
        const mp4Obj = mpegts_to_mp4(mpegts);
        console.debug(`Converted finished, time elapsed: ${new Date().getTime() - start}ms`);
        const data = { downloadLink: mp4Obj.toURI('video/mp4') };
        resolve(data);
      });
    });
  };
  return finishedJob;
};

/**
 * TS-格式数据下载完成的收尾工作,直接合并为单个文件
 *
 * @param {callbale} progressCallback
 */
const tsFinishedJob = progressCallback => {
  const finishedJob = async dataChunks => {
    const mp4Blob = new Blob(
      dataChunks.map(el => new Uint8Array(el.resp)),
      { type: 'video/mp2t' }
    );
    const link = URL.createObjectURL(mp4Blob);
    let data = { downloadLink: link };
    progressCallback(finishedMergeVideo(data));
    return data;
  };
  return finishedJob;
};

/**
 * 下载视频资源...
 *
 * @param {string}   baseUri          下载地址的前缀.
 * @param {array}    segments         需要下载的分片数据
 * @param {string}   format           下载的视频格式,支持ts/mp4
 * @param {callable} progressCallback 下载进度回调.
 * @param {string}   converter        视频转化器,默认是mux.js
 */
export async function downloadSegments(baseUri, segments, format = DEFAULT_VIDEO_FORMAT, progressCallback = noop, converter = DEFAULT_VIDEO_CONVERTER) {
  let lowerCaseFormat = format.toLowerCase();
  if (lowerCaseFormat !== VIDEO_FORMAT_MP4 && lowerCaseFormat !== VIDEO_FORMAT_TS) {
    throw new Error(`不支持下载${format}格式`);
  }
  // 单个下载Job.
  let job = async (uri, jobId) => {
    return {
      jobId: jobId,
      resp: await downloadSingleSegment(`${baseUri}${uri}`)
        .then(resp => resp.arrayBuffer())
        .then(ab => {
          progressCallback(
            downloadingVideo({
              msg: `完成下载第 ${jobId} 分片数据`,
              jobId: jobId,
              data: ab,
              format: format,
            })
          );
          return ab;
        }),
    };
  };

  let allJobs = Promise.all(segments.map((seg, index) => job(seg.uri, index))).then(dataChunks => {
    progressCallback(
      mergeVideo({
        msg: `分片数据下载已完成,合成${format}数据中`,
        data: dataChunks,
        format: format,
      })
    );
    return dataChunks;
  });

  // 所有东西都下载完了,需要获取做的工作
  let finishedJob;
  if (lowerCaseFormat === VIDEO_FORMAT_TS) {
    finishedJob = tsFinishedJob(progressCallback);
  } else if (lowerCaseFormat === VIDEO_FORMAT_MP4) {
    finishedJob = converter === 'mux.js' ? mp4ByMuxJSFinishedJob(progressCallback) : mp4ByJbinaryFinishedJob(progressCallback);
  }

  // All done
  return allJobs.then(finishedJob);
}

// 更新Badge的文字
export const refreshBadgeText = (text, color = 'red', tabId = undefined) => {
  text = (text || '') + '';
  chrome.browserAction.setBadgeText({ text, tabId });
  chrome.browserAction.setBadgeBackgroundColor({
    color,
    tabId,
  });
};

/**
 * 通过视频ID采集一个视频信息
 *
 * @param {int}    videoId        需要抓取的视频Id
 * @param {string} preferedFormat  偏好的视频格式(决定了前端展示)
 * @param {string} preferedQuality  偏好的视频清晰度(决定了前端默认展示的清晰度)
 */
export async function fetchNewVideoById(videoId, preferedFormat = DEFAULT_VIDEO_FORMAT, preferedQuality = DEFAULT_VIDEO_QUALITY) {
  return fetchRetry(`https://lens.zhihu.com/api/videos/${videoId}`)
    .then(resp => resp.json())
    .then(async function(resp) {
      let videoName = resp.title || '未命名';
      let playlist = resp.playlist;
      let parsedPlaylist = {};
      for (var quality in playlist) {
        const metaInfo = playlist[quality];
        const format = metaInfo.format || preferedFormat;
        let videoItem = { ...metaInfo, name: videoName, quality, sourceFormat: format };

        if (format !== VIDEO_FORMAT_MP4) {
          console.warn(`不支持的视频格式:${format}, 尝试m3u8格式`);
          const manifest = await parseM3u8File(videoItem.play_url);
          // m3u8格式的duration需要自己计算.
          videoItem.duration = manifest.segments.reduce((a, b) => a + b.duration, 0) * 1000; // second -> ms
          videoItem.m3u8 = videoItem.play_url;
          videoItem.baseUri = videoItem.play_url.replace(/[^/]+$/i, '');
        } else {
          videoItem.mp4 = videoItem.play_url;
          videoItem.duration = metaInfo.duration * 1000; // second -> ms
        }
        parsedPlaylist[quality] = videoItem;
      }

      return {
        id: videoId,
        name: videoName,
        thumbnail: resp.cover_info.thumbnail,
        updatedAt: new Date().getTime(),
        playlist: parsedPlaylist,
        currentQuality: preferedQuality,
      };
    });
}

export const getFilenameFromDisposition = disposition => {
  if (!disposition) {
    return;
  }
  let macthed = disposition.match(/filename="(.*?)"/);
  if (macthed && macthed[1]) {
    let filename = decodeURIComponent(macthed[1]);
    return filename;
  }
};

export const getHost = url => {
  let a = document.createElement('a');
  a.href = url;
  return a;
};

export const getHeaderValue = (headers, key, defaultValue = null, caseSensitive = false) => {
  let cb = el => el.name.toLowerCase() === key.toLowerCase();
  if (caseSensitive) {
    cb = el => el.name === key;
  }
  let index = headers.findIndex(cb);
  return index < 0 ? defaultValue : headers[index].value;
};

/**
 *  根据嗅探规则进行数据嗅探.
 *
 * @param {stirng} originUrl      请求发起的来源站点
 * @param {stirng} requestUrl     请求地址
 * @param {string} requestType    请求类型, See https://developer.chrome.com/extensions/webRequest#type-ResourceType
 * @param {array}  headers        请求响应头, See https://developer.chrome.com/extensions/webRequest#type-HttpHeaders
 * @param {object} snifferRuleCfg 请求嗅探配置 See https://developer.chrome.com/extensions/webRequest#type-HttpHeaders
 */
export const snifferByRules = (originUrl, requestUrl, requestType, headers, snifferRuleCfg) => {
  let includesUrlPatterns = snifferRuleCfg.includes || [];
  let excludesUrlPatterns = snifferRuleCfg.excludes || [];

  const getRegex = (pattern, flags = 'i') => {
    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      return new RegExp('a^', flags);
    }
  };

  // Step 1. 判断此站点是否被排除了
  let isExclude = excludesUrlPatterns && excludesUrlPatterns.some(el => originUrl && originUrl.match(getRegex(el)));
  if (isExclude) {
    return;
  }

  // Step 2. 判断是否指定了必须要采集的视频URL规则
  let isHit = includesUrlPatterns && includesUrlPatterns.some(el => requestUrl.match(getRegex(el)));

  const mimeType = getHeaderValue(headers, 'content-type', '');
  const contentSize = parseInt(getHeaderValue(headers, 'content-length', 0));
  const filename = getFilenameFromDisposition(getHeaderValue(headers, 'content-disposition'));
  // Step 3. 如果没有命中,尝试是否制定了对应的MimeType规则
  if (!isHit) {
    const mimeTypeCfg = snifferRuleCfg[mimeType];
    const isEnable = mimeTypeCfg && mimeTypeCfg.enable !== false;
    if (!isEnable) {
      return;
    }
    if (mimeTypeCfg.minSize && mimeTypeCfg.minSize * 1024 > contentSize) {
      return;
    }
  }

  return {
    host: getHost(originUrl).hostname,
    url: requestUrl,
    type: requestType,
    filename: filename,
    size: contentSize,
    mimetype: mimeType,
  };
};
