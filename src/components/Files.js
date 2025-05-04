import React from 'react';
import { i18n } from '../utils/i18n';
const { ipcRenderer } = window.require('electron');

function Files({ files, setNotifications }) {
  const openFile = (filePath) => {
    ipcRenderer.send('open-file', filePath);
  };

  const previewImage = (filePath) => {
    const path = window.require('path');
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      setNotifications((prev) => [...prev, { message: `Previewing ${filePath}`, type: 'info', id: Date.now() }]);
    } else {
      setNotifications((prev) => [...prev, { message: 'Preview only available for images', type: 'info', id: Date.now() }]);
    }
  };

  return (
    <div className="files">
      <h2>{i18n.t('receivedFiles')}</h2>
      {files.map((file, index) => (
        <div key={index} className="file">
          {file.name} - {i18n.t('savedAt')} {file.path}
          <button onClick={() => openFile(file.path)}>{i18n.t('open')}</button>
          <button onClick={() => previewImage(file.path)}>{i18n.t('preview')}</button>
        </div>
      ))}
    </div>
  );
}

export default Files;
