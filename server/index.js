import express from 'express';
import logger from 'morgan';
import { StatusCodes } from 'http-status-codes';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'node:path';
const __dirname = path.resolve();
const CHUNK_SIZE = 1024 * 1024 * 20;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const TEMP_DIR = path.resolve(__dirname, 'temp');

// 存放上传的文件
fs.ensureDirSync(PUBLIC_DIR);
// 存放分片的文件
fs.ensureDirSync(TEMP_DIR);

const app = express();
app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload/:fileName', async (req, res, next) => {
  const { fileName } = req.params;
  const { chunkFileName } = req.query;
  // 分片目录
  const chunkDir = path.resolve(TEMP_DIR, fileName);
  // 分片路径
  const chunkFilePath = path.resolve(chunkDir, chunkFileName);

  await fs.ensureDir(chunkDir);

  const ws = fs.createWriteStream(chunkFilePath, {});
  // 客户端取消上传触发
  req.on('aborted', () => {
    ws.close();
  });

  // 使用管道写入
  try {
    await pipeStream(req, ws);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/merge/:fileName', async (req, res, next) => {
  const { fileName } = req.params;
  try {
    await mergeFileChunk(fileName, next);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

async function pipeStream(rs, ws) {
  return new Promise((resolve, reject) => {
    rs.pipe(ws).on('finish', resolve).on('error', reject);
  });
}

async function mergeFileChunk(fileName, next) {
  const chunkDir = path.resolve(TEMP_DIR, fileName);
  const chunkFiles = await fs.readdir(chunkDir);
  const mergedFilePath = path.resolve(PUBLIC_DIR, fileName);
  // 对分片升序排列
  chunkFiles.sort((a, b) => {
    return a.split('-')[1] - b.split('-')[1];
  });

  try {
    // 为了提高性能，可以并行写入
    const pipes = chunkFiles.map((chunkFile, index) => {
      return pipeStream(
        fs.createReadStream(path.resolve(chunkDir, chunkFile), {
          autoClose: true,
        }),
        fs.createWriteStream(mergedFilePath, {
          start: index * CHUNK_SIZE,
        })
      );
    });
    // 并发把分片写入到目标文件
    await Promise.all(pipes);
    await fs.rm(chunkDir, { recursive: true });
  } catch (error) {
    next(error);
  }
}
