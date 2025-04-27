const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const mdns = require('mdns-js');
const https = require('https');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const winston = require('winston');
require('winston-daily-rotate-file');

// 로깅 설정
const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/transfer-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [transport],
});

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

let mainWindow = null;
let tray = null;
const port = 3000;
const fileStreams = new Map();
const tokens = new Map();

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

// 파일 다운로드/열기 요청 처리
ipcMain.on('open-file', (event, filePath) => {
  shell.openPath(filePath).catch((err) => {
    logger.error(`Failed to open file ${filePath}: ${err.message}`);
    mainWindow.webContents.send('notification', { message: `Failed to open file: ${err.message}`, type: 'error' });
  });
});

const server = https.createServer(certOptions, (req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    // 토큰 검증
    const token = req.headers['authorization'];
    if (!token || !tokens.has(token)) {
      res.writeHead(401);
      res.end('Unauthorized');
      logger.warn(`Unauthorized access attempt: ${req.socket.remoteAddress}`);
      mainWindow.webContents.send('notification', { message: 'Unauthorized access attempt', type: 'error' });
      return;
    }

    // 파일 이름 검증
    const fileName = req.headers['file-name'];
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!fileName || typeof fileName !== 'string' || fileName.length > 255 || fileName !== sanitizedFileName) {
      res.writeHead(400);
      res.end('Invalid file name');
      logger.warn(`Invalid file name from ${req.socket.remoteAddress}: ${fileName}`);
      mainWindow.webContents.send('notification', { message: 'Invalid file name', type: 'error' });
      return;
    }

    const chunkIndex = parseInt(req.headers['chunk-index']);
    const totalChunks = parseInt(req.headers['total-chunks']);
    if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || totalChunks <= 0) {
      res.writeHead(400);
      res.end('Invalid chunk data');
      logger.warn(`Invalid chunk data from ${req.socket.remoteAddress}`);
      mainWindow.webContents.send('notification', { message: 'Invalid chunk data', type: 'error' });
      return;
    }

    const fileId = `${sanitizedFileName}-${Date.now()}`;
    if (!fileStreams.has(fileId)) {
      const filePath = path.join(os.tmpdir(), `shared-${Date.now()}-${sanitizedFileName}`);
      try {
        const diskSpace = fs.statfsSync(os.tmpdir()).bfree * fs.statfsSync(os.tmpdir()).bsize;
        if (diskSpace < 1024 * 1024) { // 1MB 미만
          throw new Error('Insufficient disk space');
        }
        fileStreams.set(fileId, {
          path: filePath,
          stream: fs.createWriteStream(filePath),
          receivedChunks: 0,
          totalChunks,
        });
      } catch (err) {
        res.writeHead(500);
        res.end('Server error');
        logger.error(`Failed to create file stream: ${err.message}`);
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
      fileData.stream.write(buffer);
      fileData.receivedChunks++;

      if (fileData.receivedChunks === fileData.totalChunks) {
        fileData.stream.end();
        fileStreams.delete(fileId);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('File received');
        logger.info(`File received: ${sanitizedFileName} from ${req.socket.remoteAddress}`);
        mainWindow.webContents.send('file-received', { path: fileData.path, name: sanitizedFileName });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Chunk received');
      }
    });

    req.on('error', (err) => {
      res.writeHead(500);
      res.end('Server error');
      logger.error(`Error receiving file from ${req.socket.remoteAddress}: ${err.message}`);
      mainWindow.webContents.send('notification', { message: `Failed to receive file: ${err.message}`, type: 'error' });
      fileStreams.delete(fileId);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Intra Share', click: () => {
      if (!mainWindow) createWindow();
      mainWindow.show();
    }},
    { label: 'Quit', click: () => {
      app.quit();
    }},
  ]);
  tray.setToolTip('Intra Share');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!mainWindow) createWindow();
    mainWindow.show();
  });
}

function discoverDevices() {
  const token = generateToken();
  tokens.set(token, { timestamp: Date.now() });

  const service = mdns.createAdvertisement(mdns.tcp('intra-share'), port, {
    name: os.hostname(),
    txt: { token },
  });
  service.start();

  const browser = mdns.createBrowser(mdns.tcp('intra-share'));
  browser.on('ready', () => browser.discover());
  browser.on('update', (service) => {
    if (service.name !== os.hostname()) {
      if (mainWindow) {
        mainWindow.webContents.send('device-found', {
          name: service.name,
          host: service.addresses[0],
          port: service.port,
          token: service.txt?.token || '',
        });
      }
    }
  });
}

app.whenReady().then(() => {
  server.listen(port, () => console.log(`HTTPS Server running on port ${port}`));
  createWindow();
  createTray();
  discoverDevices();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app running in tray on Windows
  }
});

app.on('quit', () => {
  server.close();
  tray = null;
});