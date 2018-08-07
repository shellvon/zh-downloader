import { Parser } from 'm3u8-parser';
import jBinary from 'jbinary';
import MPEGTS from 'mpegts_to_mp4/mpegts_to_mp4/mpegts';
import mpegts_to_mp4 from 'mpegts_to_mp4/mpegts_to_mp4/index'; // eslint-disable-line no-use-before-define
import { DEFAULT_VIDEO_FORMAT } from '../constants';

export async function parseM3u8File(uri) {
  const m3u8Parser = new Parser();
  const manifest = await fetch(uri).then(resp => resp.text());
  m3u8Parser.push(manifest);
  m3u8Parser.end();
  const parsedManifest = m3u8Parser.manifest;
  return parsedManifest;
}

export async function sleep(second) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, second);
  });
}

export async function fetchRetry(url, options, retryCnt = 3, delay = 5) {
  try {
    return fetch(url, options);
  } catch (err) {
    if (retryCnt <= 1) throw err;
    await sleep(delay);
    return fetchRetry(url, options, retryCnt - 1);
  }
}

export function downloadSingleSegment(uri, options = {}, retryCnt = 3) {
  return fetchRetry(uri, options, retryCnt).then(resp => {
    if (!resp.ok) {
      throw new Error('下载失败,服务端返回:' + resp.status);
    }
    return resp;
  });
}

export async function downloadSegments(baseUri, segments, format = DEFAULT_VIDEO_FORMAT, progressCallbak) {
  // MP4转化相当耗时,所以当格式为MP4的时候,进度条不能立即更新要在转化完之后才更新 😂
  const totalLen = segments.length;
  let lastChunk;
  return Promise.all(
    segments.map(async (seg, index) => {
      const tsUri = baseUri + seg.uri;
      return downloadSingleSegment(tsUri, {}, 3).then(resp => {
        let data = resp.blob();
        // 如果是MP4格式,记录最后一块数据，并且跳过进度回调，等到待会儿转化为MP4之后再说.
        if (totalLen - 1 === index && format === 'mp4') {
          lastChunk = data;
        } else {
          progressCallbak(data);
        }
        return data;
      });
    })
  ).then(dataChunks => {
    if (format === 'ts') {
      const mp4Blob = new Blob(dataChunks, { type: 'video/mp2t' });
      const link = URL.createObjectURL(mp4Blob);
      return { downloadLink: link };
    } else if (format === 'mp4') {
      const blob = new Blob(dataChunks, { type: 'video/mp2t' });
      return new Promise((resolve, reject) => {
        jBinary.load(blob, MPEGTS, (err, mpegts) => {
          if (err) {
            reject(err);
          }
          console.debug('Begin to convert mp4');
          const start = new Date().getTime();
          const mp4Obj = mpegts_to_mp4(mpegts);
          console.debug(`Converted finished, time elapsed: ${new Date().getTime() - start}ms`);
          progressCallbak(lastChunk);
          resolve({ downloadLink: mp4Obj.toURI('video/mp4') });
        });
      });
    } else {
      throw new Error('不支持的视频格式.');
    }
  });
}
