const winston = require('winston');
const sound = require('sound-play');
const { getSettings } = require('./settingsManager');

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

const diagnosticLogQueue = require('async').queue((logEntry, callback) => {
  logger.info(logEntry.message);
  callback();
}, 1);

function log(message, level = 'info') {
  diagnosticLogQueue.push({ message, level });
}

function setupNotificationListeners(mainWindow) {
  const settings = getSettings().settings;
  const soundSettings = getSettings().notificationSoundSettings;

  // 알림 사운드 재생
  const playNotificationSound = (type) => {
    if (settings.disableNotifications || soundSettings.soundMute) return;
    const soundOptions = {
      volume: soundSettings.soundVolume,
      loop: soundSettings.soundRepeat,
      fade: soundSettings.soundFade,
      delay: soundSettings.soundDelay,
    };
    setTimeout(() => {
      sound.play(settings.notificationSound, soundOptions).catch((err) => console.error('Sound play error:', err));
    }, soundOptions.delay);
  };

  // IPC 이벤트 리스너
  require('electron').ipcMain.on('notification', (event, { message, type }) => {
    if (type === 'success') playNotificationSound(type);
    mainWindow.webContents.send('notification', { message, type });
  });
}

module.exports = { log, setupNotificationListeners };
