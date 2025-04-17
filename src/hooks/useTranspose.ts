
import { useState, useRef, useEffect } from 'react';

export function useTranspose(audioElement: React.RefObject<HTMLAudioElement>) {
  const [transpose, setTranspose] = useState<number>(0);
  const [tempTranspose, setTempTranspose] = useState<number>(0);
  const [isTransposeVisible, setIsTransposeVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);

  // Apply transpose effect when changed
  useEffect(() => {
    const audio = audioElement.current;
    if (!audio) return;

    // Here you would implement the actual pitch shifting
    // This requires Web Audio API's detune property
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audio);
      const pitchNode = audioContext.createBiquadFilter();
      
      // Convert semitones to cents (100 cents = 1 semitone)
      pitchNode.detune.value = transpose * 100;
      
      source.connect(pitchNode);
      pitchNode.connect(audioContext.destination);
    } catch (error) {
      console.error("Error applying transpose:", error);
    }
  }, [transpose, audioElement]);

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
  };

  const applyTranspose = () => {
    setTranspose(tempTranspose);
  };

  const resetTranspose = () => {
    setTranspose(0);
    setTempTranspose(0);
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
