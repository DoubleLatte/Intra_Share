import React, { useState, useEffect } from 'react';
import { i18n } from '../utils/i18n';
const { ipcRenderer } = window.require('electron');

function TransferHistory({ setNotifications }) {
  const [transferHistory, setTransferHistory] = useState({ sent: [], received: [] });

  useEffect(() => {
    ipcRenderer.on('transfer-history', (event, history) => {
      setTransferHistory(history);
    });
    ipcRenderer.send('get-transfer-history');
  }, []);

  const exportLogs = () => {
    ipcRenderer.send('export-logs');
  };

  return (
    <div className="transfer-history">
      <h2>{i18n.t('transferHistory')}</h2>
      <button onClick={exportLogs}>{i18n.t('exportLogs')}</button>
      <h3>{i18n.t('sentFiles')}</h3>
      {transferHistory.sent.map((item, index) => (
        <div key={index}>
          {item.name} to {item.device} at {item.timestamp}
        </div>
      ))}
      <h3>{i18n.t('receivedFilesHistory')}</h3>
      {transferHistory.received.map((item, index) => (
        <div key={index}>
          {item.name} saved at {item.path} at {item.timestamp}
        </div>
      ))}
    </div>
  );
}

export default TransferHistory;
