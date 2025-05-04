const Store = require('electron-store');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { log } = require('./notificationManager');

const store = new Store();

function setupSettings() {
  if (!store.has('transferHistory')) {
    store.set('transferHistory', { sent: [], received: [] });
  }
  if (!store.has('settings')) {
    store.set('settings', {
      autoAccept: false,
      bandwidthLimit: 0,
      disableNotifications: false,
      savePath: os.tmpdir(),
      defaultTheme: 'dark',
      autoUpdateCheck: true,
      maxFileSize: 10 * 1024 * 1024 * 1024,
      notificationSound: path.join(__dirname, 'notification.mp3'),
      autoOrganize: false,
      savePathHistory: [],
      tempSavePath: os.tmpdir(),
      pathEncryption: false,
      pathPermissions: 'rw',
      pathTags: {},
      fileTypePaths: {},
    });
  }
  if (!store.has('users')) {
    store.set('users', { admin: crypto.createHash('sha256').update('password123').digest('hex') });
  }
  if (!store.has('deviceAliases')) {
    store.set('deviceAliases', {});
  }
  if (!store.has('offlineQueue')) {
    store.set('offlineQueue', []);
  }
  if (!store.has('scheduledTransfers')) {
    store.set('scheduledTransfers', []);
  }
  if (!store.has('notificationSoundSettings')) {
    store.set('notificationSoundSettings', {
      soundVolume: 1.0,
      soundRepeat: false,
      soundFade: false,
      soundDelay: 0,
      soundMute: false,
      soundHistory: [],
    });
  }
}

function getSettings() {
  return store.store;
}

function updateTransferHistory(type, item) {
  const history = store.get('transferHistory');
  history[type].push(item);
  store.set('transferHistory', history);
}

function logSavePathChange(newPath) {
  log(`Save path changed to: ${newPath}`, 'info');
}

module.exports = { setupSettings, getSettings, updateTransferHistory, logSavePathChange };
