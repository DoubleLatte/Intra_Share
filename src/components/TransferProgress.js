import React, { useState } from 'react';
import { i18n } from '../utils/i18n';

function TransferProgress({ transferProgress, setTransferProgress, setNotifications }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const cancelTransferRef = React.useRef(new Map());

  const cancelTransfer = (transferId) => {
    setShowCancelConfirm(transferId);
  };

  const confirmCancelTransfer = (transferId, confirm) => {
    if (confirm) {
      cancelTransferRef.current.set(transferId, { cancelled: true });
      setTransferProgress((prev) => prev.filter((prog) => prog.transferId !== transferId));
      setNotifications((prev) => [...prev, { message: i18n.t('transferCancelled'), type: 'info', id: Date.now() }]);
    }
    setShowCancelConfirm(null);
  };

  return (
    <div className="transfer-progress">
      {transferProgress.map((progress) => (
        <div key={progress.transferId}>
          {progress.fileName} to {progress.deviceName}: {progress.percentage}% - {progress.speed} MB/s
          <button onClick={() => cancelTransfer(progress.transferId)}>{i18n.t('cancel')}</button>
          {showCancelConfirm === progress.transferId && (
            <div>
              <p>Cancel transfer?</p>
              <button onClick={() => confirmCancelTransfer(progress.transferId, true)}>Yes</button>
              <button onClick={() => confirmCancelTransfer(progress.transferId, false)}>No</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TransferProgress;
