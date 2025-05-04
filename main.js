const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { startServer } = require('./server');
const { discoverDevices } = require('./deviceDiscovery');
const { setupSettings } = require('./settingsManager');
const { setupNotificationListeners } = require('./notificationManager');

let mainWindow = null;
let tray = null;

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

  const settings = require('electron-store')();
  const autoUpdateCheck = settings.get('settings.autoUpdateCheck', true);
  if (autoUpdateCheck) {
    setTimeout(() => {
      mainWindow.webContents.send('notification', { message: 'No updates available (mock)', type: 'info' });
    }, 5000);
  }
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Intra Share', click: () => {
      if (!mainWindow) createWindow();
      mainWindow.show();
    }},
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('Intra Share');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!mainWindow) createWindow();
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  setupSettings();
  setupNotificationListeners(mainWindow);
  const server = startServer(mainWindow);
  createWindow();
  createTray();
  discoverDevices(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Windows에서 트레이에 유지
  }
});

app.on('quit', () => {
  tray = null;
});
