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

// =========================================================》

/**
 * 上传文件分片，并发数 = maxConcurrent
 * @param {File} file
 * @param {number} chunkSize
 * @param {number} maxConcurrent
 */
async function uploadFileChunks(file, chunkSize, maxConcurrent = 5) {
  const chunks = createChunks(file, chunkSize); // 剩余待传队列
  const total = chunks.length;
  let uploaded = 0;

  // 真正并发控制器：只要池子未满就往里塞新的 Promise
  await new Promise((resolve, reject) => {
    let running = 0; // 当前并发数

    function pump() {
      if (chunks.length === 0) {
        // 没有任务了
        if (running === 0) resolve(); // 全部完成
        return;
      }

      if (running >= maxConcurrent) return; // 并发已满

      running++;
      const { chunk, chunkFileName } = chunks.shift();

      uploadChunk(chunk, chunkFileName)
        .then(() => {
          uploaded++;
          console.log(`progress: ${uploaded}/${total}`);
        })
        .catch(reject) // 任何一块失败整体失败
        .finally(() => {
          running--;
          pump(); // 无论成功失败都补一个
        });

      // 继续尝试塞任务（while 比递归更快把队列填满）
      pump();
    }

    pump(); // 启动
  });
}

/* ---------- 工具函数 ---------- */
function createChunks(file, chunkSize) {
  const chunks = [];
  const count = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < count; i++) {
    chunks.push({
      chunk: file.slice(i * chunkSize, (i + 1) * chunkSize),
      chunkFileName: `${file.name}-${i}`,
    });
  }
  return chunks;
}

/* 上传单块（示例用 300ms 延迟模拟） */
function uploadChunk(chunk, chunkFileName) {
  return new Promise((resolve) => {
    console.log('uploading', chunkFileName);
    setTimeout(resolve, 300);
  });
}

/* ---------- 使用示例 ---------- */
// const file = ...; // 浏览器里拿到 File 对象
// await uploadFileChunks(file, 1024 * 1024, 5);
