const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const mdns = require('mdns-js');
const http = require('http');
const fs = require('fs');
const os = require('os');
let mainWindow = null;
let tray = null;
const port = 3000;

const fileStreams = new Map();

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const fileName = req.headers['file-name'];
    const chunkIndex = parseInt(req.headers['chunk-index']);
    const totalChunks = parseInt(req.headers['total-chunks']);
    const fileId = `${fileName}-${Date.now()}`; // 고유 파일 ID 생성

    if (!fileStreams.has(fileId)) {
      const filePath = path.join(os.tmpdir(), `shared-${Date.now()}-${fileName}`);
      fileStreams.set(fileId, {
        path: filePath,
        stream: fs.createWriteStream(filePath),
        receivedChunks: 0,
        totalChunks,
      });
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
        mainWindow.webContents.send('file-received', { path: fileData.path, name: fileName });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Chunk received');
      }
    });

    req.on('error', (err) => {
      res.writeHead(500);
      res.end('Server error');
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
  const service = mdns.createAdvertisement(mdns.tcp('intra-share'), port, {
    name: os.hostname(),
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
        });
      }
    }
  });
}

app.whenReady().then(() => {
  server.listen(port, () => console.log(`Server running on port ${port}`));
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