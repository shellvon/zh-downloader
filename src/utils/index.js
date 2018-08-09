import { Parser } from 'm3u8-parser';
import jBinary from 'jbinary';
import MPEGTS from 'mpegts_to_mp4/mpegts_to_mp4/mpegts';
import mpegts_to_mp4 from 'mpegts_to_mp4/mpegts_to_mp4/index'; // eslint-disable-line camelcase

import { downloadingVideo, mergeVideo, finishedMergeVideo } from '../actions';
import { DEFAULT_VIDEO_CONVERTER, DEFAULT_FETCH_RETRY_CNT, DEFAULT_VIDEO_FORMAT, VIDEO_FORMAT_MP4, VIDEO_FORMAT_TS } from '../constants';

import muxjs from 'mux.js';

const noop = data => {};

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
      throw new Error('(;´༎ຶД༎ຶ`)下载失败,服务端返回:' + resp.status);
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
      console.debug('mux.js trigger done event');
      let offset = 0;
      let bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength);
      bytes.set(remuxedInitSegment, offset);
      offset += remuxedInitSegment.byteLength;

      for (var j = 0, i = offset; j < remuxedSegments.length; j++) {
        bytes.set(remuxedSegments[j].data, i);
        i += remuxedSegments[j].byteLength;
      }
      console.debug('mux.js generated mp4');
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
    const blob = new Blob(dataChunks.map(el => new Uint8Array(el.resp)), { type: 'video/mp2t' });

    return new Promise((resolve, reject) => {
      jBinary.load(blob, MPEGTS, (err, mpegts) => {
        if (err) {
          reject(err);
        }
        console.debug('Begin to convert mp4');
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
    const mp4Blob = new Blob(dataChunks.map(el => new Uint8Array(el.resp)), { type: 'video/mp2t' });
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
  if (format !== VIDEO_FORMAT_MP4 && format !== VIDEO_FORMAT_TS) {
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
  if (format === VIDEO_FORMAT_TS) {
    finishedJob = tsFinishedJob(progressCallback);
  } else if (format === VIDEO_FORMAT_MP4) {
    finishedJob = converter === 'mux.js' ? mp4ByMuxJSFinishedJob(progressCallback) : mp4ByJbinaryFinishedJob(progressCallback);
  }

  // All done
  return allJobs.then(finishedJob);
}
