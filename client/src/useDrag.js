import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { FILE_SIZE } from './constant';

export default function useDrag(uploadContainerRef) {
  const [SelectFile, setSelectFile] = useState(null);
  const [filePreview, setFilePreview] = useState({ url: null, type: null });
  const checkFile = (files) => {
    const file = files[0];
    console.log(file);
    if (!file) {
      message.error('没有选择任何文件');
      return false;
    }

    if (file.size > FILE_SIZE) {
      message.error('文件大小超过限制，不能超过2G');
      return false;
    }

    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      message.error('文件类型为图片或视频，请选择其他文件');
      return false;
    }

    setSelectFile(file);
    return true;
  };
  const handleDrag = useCallback((event) => {
    event.preventDefault(); // 阻止默认行为
    event.stopPropagation(); // 阻止事件传播
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault(); // 阻止默认行为
    event.stopPropagation(); // 阻止事件传播
    checkFile(event.dataTransfer.files);
    const files = event.dataTransfer.files;
    console.log(files);
  }, []);

  useEffect(() => {
    if (!SelectFile) return;
    const url = URL.createObjectURL(SelectFile);
    setFilePreview({ url, type: SelectFile.type });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [SelectFile]);

  useEffect(() => {
    const uploadContainer = uploadContainerRef.current;
    uploadContainer.addEventListener('dragenter', handleDrag);
    uploadContainer.addEventListener('dragover', handleDrag);
    uploadContainer.addEventListener('drop', handleDrop);
    uploadContainer.addEventListener('dragleave', handleDrag);

    return () => {
      uploadContainer.removeEventListener('dragenter', handleDrag);
      uploadContainer.removeEventListener('dragover', handleDrag);
      uploadContainer.removeEventListener('drop', handleDrop);
      uploadContainer.removeEventListener('dragleave', handleDrag);
    };
  }, []);

  // 点击上传
  useEffect(() => {
    const uploadContainer = uploadContainerRef.current;
    uploadContainer.addEventListener('click', () => {
      const fileinput = document.createElement('input');
      fileinput.type = 'file';
      fileinput.style.display = 'none';
      document.body.appendChild(fileinput);
      fileinput.click();
      fileinput.onchange = (event) => {
        checkFile(event.target.files);
      };
    });
  }, []);

  const resetFileStatus = () => {
    setFilePreview({ url: null, type: null });
    setSelectFile(null);
  };

  return {
    filePreview,
    selectFile: SelectFile,
    resetFileStatus,
  };
}
