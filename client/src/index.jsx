import React from 'react';
import { createRoot } from 'react-dom/client';
import FileUploader from './FileUploader';

const root = createRoot(document.getElementById('root'));

root.render(<FileUploader />);
