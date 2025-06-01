import { useState, useEffect } from 'react';
import AudioService from '../audio/AudioService';

export function useAudioReady() {
  const [audioReady, setAudioReady] = useState(false);
  
  useEffect(() => {
    if (audioReady) return;
    
    const unlock = async () => {
      try {
        // Start the audio context
        if (!AudioService.isContextStarted()) {
          await AudioService.startAudioContext();
        }
        
        // Load the SoundTouch worklet
        const workletLoaded = await AudioService.loadSoundTouchModule();
        if (!workletLoaded) {
          console.error('useAudioReady: Failed to load SoundTouch worklet');
          return;
        }
        
        // Create the SoundTouch node
        const nodeCreated = AudioService.createSoundTouchAudioNode(0);
        if (!nodeCreated) {
          console.error('useAudioReady: Failed to create SoundTouch node');
          return;
        }
        
        setAudioReady(true);
        console.log('useAudioReady: Audio system unlocked and ready');
      } catch (error) {
        console.error('useAudioReady: Failed to unlock audio system:', error);
      }
    };
    
    // Listen for any user interaction
    const handleInteraction = () => {
      unlock();
      // Remove listeners after first interaction
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchend', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
    };
  }, [audioReady]);
  
  return audioReady;
} 