import { useRef, useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Button, message, Progress } from 'antd';
import './FileUpload.css';
import useDrag from './useDrag';
import { getChunkSize } from './constant';
import axiosInstance from './axiosInstance';
export default function FileUploader() {
  const uploadContainerRef = useRef(null);
  const { selectFile, filePreview } = useDrag(uploadContainerRef);
  let [uploadProgress, setUploadProgress] = useState({});
  const handleUpload = async () => {
    if (!selectFile) {
      message.error('没有选择文件');
      return;
    }

    const fileName = await getFileName(selectFile);
    console.log('fileName', fileName);

    await uploadFile(selectFile, fileName, setUploadProgress);
  };
  const renderButton = () => {
    return <Button onClick={handleUpload}>上传</Button>;
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
async function uploadFile(file, fileName, setUploadProgress) {
  // 切片
  const chunks = createFileChunks(file, fileName);
  console.log(chunks);

  // 并行上传
  const requests = chunks.map(({ chunk, chunkFileName }) => {
    return createRequest(fileName, chunk, chunkFileName, setUploadProgress);
  });

  try {
    // 并行上传
    await Promise.all(requests);
    // 合并请求
    await axiosInstance.get(`/merge/${fileName}`);
    message.success('文件上传完成!');
  } catch (error) {
    console.error(error);
    message.error('文件上传失败!');
  }
}

function createRequest(fileName, chunk, chunkFileName, setUploadProgress) {
  console.log(`🚀 Starting upload: ${chunkFileName} (${chunk.size} bytes)`);

  return axiosInstance.post(`/upload/${fileName}`, chunk, {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    params: {
      chunkFileName,
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
