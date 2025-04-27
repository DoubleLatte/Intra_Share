import React, { useState, useEffect } from 'react';
import './App.css';

const { ipcRenderer } = window.require('electron');

function App() {
  const [devices, setDevices] = useState([]);
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transferProgress, setTransferProgress] = useState(null);
  const [networkSpeed, setNetworkSpeed] = useState(0); // Mbps 단위

  // 네트워크 속도 측정 (간단한 시뮬레이션)
  useEffect(() => {
    const measureNetworkSpeed = () => {
      const startTime = Date.now();
      fetch('https://www.google.com')
        .then(() => {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000; // 초 단위
          const speedMbps = (8 / duration).toFixed(2); // 간단한 속도 계산 (Mbps)
          setNetworkSpeed(parseFloat(speedMbps));
        })
        .catch(() => setNetworkSpeed(1)); // 기본값
    };
    measureNetworkSpeed();
    const interval = setInterval(measureNetworkSpeed, 30000); // 30초마다 측정
    return () => clearInterval(interval);
  }, []);

  const getChunkSize = (fileSize) => {
    let baseChunkSize;
    if (fileSize < 1024 * 1024) baseChunkSize = 64 * 1024;
    else if (fileSize < 100 * 1024 * 1024) baseChunkSize = 512 * 1024;
    else if (fileSize < 1024 * 1024 * 1024) baseChunkSize = 1024 * 1024;
    else baseChunkSize = 5 * 1024 * 1024;

    // 네트워크 속도 기반 조정
    if (networkSpeed < 1) return Math.max(baseChunkSize / 2, 32 * 1024); // 느리면 청크 크기 감소
    if (networkSpeed > 50) return Math.min(baseChunkSize * 2, 10 * 1024 * 1024); // 빠르면 증가
    return baseChunkSize;
  };

  useEffect(() => {
    ipcRenderer.on('device-found', (event, device) => {
      setDevices((prev) => {
        if (!prev.some((d) => d.name === device.name)) {
          return [...prev, { ...device, status: 'Online' }];
        }
        return prev;
      });
    });

    ipcRenderer.on('file-received', (event, file) => {
      setFiles((prev) => [...prev, file]);
      setNotifications((prev) => [...prev, { message: `File received: ${file.name}`, type: 'success' }]);
      setTransferProgress(null);
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
      const CHUNK_SIZE = getChunkSize(fileSize);
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      setTransferProgress({
        fileName: file.name,
        deviceName: device.name,
        currentChunk: 0,
        totalChunks,
        percentage: 0,
      });

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

          const response = await fetch(`https://${device.host}:${device.port}/upload`, {
            method: 'POST',
            headers: {
              'file-name': file.name,
              'chunk-index': i,
              'total-chunks': totalChunks,
              'Authorization': device.token,
            },
            body: arrayBuffer,
          });

          if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized access');
            if (response.status === 400) throw new Error('Invalid request data');
            if (response.status === 500) throw new Error('Server error during file transfer');
            throw new Error(`Failed to send chunk ${i + 1}/${totalChunks}: ${response.statusText}`);
          }

          setTransferProgress((prev) => ({
            ...prev,
            currentChunk: i + 1,
            percentage: Math.round(((i + 1) / totalChunks) * 100),
          }));
        }
        setNotifications((prev) => [...prev, { message: `File sent to ${device.name}`, type: 'success' }]);
      } catch (err) {
        setTransferProgress(null);
        if (err.message.includes('Unauthorized')) {
          setNotifications((prev) => [...prev, { message: 'Unauthorized access', type: 'error' }]);
        } else if (err.message.includes('Invalid request')) {
          setNotifications((prev) => [...prev, { message: 'Invalid file or request', type: 'error' }]);
        } else if (err.message.includes('Server error')) {
          setNotifications((prev) => [...prev, { message: 'Server error: Please try again later', type: 'error' }]);
        } else {
          setNotifications((prev) => [...prev, { message: `Failed to send file: ${err.message}`, type: 'error' }]);
        }
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

  const closeNotification = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  const openFile = (filePath) => {
    ipcRenderer.send('open-file', filePath);
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
            <div className={`device-icon ${device.status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <p>{device.name} <span className="status">{device.status}</span></p>
          </div>
        ))}
      </div>
      <div className="main-panel">
        <h1>Intra Share</h1>
        {transferProgress && (
          <div className="transfer-progress">
            <div className="progress-header">
              <span>Sending to {transferProgress.deviceName}</span>
              <span>{transferProgress.percentage}%</span>
            </div>
            <div className="progress-file">{transferProgress.fileName}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${transferProgress.percentage}%` }}
              ></div>
            </div>
            <div className="progress-details">
              Chunk {transferProgress.currentChunk} of {transferProgress.totalChunks}
            </div>
          </div>
        )}
        <div className="file-list">
          <p>Received Files:</p>
          {files.map((file, index) => (
            <div key={index} className="file-item" onClick={() => openFile(file.path)}>
              <div className="file-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div>
                <p className="file-name">{file.name}</p>
                <p className="file-path">Saved at: {file.path}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="help-section">
          <p className="help-title">How to use:</p>
          <ul className="help-list">
            <li>Drag and drop files onto a device to send them</li>
            <li>Or click on a device to select files to send</li>
            <li>Received files appear in the list above</li>
          </ul>
        </div>
      </div>
      <div className="notification-container">
        {notifications.map((notif, index) => (
          <div key={index} className={`notification ${notif.type}`}>
            <span>{notif.message}</span>
            <button className="close-btn" onClick={() => closeNotification(index)}>X</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;