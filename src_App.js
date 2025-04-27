import React, { useState, useEffect } from 'react';
import './App.css';

const { ipcRenderer } = window.require('electron');

function App() {
  const [devices, setDevices] = useState([]);
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // 동적 청크 크기 계산 함수
  const getChunkSize = (fileSize) => {
    if (fileSize < 1024 * 1024) return 64 * 1024; // 1MB 미만: 64KB
    if (fileSize < 100 * 1024 * 1024) return 512 * 1024; // 100MB 미만: 512KB
    if (fileSize < 1024 * 1024 * 1024) return 1024 * 1024; // 1GB 미만: 1MB
    return 5 * 1024 * 1024; // 1GB 이상: 5MB
  };

  useEffect(() => {
    ipcRenderer.on('device-found', (event, device) => {
      setDevices((prev) => {
        if (!prev.some((d) => d.name === device.name)) {
          return [...prev, device];
        }
        return prev;
      });
    });

    ipcRenderer.on('file-received', (event, file) => {
      setFiles((prev) => [...prev, file]);
      setNotifications((prev) => [...prev, { message: `File received: ${file.name}`, type: 'success' }]);
    });

    ipcRenderer.on('notification', (event, { message, type }) => {
      setNotifications((prev) => [...prev, { message, type }]);
    });

    return () => {
      ipcRenderer.removeAllListeners('device-found');
      ipcRenderer.removeAllListeners('file-received');
      ipcRenderer.removeAllListeners('notification');
    };
  }, []);

  const handleDrop = (device) => async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fileSize = file.size;
      const CHUNK_SIZE = getChunkSize(fileSize); // 동적 청크 크기 계산
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      try {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = file.slice(start, end);

          const arrayBuffer = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(chunk);
          });

          const response = await fetch(`http://${device.host}:${device.port}/upload`, {
            method: 'POST',
            headers: {
              'file-name': file.name,
              'chunk-index': i,
              'total-chunks': totalChunks,
            },
            body: arrayBuffer,
          });

          if (!response.ok) {
            throw new Error(`Failed to send chunk ${i + 1}/${totalChunks}`);
          }
        }
        setNotifications((prev) => [...prev, { message: `File sent to ${device.name}`, type: 'success' }]);
      } catch (err) {
        setNotifications((prev) => [...prev, { message: `Failed to send file: ${err.message}`, type: 'error' }]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drop-target');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drop-target');
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>Devices</h2>
        {devices.map((device) => (
          <div
            key={device.name}
            className="device"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(device)}
          >
            <img src="device-icon.png" alt="Device" />
            <p>{device.name}</p>
          </div>
        ))}
      </div>
      <div className="main-panel">
        <h1>Intra Share</h1>
        <div className="file-list">
          <p>Received Files:</p>
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <p>{file.name} (Saved at: {file.path})</p>
            </div>
          ))}
        </div>
      </div>
      <div className="notification-container">
        {notifications.map((notif, index) => (
          <div
            key={index}
            className={`notification ${notif.type}`}
            onAnimationEnd={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
          >
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;