import { useState, useRef, useEffect, useCallback } from 'react';
import AudioService from '../audio/AudioService';
import { useAudioReady } from './useAudioReady';

interface UseAudioBalanceOptions {
  snapThreshold?: number;
}

export function useAudioBalance(
  audioElement: React.RefObject<HTMLAudioElement> | null,
  options: UseAudioBalanceOptions = {}
) {
  const { snapThreshold = 0.05 } = options;
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  const audioReady = useAudioReady();

  // Initialize balance from AudioService in case it was set by other means or persisted
  useEffect(() => {
    setBalance(AudioService.getCurrentPan());
  }, []);

  // Handlers for UI state
  const showBalance = () => {
    setIsBalanceVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHideBalance = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsBalanceVisible(false);
      hideTimerRef.current = null;
    }, 500);
  };

  const hideBalanceImmediate = () => {
    setIsBalanceVisible(false);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleBalanceChange = useCallback((newValue: number[]) => {
    const newBalanceFromSlider = newValue[0];
    
    // 1. Send the slider's value to AudioService (it might snap it)
    AudioService.setPan(newBalanceFromSlider); 
    
    // 2. Get the (potentially snapped) value BACK from AudioService
    const actualPanValue = AudioService.getCurrentPan(); 
    
    // 3. Update the local state that drives the UI slider
    setBalance(actualPanValue); 

  }, [/* setBalance is stable, AudioService is singleton */]);

  const resetBalance = useCallback(() => {
    AudioService.setPan(0); // Tell service to reset
    const actualPanValue = AudioService.getCurrentPan(); // Get the value (should be 0)
    setBalance(actualPanValue); // Update UI state
  }, [/* setBalance is stable, AudioService is singleton */]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return {
    balance,
    isBalanceVisible,
    showBalance,
    scheduleHideBalance,
    hideBalanceImmediate,
    handleBalanceChange,
    resetBalance
  };
}

// Augment HTMLAudioElement with properties we'll need
declare global {
  interface HTMLAudioElement {
    context?: AudioContext;
    gainNodeLeft?: GainNode;
    gainNodeRight?: GainNode;
  }
}
