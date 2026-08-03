import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onResult, onError, paused = false }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader', { verbose: false });
    }
    const scanner = scannerRef.current;
    let active = true;

    const start = async () => {
      try {
        if (!paused && !scanning) {
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (active && decodedText !== lastResult) {
                setLastResult(decodedText);
                onResult(decodedText);
              }
            },
            () => { /* per-frame errors ignored */ }
          );
          setScanning(true);
          setError('');
        }
      } catch (err) {
        setScanning(false);
        setError('Camera not available or permission denied: ' + (err.message || err));
        if (onError) onError(err);
      }
    };

    start();

    return () => {
      active = false;
      if (scanner && scanner.isScanning) {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch(() => {});
      }
    };
  }, [paused]);

  useEffect(() => {
    if (paused && scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => setScanning(false)).catch(() => {});
    }
  }, [paused]);

  return (
    <div className="qr-scanner-wrap">
      <div id="qr-reader" />
      {error && <div className="alert alert-error mt-4">{error}</div>}
      {scanning && <div className="countdown">📷 Scanning for QR code...</div>}
    </div>
  );
}

