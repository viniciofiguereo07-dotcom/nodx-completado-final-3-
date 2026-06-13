import { useState, useCallback } from 'react';
import type { GPSCapture } from '../types';

interface GPSState {
  capture: GPSCapture | null;
  loading: boolean;
  error: string | null;
  accuracy_warning: boolean;
}

const ACCURACY_WARN_THRESHOLD = 50;  // meters
const ACCURACY_BLOCK_THRESHOLD = 200; // meters

export function useGPS(options?: { accuracy_threshold?: number }) {
  const warnThreshold = options?.accuracy_threshold ?? ACCURACY_WARN_THRESHOLD;

  const [state, setState] = useState<GPSState>({
    capture: null,
    loading: false,
    error: null,
    accuracy_warning: false,
  });

  const capture = useCallback((): Promise<GPSCapture> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setState(s => ({ ...s, error: 'Geolocation is not supported by this browser.' }));
        reject(new Error('Geolocation not supported'));
        return;
      }
      setState(s => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy, altitude } = pos.coords;
          const result: GPSCapture = {
            lat,
            lng,
            accuracy,
            altitude: altitude ?? null,
            timestamp: new Date().toISOString(),
          };
          setState({
            capture: result,
            loading: false,
            error: null,
            accuracy_warning: accuracy > warnThreshold,
          });
          resolve(result);
        },
        (err) => {
          const msg = err.code === 1 ? 'Location permission denied.'
            : err.code === 2 ? 'Location unavailable.'
            : 'Location request timed out.';
          setState(s => ({ ...s, loading: false, error: msg }));
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }, [warnThreshold]);

  const clearCapture = useCallback(() => {
    setState({ capture: null, loading: false, error: null, accuracy_warning: false });
  }, []);

  return { state, capture, clearCapture, ACCURACY_BLOCK_THRESHOLD };
}
