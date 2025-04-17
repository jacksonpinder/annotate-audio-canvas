
import { useState, useEffect, useRef } from 'react';

type BalanceOptions = {
  initialBalance?: number; // -1 (full left) to 1 (full right), 0 is center
  snapThreshold?: number;  // Threshold for center-snapping
};

export function useAudioBalance(audioElement: React.RefObject<HTMLAudioElement>, options: BalanceOptions = {}) {
  const { initialBalance = 0, snapThreshold = 0.05 } = options;
  const [balance, setBalance] = useState<number>(initialBalance);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  
  // Apply balance effect to audio element
  useEffect(() => {
    const audio = audioElement.current;
    if (!audio || !audio.audioTracks) return;
    
    try {
      // Create audio context if needed
      if (!audio.context) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const gainNodeLeft = audioContext.createGain();
        const gainNodeRight = audioContext.createGain();
        const splitter = audioContext.createChannelSplitter(2);
        const merger = audioContext.createChannelMerger(2);
        
        source.connect(splitter);
        splitter.connect(gainNodeLeft, 0);
        splitter.connect(gainNodeRight, 1);
        gainNodeLeft.connect(merger, 0, 0);
        gainNodeRight.connect(merger, 0, 1);
        merger.connect(audioContext.destination);
        
        // Store these nodes for later access
        audio.context = audioContext;
        audio.gainNodeLeft = gainNodeLeft;
        audio.gainNodeRight = gainNodeRight;
      }
      
      // Apply balance
      if (audio.gainNodeLeft && audio.gainNodeRight) {
        // Map -1...1 to gain values for L/R channels
        // When balance is 0 (center), both channels are at full gain
        // When balance is -1 (left), left channel is full, right is 0
        // When balance is 1 (right), right channel is full, left is 0
        const gainLeft = balance <= 0 ? 1 : 1 - balance;
        const gainRight = balance >= 0 ? 1 : 1 + balance;
        
        audio.gainNodeLeft.gain.value = gainLeft;
        audio.gainNodeRight.gain.value = gainRight;
      }
    } catch (error) {
      console.error("Error applying audio balance:", error);
    }
  }, [balance, audioElement]);
  
  // Function to handle balance change with snap to center
  const handleBalanceChange = (newValue: number[]) => {
    let newBalance = newValue[0];
    
    // Apply snap to center if close enough
    if (Math.abs(newBalance) < snapThreshold) {
      newBalance = 0;
    }
    
    setBalance(newBalance);
  };
  
  // Reset balance to center
  const resetBalance = () => setBalance(0);
  
  // Show balance slider
  const showBalance = () => {
    setIsBalanceVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  
  // Hide balance slider after delay (for desktop hover)
  const scheduleHideBalance = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsBalanceVisible(false);
      hideTimerRef.current = null;
    }, 500);
  };
  
  // Hide balance slider immediately
  const hideBalanceImmediate = () => {
    setIsBalanceVisible(false);
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
