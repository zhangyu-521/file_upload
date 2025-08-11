/**
 * 1.上传任务队列，并发5个
 */

async function uploadFileChunks(file, chunkSize, maxConcurrentuploads) {
  let chunks = createChunks(file, chunkSize);
  //   当前正在上传的任务
  let activeUploads = [];
  async function uploadNextChunk() {
    if (chunks.length == 0) {
      return;
    }
    let chunk = chunks.shift();
    await uploadChunk(chunk);
    activeUploads.splice(activeUploads.indexOf(chunk), 1);
    uploadNextChunk();
  }

  for (let i = 0; i < maxConcurrentuploads; i++) {
    if (chunks.length == 0) {
      break;
    }

    let chunk = chunks.shift();
    activeUploads.push(chunk);
    uploadNextChunk();
  }
  await Promise.all(activeUploads.map((chunk) => uploadChunk(chunk)));
}

await uploadFileChunks(file, 1024 * 1024, 5);

function createChunks(file, chunkSize) {
  let chunks = [];
  let count = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < count; i++) {
    let chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push({ chunk, chunkFileName: `${file.name}-${i}` });
  }
  return chunks;
}

function uploadChunk() {
  return new Promise((resolve, reject) => {
    // 上传逻辑
    resolve();
  });
}
