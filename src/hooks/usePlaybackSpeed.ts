import { useState, useRef, useEffect } from 'react';
import AudioService from '../audio/AudioService';
import { useAudioReady } from './useAudioReady';

// Add constants for speed boundaries
const MIN_SPEED = 0.5;   // no 0.0 any more
const MAX_SPEED = 1.5;
const SPEED_STEP = 0.05;

interface UsePlaybackSpeedOptions {
  snapThreshold?: number;
}

export function usePlaybackSpeed(
  audioElement: React.RefObject<HTMLAudioElement> | null,
  options: UsePlaybackSpeedOptions = {}
) {
  const { snapThreshold = 0.05 } = options;
  const [speed, setSpeed] = useState<number>(1);
  const [tempSpeed, setTempSpeed] = useState<number>(1);
  const [isSpeedControlVisible, setIsSpeedControlVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  const audioReady = useAudioReady();

  // Handlers for UI state
  const showSpeedControl = () => {
    setIsSpeedControlVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHideSpeedControl = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsSpeedControlVisible(false);
      hideTimerRef.current = null;
    }, 500);
  };

  const hideSpeedControlImmediate = () => {
    setIsSpeedControlVisible(false);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleTempSpeedChange = (newValue: number[]) => {
    // Ensure value is within allowed range
    const newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newValue[0]));
    setTempSpeed(newSpeed);
    
    if (audioReady) {
      AudioService.setSpeed(newSpeed);
    }
  };

  const applySpeed = () => {
    setSpeed(tempSpeed);
    // The actual application of speed is now handled by setSpeed in AudioService
    if (audioReady) {
      AudioService.setSpeed(tempSpeed);
    }
  };

  const resetSpeed = () => {
    setSpeed(1);
    setTempSpeed(1);
    
    if (audioReady) {
      AudioService.setSpeed(1);
    }
  };

  // Effect to apply speed when audio becomes ready or speed/tempSpeed changes
  useEffect(() => {
    if (audioReady) {
      AudioService.setSpeed(speed); // Apply the committed speed
    }
  }, [audioReady, speed]);

  // Convert speed to slider value (for UI)
  const speedToSliderValue = (s: number): number => {
    return s;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return {
    speed,
    tempSpeed,
    isSpeedControlVisible,
    showSpeedControl,
    scheduleHideSpeedControl,
    hideSpeedControlImmediate,
    handleTempSpeedChange,
    applySpeed,
    resetSpeed,
    speedToSliderValue,
    MIN_SPEED,
    MAX_SPEED,
    SPEED_STEP
  };
}
