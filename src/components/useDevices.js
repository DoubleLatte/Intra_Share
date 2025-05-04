import { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function useDevices() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    ipcRenderer.on('device-found', (event, device) => {
      setDevices((prev) => {
        if (!prev.some((d) => d.name === device.name)) {
          return [...prev, device];
        }
        return prev.map((d) => (d.name === device.name ? device : d));
      });
    });

    ipcRenderer.on('device-status-update', (event, { name, status }) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.name === name ? { ...device, status } : device
        )
      );
    });

    ipcRenderer.send('get-device-aliases');
  }, []);

  return { devices };
}

export default useDevices;
