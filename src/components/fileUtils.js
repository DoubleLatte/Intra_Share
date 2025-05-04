const crypto = window.require('crypto');
const pako = require('pako');
const xxhash = require('xxhash');
const axios = require('axios');
const { i18n } = require('./i18n');

// 내부망 IP 범위 확인 함수
function isInternalIp(host) {
  const internalRanges = [
    /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.x.x
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.x.x.x
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.x.x ~ 172.31.x.x
    /^localhost$/, // localhost 허용
  ];
  return internalRanges.some((range) => range.test(host));
}

function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

async function sendFile(device, file, settings, networkSpeed, setTransferProgress, setNotifications) {
  if (!settings.isAuthenticated) {
    setNotifications((prev) => [...prev, { message: i18n.t('unauthorized'), type: 'error', id: Date.now() }]);
    return;
  }

  if (file.size > settings.maxFileSize) {
    setNotifications((prev) => [...prev, { message: i18n.t('fileSizeExceeds', { name: file.name, limit: settings.maxFileSize / (1024 * 1024 * 1024) }), type: 'error', id: Date.now() }]);
    return;
  }

  // 내부망 IP인지 확인
  if (!isInternalIp(device.host)) {
    setNotifications((prev) => [...prev, { message: 'External network access is not allowed', type: 'error', id: Date.now() }]);
    return;
  }

  let fileBuffer = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(file);
    reader.readAsArrayBuffer(file);
  });

  const fileHash = xxhash.hash64(Buffer.from(fileBuffer), 0xCAFEBABE).toString('hex');
  const compressedBuffer = pako.deflate(fileBuffer);
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const encryptedBuffer = encryptBuffer(Buffer.from(compressedBuffer), encryptionKey);

  const fileSize = encryptedBuffer.length;
  const CHUNK_SIZE = getChunkSize(fileSize, networkSpeed, settings);
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const transferId = `${file.name}-${Date.now()}`;
  const cancelTransferRef = new Map();

  setTransferProgress((prev) => [
    ...prev,
    {
      transferId,
      fileName: file.name,
      deviceName: device.name,
      currentChunk: 0,
      totalChunks,
      percentage: 0,
      speed: 0,
    },
  ]);

  let retryCount = 0;
  const maxRetries = 3;

  const sendChunks = async () => {
    try {
      for (let i = 0; i < totalChunks; i++) {
        if (cancelTransferRef.get(transferId)?.cancelled) {
          throw new Error('Transfer cancelled by user');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunk = encryptedBuffer.slice(start, end);

        const startTime = Date.now();
        const response = await axios.post(
          `https://${device.host}:${device.port}/upload`,
          chunk,
          {
            headers: {
              'file-name': file.name,
              'file-size': file.size,
              'chunk-index': i,
              'total-chunks': totalChunks,
              'Authorization': device.token,
              'Encryption-Key': encryptionKey,
              'User-Auth': Buffer.from(`${settings.authUsername}:${settings.authPassword}`).toString('base64'),
              'Session-Id': settings.sessionId,
              'File-Hash': fileHash,
              'X-Encrypted-Request': 'true',
            },
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
            timeout: 5000, // 타임아웃 설정
          }
        );

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const speed = ((chunk.length / 1024 / 1024) / duration).toFixed(2);

        if (response.status !== 200) {
          throw new Error(`Failed to send chunk ${i + 1}/${totalChunks}: ${response.statusText}`);
        }

        setTransferProgress((prev) =>
          prev.map((prog) =>
            prog.transferId === transferId
              ? {
                  ...prog,
                  currentChunk: i + 1,
                  percentage: Math.round(((i + 1) / totalChunks) * 100),
                  speed,
                }
              : prog
          )
        );
      }

      setNotifications((prev) => [...prev, { message: i18n.t('fileSent', { name: file.name, device: device.name }), type: 'success', id: Date.now() }]);
    } catch (err) {
      if (retryCount < maxRetries && !err.message.includes('cancelled')) {
        retryCount++;
        setNotifications((prev) => [...prev, { message: i18n.t('retrying', { name: file.name, attempt: retryCount, maxRetries }), type: 'info', id: Date.now() }]);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return sendChunks();
      } else {
        if (device.status === 'Offline') {
          setNotifications((prev) => [...prev, { message: i18n.t('deviceOffline', { name: file.name }), type: 'info', id: Date.now() }]);
        } else {
          setNotifications((prev) => [...prev, { message: i18n.t('failedToSend', { name: file.name, error: err.message }), type: 'error', id: Date.now() }]);
        }
      }
    } finally {
      setTransferProgress((prev) => prev.filter((prog) => prog.transferId !== transferId));
    }
  };

  sendChunks();
}

function getChunkSize(fileSize, networkSpeed, settings) {
  let baseChunkSize;
  if (fileSize < 1024 * 1024) baseChunkSize = 64 * 1024;
  else if (fileSize < 100 * 1024 * 1024) baseChunkSize = 512 * 1024;
  else if (fileSize < 1024 * 1024 * 1024) baseChunkSize = 1024 * 1024;
  else baseChunkSize = 5 * 1024 * 1024;

  if (networkSpeed < 1) return Math.max(baseChunkSize / 2, 32 * 1024);
  if (networkSpeed > 50) return Math.min(baseChunkSize * 2, 10 * 1024 * 1024);
  if (settings.bandwidthLimit > 0) return Math.min(baseChunkSize, settings.bandwidthLimit * 1024);
  return baseChunkSize;
}

export { sendFile, getChunkSize };
