
import { useState, useEffect, useRef } from 'react';

type PlaybackSpeedOptions = {
  initialSpeed?: number;
  minSpeed?: number;
  maxSpeed?: number;
  step?: number;
};

export function usePlaybackSpeed(audioElement: React.RefObject<HTMLAudioElement>, options: PlaybackSpeedOptions = {}) {
  const { 
    initialSpeed = 1, 
    minSpeed = 0.5, 
    maxSpeed = 1.5, 
    step = 0.25 
  } = options;
  
  const [speed, setSpeed] = useState<number>(initialSpeed);
  const [tempSpeed, setTempSpeed] = useState<number>(initialSpeed);
  const [isSpeedControlVisible, setIsSpeedControlVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  
  // Apply speed to audio element when changed
  useEffect(() => {
    const audio = audioElement.current;
    if (!audio) return;
    
    try {
      audio.playbackRate = speed;
    } catch (error) {
      console.error("Error applying playback speed:", error);
    }
  }, [speed, audioElement]);
  
  // Convert speed to slider value (0-100 range)
  const speedToSliderValue = (speedValue: number): number => {
    return ((speedValue - minSpeed) / (maxSpeed - minSpeed)) * 100;
  };
  
  // Convert slider value to speed
  const sliderValueToSpeed = (sliderValue: number): number => {
    const rawSpeed = minSpeed + (sliderValue / 100) * (maxSpeed - minSpeed);
    // Snap to nearest step value
    return Math.round(rawSpeed / step) * step;
  };
  
  // Handle dragging the slider (updates temporary speed)
  const handleTempSpeedChange = (newValue: number[]) => {
    const newTempSpeed = sliderValueToSpeed(newValue[0]);
    setTempSpeed(newTempSpeed);
  };
  
  // Apply the temporary speed when slider is released
  const applySpeed = () => {
    setSpeed(tempSpeed);
  };
  
  // Reset speed to normal (1x)
  const resetSpeed = () => {
    setSpeed(1);
    setTempSpeed(1);
  };
  
  // Show speed control
  const showSpeedControl = () => {
    setIsSpeedControlVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  
  // Hide speed control after delay
  const scheduleHideSpeedControl = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsSpeedControlVisible(false);
      hideTimerRef.current = null;
    }, 500);
  };
  
  // Hide speed control immediately
  const hideSpeedControlImmediate = () => {
    setIsSpeedControlVisible(false);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
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
    speedToSliderValue
  };
}
