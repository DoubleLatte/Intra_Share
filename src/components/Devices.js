import React, { useState } from 'react';
import { i18n } from '../utils/i18n';
import useSettings from '../hooks/useSettings';
import { sendFile } from '../utils/fileUtils';

function Devices({ devices, setFiles, setNotifications, setTransferProgress }) {
  const { settings } = useSettings();
  const [draggedFiles, setDraggedFiles] = useState([]);

  const handleDrop = (device) => async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
    setDraggedFiles([]);
    const droppedFiles = Array.from(e.dataTransfer.files);

    for (const file of droppedFiles) {
      // 네트워크 속도 없이 파일 전송
      sendFile(device, file, settings, setTransferProgress, setNotifications);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drop-target');
    const files = Array.from(e.dataTransfer.items).map((item) => item.getAsFile());
    setDraggedFiles(files);
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drop-target');
    setDraggedFiles([]);
  };

  return (
    <div className="devices">
      <h2>{i18n.t('devices')}</h2>
      {devices.map((device) => (
        <div
          key={device.name}
          className="device"
          onDrop={handleDrop(device)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {device.name} ({device.status})
        </div>
      ))}
    </div>
  );
}

export default Devices;
