const mdns = require('mdns-js');
const { getSettings } = require('./settingsManager');
const { log } = require('./notificationManager');

// 내부망 IP 범위 확인 함수 (fileUtils.js와 동일)
function isInternalIp(host) {
  const internalRanges = [
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
    /^localhost$/,
  ];
  return internalRanges.some((range) => range.test(host));
}

const port = 3000;
const deviceStatus = new Map();

function discoverDevices(mainWindow) {
  const token = require('./server').generateToken();
  const tokens = require('./server').tokens;

  tokens.set(token, { timestamp: Date.now() });

  const service = mdns.createAdvertisement(mdns.tcp('intra-share'), port, {
    name: require('os').hostname(),
    txt: { token },
  });
  service.start();

  const browser = mdns.createBrowser(mdns.tcp('intra-share'));
  browser.on('ready', () => browser.discover());
  browser.on('update', (service) => {
    if (service.name !== require('os').hostname()) {
      const device = {
        name: service.name,
        host: service.addresses[0],
        port: service.port,
        token: service.txt?.token || '',
      };

      // 내부망 IP인지 확인
      if (!isInternalIp(device.host)) {
        log(`External device detected: ${device.host}, ignoring`, 'warn');
        mainWindow.webContents.send('notification', { message: 'External device access is not allowed', type: 'error' });
        return;
      }

      deviceStatus.set(service.name, { host: device.host, port: device.port });
      checkDeviceStatus(device.host, device.port).then((isOnline) => {
        mainWindow.webContents.send('device-found', {
          ...device,
          status: isOnline ? 'Online' : 'Offline',
        });

        if (isOnline) {
          const queue = getSettings().offlineQueue;
          const relevantTransfers = queue.filter((t) => t.deviceName === device.name);
          relevantTransfers.forEach((transfer) => {
            mainWindow.webContents.send('process-offline-transfer', transfer);
          });
          getSettings().offlineQueue = queue.filter((t) => t.deviceName !== device.name);
        }
      });
    }
  });

  setInterval(() => {
    for (const [name, { host, port }] of deviceStatus.entries()) {
      checkDeviceStatus(host, port).then((isOnline) => {
        mainWindow.webContents.send('device-status-update', { name, status: isOnline ? 'Online' : 'Offline' });
      });
    }

    const scheduled = getSettings().scheduledTransfers;
    const now = Date.now();
    const dueTransfers = scheduled.filter((t) => new Date(t.scheduleTime).getTime() <= now);
    dueTransfers.forEach((transfer) => {
      mainWindow.webContents.send('process-scheduled-transfer', transfer);
    });
    getSettings().scheduledTransfers = scheduled.filter((t) => new Date(t.scheduleTime).getTime() > now);
  }, 10000);
}

function checkDeviceStatus(host, port) {
  return new Promise((resolve) => {
    // 내부망 IP인지 확인
    if (!isInternalIp(host)) {
      resolve(false);
      return;
    }

    const req = require('https').request(
      { host, port, path: '/ping', method: 'GET', rejectUnauthorized: false },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.end();
  });
}

module.exports = { discoverDevices, checkDeviceStatus };
