import React, { useState } from 'react';
import Devices from './components/Devices';
import Files from './components/Files';
import Notifications from './components/Notifications';
import TransferProgress from './components/TransferProgress';
import SettingsPanel from './components/SettingsPanel';
import useSettings from './hooks/useSettings';
import useDevices from './hooks/useDevices';
import './App.css';

function App() {
  const { settings, setSettings } = useSettings();
  const { devices } = useDevices();
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transferProgress, setTransferProgress] = useState([]);

  // 테마 스타일 동적 생성
  const getThemeStyles = () => {
    const themeStyles = {
      '--background-color': settings.defaultTheme === 'dark' ? '#1e1e1e' : settings.defaultTheme === 'highContrast' ? '#000000' : '#f5f5f5',
      '--text-color': settings.defaultTheme === 'dark' ? '#ffffff' : settings.defaultTheme === 'highContrast' ? '#ffffff' : '#333333',
      '--container-bg': settings.defaultTheme === 'dark' ? '#2d2d2d' : settings.defaultTheme === 'highContrast' ? '#111111' : '#ffffff',
      '--primary-color': settings.customThemeColor || '#007bff',
      '--opacity': settings.themeTransparency || 1,
      '--filter': `brightness(${settings.themeBrightness || 1}) ${settings.invertColors ? 'invert(1)' : ''}`,
      '--button-border-radius': settings.buttonStyle === 'rounded' ? '4px' : '0px',
    };
    return themeStyles;
  };

  return (
    <div className="app-container" style={getThemeStyles()}>
      <Devices
        devices={devices}
        setFiles={setFiles}
        setNotifications={setNotifications}
        setTransferProgress={setTransferProgress}
      />
      <Files files={files} setFiles={setFiles} setNotifications={setNotifications} />
      <Notifications notifications={notifications} setNotifications={setNotifications} />
      <TransferProgress
        transferProgress={transferProgress}
        setTransferProgress={setTransferProgress}
        setNotifications={setNotifications}
      />
      <SettingsPanel settings={settings} setSettings={setSettings} />
    </div>
  );
}

export default App;