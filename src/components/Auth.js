import React, { useState } from 'react';
import { i18n } from '../utils/i18n';

const { ipcRenderer } = window.require('electron');

function Auth({ setIsAuthenticated, theme, settings }) {
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const authenticateUser = () => {
    ipcRenderer.send('authenticate-user', { username: authUsername, password: authPassword });
  };

  ipcRenderer.on('auth-result', (event, { success }) => {
    setIsAuthenticated(success);
    if (!success) {
      // 알림은 Notifications 컴포넌트에서 처리
      ipcRenderer.send('notification', { message: i18n.t('authenticationFailed'), type: 'error' });
    }
  });

  return (
    <div
      className={`app ${theme}`}
      style={{
        fontFamily: settings.themeFont || 'Arial',
        backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
        opacity: settings.themeTransparency || 1,
        filter: settings.invertColors ? 'invert(1)' : 'none',
      }}
    >
      <div className="auth-container">
        <h2>{i18n.t('authenticationRequired')}</h2>
        <input
          type="text"
          placeholder={i18n.t('username')}
          value={authUsername}
          onChange={(e) => setAuthUsername(e.target.value)}
          className="auth-input"
        />
        <input
          type="password"
          placeholder={i18n.t('password')}
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          className="auth-input"
        />
        <button onClick={authenticateUser} className={`auth-btn ${settings.buttonStyle || 'rounded'}`}>
          {i18n.t('login')}
        </button>
      </div>
    </div>
  );
}

export default Auth;
