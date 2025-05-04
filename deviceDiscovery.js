const mdns = require('mdns-js');
const { getSettings } = require('./settingsManager');
const { log } = require('./notificationManager');

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
    const req = https.request(
      { host, port, path: '/ping', method: 'GET', rejectUnauthorized: false },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.end();
  });
}

module.exports = { discoverDevices, checkDeviceStatus };
