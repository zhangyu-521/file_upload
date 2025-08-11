export const FILE_SIZE = 1024 * 1024 * 1024 * 2;

// 根据文件类型设置不同的分片大小
export const CHUNK_SIZE = {
  IMAGE: 1024 * 256, // 图片: 256KB
  VIDEO: 1024 * 1024 * 100,
  DEFAULT: 1024 * 256, // 默认: 256KB
};

// 获取适合的分片大小
export function getChunkSize(fileType) {
  if (fileType.startsWith('image/')) {
    return CHUNK_SIZE.IMAGE;
  } else if (fileType.startsWith('video/')) {
    return CHUNK_SIZE.VIDEO;
  } else {
    return CHUNK_SIZE.DEFAULT;
  }
}

// 重试次数
export const MAX_RETRY = 3;
