// 开始下载视频
export const DOWNLOAD_VIDEO_START = 'DOWNLOAD_VIDEO_START';

// 正在下载中...
export const DOWNLOAD_VIDEO_INPROGRESS = 'downloading';

// 正在合并数据中...
export const DOWNLOAD_VIDEO_MERGING = 'merging';

// 下载视频出错...
export const DOWNLOAD_VIDEO_ERROR = 'download_error';

// 下载视频结束
export const DOWNLOAD_VIDEO_FINISHED = 'DOWNLOAD_VIDEO_FINISHED';

// 删除视频
export const DELETED_VIDEO = 'DELETE_VIDEO';

// 下载进度更新事件
export const UPDATE_DOWNLOAD_PROGRESS = 'UPDATE_DOWNLOAD_PROGRESS';

// 有新的视频加入
export const ADD_NEW_VIDEO = 'ADD_NEW_VIDEO';

// 未知事件
export const UNKNOWN_ACTION = 'UNKNOWN_ACTION';

// 前后端链接用的端口号
export const PORT_NAME = 'ZH_DOWNLOADER';

// 报警所用的alarm name.
export const ALARM_NAME = 'ZH_DOWNLOADER_ALARM';

// 视频格式: MPEG-4
export const VIDEO_FORMAT_MP4 = 'mp4';

// 视频格式: MPEGTS-2
export const VIDEO_FORMAT_TS = 'ts';

// 默认的视频下载格式
export const DEFAULT_VIDEO_FORMAT = VIDEO_FORMAT_TS;

// 默认Fetch失败重试次数
export const DEFAULT_FETCH_RETRY_CNT = 3;

// 默认的Mp4视频转化器
export const DEFAULT_VIDEO_CONVERTER = 'mux.js';

// 默认的视频质量
export const DEFAULT_VIDEO_QUALITY = 'hd';

// 默认的检查间隔,单位分钟
export const DEFAULT_CHECK_INTERNAL = 30;

// 默认的过期时间(从采集算起,过了这个时间之后会被自动删除),单位分钟
export const DEFAULT_EXPIRED_AT = 240;
