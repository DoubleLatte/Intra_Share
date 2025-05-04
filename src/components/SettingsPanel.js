import React, { useState } from 'react';
import { i18n } from '../utils/i18n';
import useSettings from '../hooks/useSettings';
const { ipcRenderer } = window.require('electron');

function SettingsPanel({ setNotifications }) {
  const { settings, updateSettings, setTheme } = useSettings();
  const [customThemeColor, setCustomThemeColor] = useState(settings.customThemeColor || '#569cd6');
  const [timeBasedTheme, setTimeBasedTheme] = useState(settings.timeBasedTheme || false);
  const [systemThemeSync, setSystemThemeSync] = useState(settings.systemThemeSync || false);
  const [themeFont, setThemeFont] = useState(settings.themeFont || 'Arial');
  const [themePreset, setThemePreset] = useState(settings.themePreset || 'default');
  const [backgroundImage, setBackgroundImage] = useState(settings.backgroundImage || '');
  const [buttonStyle, setButtonStyle] = useState(settings.buttonStyle || 'rounded');
  const [themeTransparency, setThemeTransparency] = useState(settings.themeTransparency || 1);
  const [invertColors, setInvertColors] = useState(settings.invertColors || false);
  const [themeBrightness, setThemeBrightness] = useState(settings.themeBrightness || 1);
  const [showShortcutHints, setShowShortcutHints] = useState(settings.showShortcutHints || false);

  const selectSavePath = () => ipcRenderer.send('select-save-path');
  const selectTempSavePath = () => ipcRenderer.send('select-temp-save-path');
  const selectNotificationSound = () => ipcRenderer.send('select-notification-sound');
  const previewSavePath = () => ipcRenderer.send('preview-save-path', settings.savePath);
  const shareSavePath = () => {
    const url = `file://${settings.savePath}`;
    navigator.clipboard.writeText(url).then(() => {
      setNotifications((prev) => [...prev, { message: 'Save path URL copied to clipboard', type: 'success', id: Date.now() }]);
    });
  };
  const testSound = () => {
    const sound = window.require('sound-play');
    sound.play(settings.notificationSound, {
      volume: settings.soundVolume,
      loop: settings.soundRepeat,
      fade: settings.soundFade,
      delay: settings.soundDelay,
    }).catch((err) => console.error('Sound play error:', err));
  };
  const saveTheme = () => {
    updateSettings({ customThemeColor, themeFont, themePreset, backgroundImage, buttonStyle, themeTransparency, invertColors, themeBrightness, showShortcutHints });
    setNotifications((prev) => [...prev, { message: 'Theme saved', type: 'success', id: Date.now() }]);
  };
  const exportTheme = () => {
    const themeData = { customThemeColor, themeFont, themePreset, backgroundImage, buttonStyle, themeTransparency, invertColors, themeBrightness, showShortcutHints };
    const blob = new Blob([JSON.stringify(themeData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.json';
    a.click();
    URL.revokeObjectURL(url);
    setNotifications((prev) => [...prev, { message: 'Theme exported', type: 'success', id: Date.now() }]);
  };

  return (
    <div className="settings-panel">
      <h2>{i18n.t('settings')}</h2>
      <label>{i18n.t('notificationDuration')}</label>
      <input
        type="number"
        value={settings.notificationDuration || 5000}
        onChange={(e) => updateSettings({ notificationDuration: parseInt(e.target.value) })}
      />
      <label>{i18n.t('autoAcceptFiles')}</label>
      <input
        type="checkbox"
        checked={settings.autoAccept}
        onChange={() => updateSettings({ autoAccept: !settings.autoAccept })}
      />
      <label>{i18n.t('disableNotifications')}</label>
      <input
        type="checkbox"
        checked={settings.disableNotifications}
        onChange={() => updateSettings({ disableNotifications: !settings.disableNotifications })}
      />
      <label>{i18n.t('bandwidthLimit')}</label>
      <input
        type="number"
        value={settings.bandwidthLimit}
        onChange={(e) => updateSettings({ bandwidthLimit: parseInt(e.target.value) })}
      />
      <label>{i18n.t('savePath')}</label>
      <input type="text" value={settings.savePath} readOnly />
      <button onClick={selectSavePath}>{i18n.t('changePath')}</button>
      <label>{i18n.t('defaultTheme')}</label>
      <select
        value={settings.defaultTheme}
        onChange={(e) => {
          setTheme(e.target.value);
          updateSettings({ defaultTheme: e.target.value });
        }}
      >
        <option value="dark">{i18n.t('dark')}</option>
        <option value="light">{i18n.t('light')}</option>
        <option value="highContrast">{i18n.t('highContrast')}</option>
      </select>
      <label>{i18n.t('autoCheckUpdates')}</label>
      <input
        type="checkbox"
        checked={settings.autoUpdateCheck}
        onChange={() => updateSettings({ autoUpdateCheck: !settings.autoUpdateCheck })}
      />
      <label>{i18n.t('maxFileSize')}</label>
      <input
        type="number"
        value={settings.maxFileSize / (1024 * 1024 * 1024)}
        onChange={(e) => updateSettings({ maxFileSize: parseInt(e.target.value) * 1024 * 1024 * 1024 })}
      />
      <label>{i18n.t('notificationSound')}</label>
      <input type="text" value={settings.notificationSound} readOnly />
      <button onClick={selectNotificationSound}>{i18n.t('changeSound')}</button>
      <label>{i18n.t('autoOrganizeFiles')}</label>
      <input
        type="checkbox"
        checked={settings.autoOrganize}
        onChange={() => updateSettings({ autoOrganize: !settings.autoOrganize })}
      />
      <label>{i18n.t('tempSavePath')}</label>
      <input type="text" value={settings.tempSavePath} readOnly />
      <button onClick={selectTempSavePath}>{i18n.t('changeTempPath')}</button>
      <label>{i18n.t('encryptPath')}</label>
      <input
        type="checkbox"
        checked={settings.pathEncryption}
        onChange={() => updateSettings({ pathEncryption: !settings.pathEncryption })}
      />
      <label>{i18n.t('syncPath')}</label>
      <input
        type="checkbox"
        checked={settings.pathSync}
        onChange={() => updateSettings({ pathSync: !settings.pathSync })}
      />
      <label>{i18n.t('backupPath')}</label>
      <input
        type="checkbox"
        checked={settings.pathBackup}
        onChange={() => updateSettings({ pathBackup: !settings.pathBackup })}
      />
      <label>{i18n.t('pathPermissions')}</label>
      <select
        value={settings.pathPermissions}
        onChange={(e) => updateSettings({ pathPermissions: e.target.value })}
      >
        <option value="ro">{i18n.t('readOnly')}</option>
        <option value="rw">{i18n.t('readWrite')}</option>
      </select>
      <label>{i18n.t('pathTags')}</label>
      <input
        type="text"
        value={settings.pathTags?.join(', ') || ''}
        onChange={(e) => updateSettings({ pathTags: e.target.value.split(',').map((tag) => tag.trim()) })}
      />
      <label>{i18n.t('searchPath')}</label>
      <input
        type="text"
        value={settings.searchPathQuery || ''}
        onChange={(e) => updateSettings({ searchPathQuery: e.target.value })}
      />
      <button onClick={previewSavePath}>{i18n.t('preview')}</button>
      <button onClick={shareSavePath}>{i18n.t('sharePath')}</button>
      <label>{i18n.t('soundVolume')}</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={settings.soundVolume || 1}
        onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
      />
      <label>{i18n.t('soundRepeat')}</label>
      <input
        type="checkbox"
        checked={settings.soundRepeat}
        onChange={() => updateSettings({ soundRepeat: !settings.soundRepeat })}
      />
      <label>{i18n.t('soundFade')}</label>
      <input
        type="checkbox"
        checked={settings.soundFade}
        onChange={() => updateSettings({ soundFade: !settings.soundFade })}
      />
      <label>{i18n.t('soundDelay')}</label>
      <input
        type="number"
        value={settings.soundDelay || 0}
        onChange={(e) => updateSettings({ soundDelay: parseInt(e.target.value) })}
      />
      <label>{i18n.t('soundMute')}</label>
      <input
        type="checkbox"
        checked={settings.soundMute}
        onChange={() => updateSettings({ soundMute: !settings.soundMute })}
      />
      <label>{i18n.t('soundHistory')}</label>
      <select>
        {settings.soundHistory?.map((sound, index) => (
          <option key={index} value={sound}>{sound}</option>
        ))}
      </select>
      <button onClick={testSound}>{i18n.t('testSound')}</button>
      <label>{i18n.t('customTheme')}</label>
      <input
        type="color"
        value={customThemeColor}
        onChange={(e) => setCustomThemeColor(e.target.value)}
      />
      <label>{i18n.t('timeBasedTheme')}</label>
      <input
        type="checkbox"
        checked={timeBasedTheme}
        onChange={() => {
          setTimeBasedTheme(!timeBasedTheme);
          updateSettings({ timeBasedTheme: !timeBasedTheme });
        }}
      />
      <label>{i18n.t('systemThemeSync')}</label>
      <input
        type="checkbox"
        checked={systemThemeSync}
        onChange={() => {
          setSystemThemeSync(!systemThemeSync);
          updateSettings({ systemThemeSync: !systemThemeSync });
        }}
      />
      <label>{i18n.t('themeFont')}</label>
      <input
        type="text"
        value={themeFont}
        onChange={(e) => {
          setThemeFont(e.target.value);
          updateSettings({ themeFont: e.target.value });
        }}
      />
      <label>{i18n.t('themePresets')}</label>
      <select
        value={themePreset}
        onChange={(e) => {
          setThemePreset(e.target.value);
          updateSettings({ themePreset: e.target.value });
        }}
      >
        <option value="default">{i18n.t('default')}</option>
        <option value="modern">{i18n.t('modern')}</option>
        <option value="classic">{i18n.t('classic')}</option>
      </select>
      <label>{i18n.t('backgroundImage')}</label>
      <input
        type="text"
        value={backgroundImage}
        onChange={(e) => {
          setBackgroundImage(e.target.value);
          updateSettings({ backgroundImage: e.target.value });
        }}
      />
      <label>{i18n.t('buttonStyle')}</label>
      <select
        value={buttonStyle}
        onChange={(e) => {
          setButtonStyle(e.target.value);
          updateSettings({ buttonStyle: e.target.value });
        }}
      >
        <option value="rounded">{i18n.t('rounded')}</option>
        <option value="square">{i18n.t('square')}</option>
      </select>
      <label>{i18n.t('themeTransparency')}</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={themeTransparency}
        onChange={(e) => {
          setThemeTransparency(e.target.value);
          updateSettings({ themeTransparency: e.target.value });
        }}
      />
      <label>{i18n.t('invertColors')}</label>
      <input
        type="checkbox"
        checked={invertColors}
        onChange={() => {
          setInvertColors(!invertColors);
          updateSettings({ invertColors: !invertColors });
        }}
      />
      <label>{i18n.t('themeBrightness')}</label>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={themeBrightness}
        onChange={(e) => {
          setThemeBrightness(e.target.value);
          updateSettings({ themeBrightness: e.target.value });
        }}
      />
      <label>{i18n.t('shortcutHints')}</label>
      <input
        type="checkbox"
        checked={showShortcutHints}
        onChange={() => {
          setShowShortcutHints(!showShortcutHints);
          updateSettings({ showShortcutHints: !showShortcutHints });
        }}
      />
      <button onClick={saveTheme}>{i18n.t('saveTheme')}</button>
      <button onClick={exportTheme}>{i18n.t('exportTheme')}</button>
    </div>
  );
}

export default SettingsPanel;
