import { useState, useEffect } from 'react';
const axios = require('axios');

function useNetwork() {
  const [networkSpeed, setNetworkSpeed] = useState(0);

  useEffect(() => {
    const measureNetworkSpeed = async () => {
      try {
        const testFileUrl = 'http://intranet.local/testfile.dat'; // 내부망 테스트 파일 URL
        const fileSizeInBytes = 1024 * 1024; // 테스트 파일 크기: 1MB

        // 내부망 주소인지 확인
        if (!testFileUrl.startsWith('http://intranet.local')) {
          throw new Error('External network access is not allowed');
        }

        const startTime = Date.now();
        const response = await axios.get(testFileUrl, {
          responseType: 'arraybuffer',
          timeout: 5000, // 타임아웃 설정으로 네트워크 지연 방지
        });
        const endTime = Date.now();

        const durationInSeconds = (endTime - startTime) / 1000;
        const speedBps = fileSizeInBytes * 8 / durationInSeconds; // 비트 단위 속도
        const speedMbps = (speedBps / (1024 * 1024)).toFixed(2); // Mbps 단위로 변환

        setNetworkSpeed(parseFloat(speedMbps));
      } catch (err) {
        console.error('Network speed measurement failed:', err.message);
        setNetworkSpeed(10); // 내부망 환경에서 기본 속도 10Mbps로 설정
      }
    };

    measureNetworkSpeed();
    const interval = setInterval(measureNetworkSpeed, 60000); // 1분마다 측정
    return () => clearInterval(interval);
  }, []);

  return { networkSpeed };
}

export default useNetwork;
