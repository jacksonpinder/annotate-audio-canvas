import { useState, useRef, useEffect } from 'react';
import AudioService from '../audio/AudioService';
import { throttle } from 'lodash';
import { useAudioReady } from './useAudioReady';

export function useTranspose(audioElement: React.RefObject<HTMLAudioElement> | null) {
  const [transpose, setTranspose] = useState<number>(0);
  const [tempTranspose, setTempTranspose] = useState<number>(0);
  const [isTransposeVisible, setIsTransposeVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  const audioReady = useAudioReady();
  
  // Create a throttled version of AudioService.setPitch for UI interactions
  const throttledSetPitch = useRef(
    throttle((semitones: number) => {
      if (!AudioService.isReady()) {
        console.log('useTranspose: AudioService not ready, skipping pitch change');
        return;
      }
      AudioService.setPitch(semitones);
      console.log('useTranspose: Throttled pitch set to:', semitones);
    }, 50) // 50ms throttle for smooth performance
  ).current;

  // Apply transpose effect when changed or when audio becomes ready
  useEffect(() => {
    if (!audioReady) {
      console.log('useTranspose: Audio not ready, skipping pitch change');
      return;
    }
    
    // Apply the pitch change
    AudioService.setPitch(transpose);
    console.log('useTranspose: Applied pitch change:', transpose);
  }, [transpose, audioReady]);

  // Handlers for UI state
  const showTranspose = () => {
    setIsTransposeVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHideTranspose = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsTransposeVisible(false);
      hideTimerRef.current = null;
    }, 500);
  };

  const hideTransposeImmediate = () => {
    setIsTransposeVisible(false);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleTempTransposeChange = (newValue: number[]) => {
    setTempTranspose(newValue[0]);
    
    // Preview the pitch change in real-time while dragging the slider
    throttledSetPitch(newValue[0]);
  };

  const applyTranspose = () => {
    setTranspose(tempTranspose);
    // Main pitch application happens in the useEffect watching transpose
  };

  const resetTranspose = () => {
    setTranspose(0);
    setTempTranspose(0);
    // Reset in AudioService happens in the useEffect watching transpose
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      // Cancel any pending throttled operations
      throttledSetPitch.cancel();
    };
  }, [throttledSetPitch]);

  return {
    transpose,
    tempTranspose,
    isTransposeVisible,
    showTranspose,
    scheduleHideTranspose,
    hideTransposeImmediate,
    handleTempTransposeChange,
    applyTranspose,
    resetTranspose
  };
}
