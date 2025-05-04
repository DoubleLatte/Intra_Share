import { useState, useEffect } from 'react';
const NetworkSpeed = window.require('network-speed');

function useNetwork() {
  const [networkSpeed, setNetworkSpeed] = useState(0);

  useEffect(() => {
    const networkSpeed = new NetworkSpeed();
    const measureNetworkSpeed = async () => {
      try {
        const speed = await networkSpeed.checkDownloadSpeed({
          url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png',
          fileSize: 10000,
        });
        setNetworkSpeed(parseFloat(speed.mbps));
      } catch (err) {
        setNetworkSpeed(1);
      }
    };
    measureNetworkSpeed();
    const interval = setInterval(measureNetworkSpeed, 60000);
    return () => clearInterval(interval);
  }, []);

  return { networkSpeed };
}

export default useNetwork;
