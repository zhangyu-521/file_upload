import { useRef } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import './FileUpload.css';
import useDrag from './useDrag';
export default function FileUploader() {
  const uploadContainerRef = useRef(null);
  const { selectFile, filePreview } = useDrag(uploadContainerRef);
  return (
    <div className="upload-container" ref={uploadContainerRef}>
      <div>{renderFilePreview(filePreview)}</div>
    </div>
  );
}

function renderFilePreview(filePreview) {
  const { url, type } = filePreview;
  if (url) {
    if (type.startsWith('video/')) {
      return <video src={url} alt="preview" controls />;
    } else if (type.startsWith('image/png')) {
      return <img src={url} alt="preview" />;
    } else {
      return null;
    }
  } else {
    return <InboxOutlined />;
  }
}
