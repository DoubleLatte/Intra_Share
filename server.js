const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const path = require('path');
const { organizeFile, encryptPath, calculateFileHash, decompressFile, decryptBuffer } = require('./fileManager');
const { getSettings, updateTransferHistory } = require('./settingsManager');
const { log } = require('./notificationManager');

const port = 3000;
const tokens = new Map();
let mainWindow = null;
const fileStreams = new Map();
const pendingFiles = new Map();

// 토큰 관리
const generateToken = () => crypto.randomBytes(16).toString('hex');
setInterval(() => {
  const now = Date.now();
  for (const [token, { timestamp }] of tokens.entries()) {
    if (now - timestamp > 3600 * 1000) {
      tokens.delete(token);
    }
  }
}, 60 * 1000);

// 자체 서명 인증서
const certOptions = {
  key: fs.existsSync('key.pem') ? fs.readFileSync('key.pem') : crypto.randomBytes(32).toString('hex'),
  cert: fs.existsSync('cert.pem') ? fs.readFileSync('cert.pem') : crypto.randomBytes(32).toString('hex'),
};
if (!fs.existsSync('key.pem') || !fs.existsSync('cert.pem')) {
  const { execSync } = require('child_process');
  execSync('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"');
  certOptions.key = fs.readFileSync('key.pem');
  certOptions.cert = fs.readFileSync('cert.pem');
}

function startServer(window) {
  mainWindow = window;
  const server = https.createServer(certOptions, handleRequest);
  server.listen(port, () => console.log(`HTTPS Server running on port ${port}`));
  return server;
}

function handleRequest(req, res) {
  if (req.method === 'POST' && req.url === '/upload') {
    const sessionId = req.headers['session-id'];
    const sessionCache = new NodeCache({ stdTTL: 3600 });
    if (!sessionId || !sessionCache.get(sessionId)) {
      res.writeHead(401);
      res.end('Invalid session');
      log(`Invalid session: ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Invalid session', type: 'error' });
      return;
    }

    const authHeader = req.headers['user-auth'];
    if (authHeader) {
      const [username, password] = Buffer.from(authHeader, 'base64').toString().split(':');
      const users = getSettings().users;
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (!users[username] || users[username] !== hashedPassword) {
        res.writeHead(401);
        res.end('Unauthorized user');
        log(`Unauthorized user access attempt: ${username}`, 'warn');
        mainWindow.webContents.send('notification', { message: 'Unauthorized user access attempt', type: 'error' });
        return;
      }
    } else {
      res.writeHead(401);
      res.end('Missing user authentication');
      log(`Missing user authentication: ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Missing user authentication', type: 'error' });
      return;
    }

    const token = req.headers['authorization'];
    if (!token || !tokens.has(token)) {
      res.writeHead(401);
      res.end('Unauthorized');
      log(`Unauthorized access attempt: ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Unauthorized access attempt', type: 'error' });
      return;
    }

    const fileName = req.headers['file-name'];
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!fileName || typeof fileName !== 'string' || fileName.length > 255 || fileName !== sanitizedFileName) {
      res.writeHead(400);
      res.end('Invalid file name');
      log(`Invalid file name from ${req.socket.remoteAddress}: ${fileName}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Invalid file name', type: 'error' });
      return;
    }

    const fileSize = parseInt(req.headers['file-size']);
    const settings = getSettings().settings;
    if (fileSize > settings.maxFileSize) {
      res.writeHead(413);
      res.end(`File size exceeds ${settings.maxFileSize / (1024 * 1024 * 1024)}GB limit`);
      log(`File size exceeds limit from ${req.socket.remoteAddress}: ${fileSize} bytes`, 'warn');
      mainWindow.webContents.send('notification', { message: `File size exceeds ${settings.maxFileSize / (1024 * 1024 * 1024)}GB limit`, type: 'error' });
      return;
    }

    const chunkIndex = parseInt(req.headers['chunk-index']);
    const totalChunks = parseInt(req.headers['total-chunks']);
    if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || totalChunks <= 0) {
      res.writeHead(400);
      res.end('Invalid chunk data');
      log(`Invalid chunk data from ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Invalid chunk data', type: 'error' });
      return;
    }

    const encryptionKey = req.headers['encryption-key'];
    if (!encryptionKey) {
      res.writeHead(400);
      res.end('Missing encryption key');
      log(`Missing encryption key from ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Missing encryption key', type: 'error' });
      return;
    }

    const fileHash = req.headers['file-hash'];
    if (!fileHash) {
      res.writeHead(400);
      res.end('Missing file hash');
      log(`Missing file hash from ${req.socket.remoteAddress}`, 'warn');
      mainWindow.webContents.send('notification', { message: 'Missing file hash', type: 'error' });
      return;
    }

    const fileId = `${sanitizedFileName}-${Date.now()}`;
    if (!fileStreams.has(fileId)) {
      const filePath = path.join(settings.savePath, `shared-${Date.now()}-${sanitizedFileName}`);
      try {
        const diskSpace = fs.statfsSync(settings.savePath).bfree * fs.statfsSync(settings.savePath).bsize;
        if (diskSpace < 1024 * 1024) {
          throw new Error('Insufficient disk space');
        }
        fileStreams.set(fileId, {
          path: filePath,
          name: sanitizedFileName,
          remoteAddress: req.socket.remoteAddress,
          chunks: [],
          receivedChunks: 0,
          totalChunks,
          encryptionKey,
          hash: fileHash,
        });
      } catch (err) {
        res.writeHead(500);
        res.end('Server error');
        log(`Failed to create file stream: ${err.message}`, 'error');
        mainWindow.webContents.send('notification', { message: `Failed to receive file: ${err.message}`, type: 'error' });
        return;
      }
    }

    const fileData = fileStreams.get(fileId);
    let chunkData = [];

    req.on('data', (chunk) => {
      chunkData.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunkData);
      fileData.chunks.push(buffer);
      fileData.receivedChunks++;

      if (fileData.receivedChunks === fileData.totalChunks) {
        if (settings.autoAccept) {
          fileData.stream = fs.createWriteStream(fileData.path);
          fileData.chunks.forEach((chunk) => {
            const decryptedChunk = decryptBuffer(chunk, fileData.encryptionKey);
            const decompressedChunk = decompressFile(decryptedChunk);
            fileData.stream.write(decompressedChunk);
          });
          fileData.stream.end();

          const receivedHash = calculateFileHash(fs.readFileSync(fileData.path));
          if (receivedHash !== fileData.hash) {
            log(`File hash mismatch: ${fileData.name}`, 'error');
            mainWindow.webContents.send('notification', { message: `File hash mismatch: ${fileData.name}`, type: 'error' });
            return;
          }

          const organizedPath = organizeFile(fileData.path);
          const finalPath = encryptPath(organizedPath);
          fileStreams.delete(fileId);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('File received');
          log(`File auto-received: ${sanitizedFileName} from ${req.socket.remoteAddress}`, 'info');
          mainWindow.webContents.send('file-received', { path: finalPath, name: sanitizedFileName });
          updateTransferHistory('received', { name: sanitizedFileName, path: finalPath, timestamp: new Date().toISOString() });
        } else {
          pendingFiles.set(fileId, fileData);
          fileStreams.delete(fileId);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('File pending approval');
          log(`File pending approval: ${sanitizedFileName} from ${req.socket.remoteAddress}`, 'info');
          mainWindow.webContents.send('file-pending', { fileId, name: sanitizedFileName });
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Chunk received');
      }
    });

    req.on('error', (err) => {
      res.writeHead(500);
      res.end('Server error');
      log(`Error receiving file from ${req.socket.remoteAddress}: ${err.message}`, 'error');
      mainWindow.webContents.send('notification', { message: `Failed to receive file: ${err.message}`, type: 'error' });
      fileStreams.delete(fileId);
    });
  } else if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
}

module.exports = { startServer };
