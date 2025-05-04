import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function useSettings() {
  const [settings, setSettings] = useState({
    autoAccept: false,
    bandwidthLimit: 0,
    disableNotifications: false,
    savePath: '',
    defaultTheme: 'dark',
    autoUpdateCheck: true,
    maxFileSize: 10 * 1024 * 1024 * 1024,
    notificationSound: '',
    autoOrganize: false,
    savePathHistory: [],
    tempSavePath: '',
    pathEncryption: false,
    pathPermissions: 'rw',
    pathTags: {},
    fileTypePaths: {},
    soundVolume: 1.0,
    soundRepeat: false,
    soundFade: false,
    soundDelay: 0,
    soundMute: false,
    soundHistory: [],
  });
  const [theme, setTheme] = useState('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    ipcRenderer.on('settings', (event, updatedSettings) => {
      setSettings(updatedSettings);
      setTheme(updatedSettings.defaultTheme);
    });
    ipcRenderer.send('get-settings');
  }, []);

  const updateSettings = (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    ipcRenderer.send('update-settings', updatedSettings);
  };

  return { settings, updateSettings, theme, setTheme, isAuthenticated, setIsAuthenticated, showSettings, setShowSettings };
}

export default useSettings;
