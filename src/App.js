import React, { useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import Devices from './components/Devices';
import Files from './components/Files';
import Notifications from './components/Notifications';
import TransferProgress from './components/TransferProgress';
import SettingsPanel from './components/SettingsPanel';
import TransferHistory from './components/TransferHistory';
import useSettings from './hooks/useSettings';
import useDevices from './hooks/useDevices';

function App() {
  const { settings, theme, isAuthenticated, setIsAuthenticated, setTheme, showSettings, setShowSettings } = useSettings();
  const { devices } = useDevices();
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transferProgress, setTransferProgress] = useState([]);

  if (!isAuthenticated) {
    return <Auth setIsAuthenticated={setIsAuthenticated} theme={theme} settings={settings} />;
  }

  return (
    <div
      className={`app ${theme}`}
      style={{
        fontFamily: settings.themeFont || 'Arial',
        backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
        opacity: settings.themeTransparency || 1,
        filter: settings.invertColors ? 'invert(1)' : 'none',
        brightness: settings.themeBrightness || 1,
      }}
    >
      <header className="app-header">
        <h1>Intra Share</h1>
        <button className="settings-toggle" onClick={() => setShowSettings(!showSettings)}>
          ⚙️
        </button>
      </header>
      <Notifications notifications={notifications} setNotifications={setNotifications} />
      <Devices devices={devices} setFiles={setFiles} setNotifications={setNotifications} setTransferProgress={setTransferProgress} />
      <Files files={files} setNotifications={setNotifications} />
      <TransferProgress transferProgress={transferProgress} setTransferProgress={setTransferProgress} setNotifications={setNotifications} />
      {showSettings && <SettingsPanel setNotifications={setNotifications} />}
      <TransferHistory setNotifications={setNotifications} />
    </div>
  );
}

export default App;
