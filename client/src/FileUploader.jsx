import { useRef, useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Button, message, Progress } from 'antd';
import './FileUpload.css';
import useDrag from './useDrag';
import { getChunkSize } from './constant';
import axiosInstance from './axiosInstance';
import axios from 'axios';

const UploadStatus = {
  NOT_STARTED: 'NOT_STARTED', // 初始状态
  UPLOADING: 'UPLOADING', // 上传中
  PAUSED: 'PAUSED', // 暂停
  COMPLETED: 'COMPLETED', // 已完成
};
export default function FileUploader() {
  const uploadContainerRef = useRef(null);
  const { selectFile, filePreview, resetFileStatus } =
    useDrag(uploadContainerRef);
  let [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState(UploadStatus.NOT_STARTED);
  const [cancelTokens, setCancelTokens] = useState([]);
  const resetAllStatus = () => {
    resetFileStatus();
    setUploadProgress({});
    setUploadStatus(UploadStatus.NOT_STARTED);
  };
  const handleUpload = async () => {
    if (!selectFile) {
      message.error('没有选择文件');
      return;
    }
    setUploadStatus(UploadStatus.UPLOADING);

    const fileName = await getFileName(selectFile);
    console.log('fileName', fileName);

    await uploadFile(
      selectFile,
      fileName,
      setUploadProgress,
      resetAllStatus,
      setCancelTokens
    );
  };

  const handlePause = async () => {
    setUploadStatus(UploadStatus.PAUSED);
    cancelTokens.forEach((cancelToken) => cancelToken.cancel('用户主动暂停'));
  };
  const renderButton = () => {
    switch (uploadStatus) {
      case UploadStatus.NOT_STARTED:
        return <Button onClick={handleUpload}>上传</Button>;
      case UploadStatus.UPLOADING:
        return <Button onClick={handlePause}>暂停</Button>;
      case UploadStatus.PAUSED:
        return <Button onClick={handleUpload}>恢复</Button>;
    }
  };
  return (
    <>
      <div className="upload-container" ref={uploadContainerRef}>
        {renderFilePreview(filePreview)}
      </div>
      <div>{renderButton()}</div>
      <div>
        {Object.entries(uploadProgress).map(
          ([chunkFileName, percentage], index) => (
            <div>
              <span>切片{index}</span>:
              <Progress percent={percentage} style={{ marginBottom: 10 }} />
            </div>
          )
        )}
      </div>
    </>
  );
}

/**
 * 实现切片上传大文件
 * @param {*} file
 * @param {*} fileName
 */
async function uploadFile(
  file,
  fileName,
  setUploadProgress,
  resetAllStatus,
  setCancelTokens
) {
  const { needUpload, uploadList } = await axiosInstance.get(
    `/verify/${fileName}`
  );
  if (!needUpload) {
    message.success('文件已存在，秒传成功');
    return resetAllStatus();
  }
  // 切片
  const chunks = createFileChunks(file, fileName);

  const newCancelTokens = [];

  // 并行上传
  const requests = chunks.map(({ chunk, chunkFileName }, index) => {
    const cancelToken = axios.CancelToken.source();
    newCancelTokens.push(cancelToken);

    // 断点续传
    const existingChunk = uploadList.find(({ chunkFile, size }) => {
      return chunkFile === chunkFileName;
    });
    // 服务器已经上传一部分了
    if (existingChunk) {
      const uploadedSize = existingChunk.sieze;
      const remainingChunk = chunk.slice(uploadedSize);
      if (remainingChunk.size === 0) {
        return Promise.resolve();
      }
      return createRequest(
        fileName,
        remainingChunk,
        chunkFileName,
        setUploadProgress,
        cancelToken,
        uploadedSize //上传位置起始字节
      );
    } else {
      return createRequest(
        fileName,
        chunk,
        chunkFileName,
        setUploadProgress,
        cancelToken,
        0
      );
    }
  });
  setCancelTokens(newCancelTokens);
  try {
    // 并行上传
    await Promise.all(requests);
    // 合并请求
    await axiosInstance.get(`/merge/${fileName}`);
    message.success('文件上传完成!');
    resetAllStatus();
  } catch (error) {
    if (axios.isCancel(error)) {
      message.info('上传已暂停');
    } else {
      console.error(error);
      message.error('文件上传失败!');
    }
  }
}

function createRequest(
  fileName,
  chunk,
  chunkFileName,
  setUploadProgress,
  cancelToken,
  start
) {
  return axiosInstance.post(`/upload/${fileName}`, chunk, {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    params: {
      chunkFileName,
      start, // 将文件的起始位置也送给服务器，方便断点续传
    },
    onUploadProgress: (progressEvent) => {
      const percentage = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setUploadProgress((prev) => ({
        ...prev,
        [chunkFileName]: percentage,
      }));
    },
    cancelToken: cancelToken.token,
  });
}

function createFileChunks(file, fileName) {
  let chunks = [];
  const chunkSize = getChunkSize(file.type);
  let count = Math.ceil(file.size / chunkSize);

  console.log(
    `File type: ${file.type}, Chunk size: ${
      chunkSize / 1024 / 1024
    }MB, Total chunks: ${count}`
  );

  for (let i = 0; i < count; i++) {
    let chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push({ chunk, chunkFileName: `${fileName}-${i}` });
  }
  return chunks;
}

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

function renderFilePreview(filePreview) {
  const { url, type } = filePreview;
  if (url) {
    if (type.startsWith('video/')) {
      return <video src={url} alt="preview" controls />;
    } else if (type.startsWith('image/png')) {
      return <image src={url} alt="preview" />;
    } else {
      return null;
    }
  } else {
    return <InboxOutlined />;
  }
}
