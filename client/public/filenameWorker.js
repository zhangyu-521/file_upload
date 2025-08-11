// 开一个进程进行哈希计算
self.addEventListener('message', async (event) => {
  const file = event.data;
  console.log('file', file);
  const fileName = await getFileName(file);
  console.log('fileName', fileName);
  self.postMessage(fileName);
  async function getFileName(file) {
    // 计算hash
    const fileHash = await calculateFileHash(file);
    const fileExtension = file.name.split('.').pop();
    return `${fileHash}.${fileExtension}`;
  }

  async function calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return bufferToHex(hash);
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
});
