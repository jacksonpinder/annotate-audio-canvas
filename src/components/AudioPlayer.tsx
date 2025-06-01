import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Piano, Repeat2 } from 'lucide-react';
import PianoKeyboard from './PianoKeyboard';
import { useAudioBalance } from '@/hooks/useAudioBalance';
import { usePlaybackSpeed } from '@/hooks/usePlaybackSpeed';
import TransposeControl from './audio/TransposeControl';
import { useTranspose } from '@/hooks/useTranspose';
import AudioService from '../audio/AudioService';
import { useAudioReady } from '@/hooks/useAudioReady';

// Import our new component modules
import AudioTransportControls from './audio/AudioTransportControls';
import BalanceControl from './audio/BalanceControl';
import PlaybackSpeedControl from './audio/PlaybackSpeedControl';
import VolumeControl from './audio/VolumeControl';

interface AudioPlayerProps {
  audioFile: File | null;
  onHomeClick?: () => void;
}

export default function AudioPlayer({ audioFile, onHomeClick }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [wasShowingPiano, setWasShowingPiano] = useState(false);
  const [isAudioServiceReady, setIsAudioServiceReady] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  
  // Use the audioReady hook
  const audioReady = useAudioReady();
  
  // Initialize the balance control hook
  const {
    balance,
    isBalanceVisible,
    showBalance,
    scheduleHideBalance,
    hideBalanceImmediate,
    handleBalanceChange,
    resetBalance
  } = useAudioBalance(null, { snapThreshold: 0.08 });

  // Initialize the playback speed hook
  const {
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
  } = usePlaybackSpeed(null);

  // Initialize the transpose hook
  const {
    transpose,
    tempTranspose,
    isTransposeVisible,
    showTranspose,
    scheduleHideTranspose,
    hideTransposeImmediate,
    handleTempTransposeChange,
    applyTranspose,
    resetTranspose
  } = useTranspose(null);

  // Initialize AudioService the first time the component mounts
  useEffect(() => {
    const initAudioService = async () => {
      console.log('AudioPlayer: Initializing AudioService');
      
      try {
        // Use unlockAndInit which is now guarded against multiple calls
        await AudioService.unlockAndInit();
        console.log('AudioPlayer: AudioService initialized successfully');
      } catch (error) {
        console.error('AudioPlayer: Error initializing AudioService:', error);
      }
    };
    
    initAudioService();
  }, []);

  // Load the audio file into AudioService
  useEffect(() => {
    if (audioFile) {
      // Reset player state when a new file is loaded
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Load the file into AudioService
      const loadAudioIntoService = async () => {
        setIsAudioServiceReady(false);
        
        try {
          // Make sure audio system is ready
          const unlocked = await AudioService.unlockAndInit();
          if (!unlocked) {
            console.error('AudioPlayer: Failed to unlock audio system');
            return;
          }
          
          console.log('AudioPlayer: Loading audio file into AudioService');
          const success = await AudioService.loadAudioFile(audioFile);
          
          if (success) {
            console.log('AudioPlayer: Audio loaded into AudioService successfully');
            setIsAudioServiceReady(true);
            
            // Get duration from AudioService
            setDuration(AudioService.getDuration());
          } else {
            console.error('AudioPlayer: Failed to load audio into AudioService');
          }
        } catch (error) {
          console.error('AudioPlayer: Error loading audio:', error);
        }
      };
      
      loadAudioIntoService();

      // Clean up when component unmounts
      return () => {
        setIsAudioServiceReady(false);
      };
    }
  }, [audioFile]);

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (!isAudioServiceReady) {
      console.log('AudioPlayer: AudioService not ready, cannot play/pause');
      return;
    }
    
    if (isPlaying) {
      // Stop AudioService playback
      console.log('AudioPlayer: Stopping playback');
      AudioService.stop();
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      setIsPlaying(false);
    } else {
      // Start AudioService playback
      console.log('AudioPlayer: Starting playback');
      AudioService.play();
      
      // Start progress bar animation
      animationRef.current = requestAnimationFrame(updateProgressBar);
      
      setIsPlaying(true);
    }
  };

  // Update progress bar during playback
  const updateProgressBar = () => {
    // Get current time from AudioService
    const currentTime = AudioService.getCurrentTime();
    setCurrentTime(currentTime);
    
    // If we reach the end of the audio and looping is off, stop playback
    if (currentTime >= duration && !isLooping) {
      handleEnded();
      return;
    }
    
    // Keep updating the animation frame
    animationRef.current = requestAnimationFrame(updateProgressBar);
  };

  // Skip forward or backward by 15 seconds
  const skip = (seconds: number) => {
    if (!isAudioServiceReady) return;
    
    // Calculate new position
    const newTime = Math.min(
      Math.max(currentTime + seconds, 0),
      duration
    );
    
    // Update display immediately for better UX
    setCurrentTime(newTime);
    
    // Seek to the new position
    AudioService.seek(newTime);
    
    // If we were playing, make sure animation is running
    if (isPlaying && !animationRef.current) {
      animationRef.current = requestAnimationFrame(updateProgressBar);
    }
  };

  // Handle seeking through the track
  const handleTimeChange = (newValue: number[]) => {
    const newTime = newValue[0];
    skip(newTime - currentTime); // Use the skip function with a relative offset
  };
  
  // Handle volume change
  const handleVolumeChange = (newValue: number[]) => {
    const newVolume = newValue[0];
    setVolume(newVolume);
    
    // Apply volume to AudioService
    if (AudioService.player) {
      AudioService.player.volume.value = isMuted ? -100 : 20 * Math.log10(newVolume); // Convert to dB
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      
      // Restore volume
      if (AudioService.player) {
        AudioService.player.volume.value = 20 * Math.log10(volume); // Convert to dB
      }
    } else {
      setIsMuted(true);
      
      // Mute volume
      if (AudioService.player) {
        AudioService.player.volume.value = -100; // Effectively mute
      }
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    const newLoopState = !isLooping;
    setIsLooping(newLoopState);
    
    // Apply loop state to AudioService
    if (AudioService.player) {
      AudioService.player.loop = newLoopState;
    }
  };

  // Toggle piano visibility
  const togglePiano = () => {
    if (showPiano) {
      // If we're hiding the piano, mark it as previously visible first
      setWasShowingPiano(true);
      // After a brief delay, update the showPiano state
      setTimeout(() => {
        setShowPiano(false);
      }, 0);
    } else {
      // If we're showing the piano, update both states
      setWasShowingPiano(false);
      setShowPiano(true);
    }
  };

  // Handle end of audio playback
  const handleEnded = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (!isLooping) {
      setCurrentTime(0);
    }
  };

  return (
    <div className={`audio-player-container ${showPiano ? 'piano-open' : ''}`}>
      <div className="audio-player bg-muted p-3 rounded-md shadow-md">
        {audioFile ? (
          <div className="flex items-center space-x-2 md:space-x-3">
            <AudioTransportControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              togglePlayPause={togglePlayPause}
              skip={skip}
              handleTimeChange={handleTimeChange}
              formatTime={formatTime}
              disabled={!audioReady || !isAudioServiceReady}
            />
            
            {/* Volume Control (First) */}
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              toggleMute={toggleMute}
              handleVolumeChange={handleVolumeChange}
              className="volume-button"
              disabled={!audioReady || !isAudioServiceReady}
            />

            {/* Balance Control (Fourth) */}
            <BalanceControl
              balance={balance}
              isBalanceVisible={isBalanceVisible}
              showBalance={showBalance}
              scheduleHideBalance={scheduleHideBalance}
              handleBalanceChange={handleBalanceChange}
              resetBalance={resetBalance}
              disabled={!audioReady || !isAudioServiceReady}
            />
            
            {/* Transpose Control (Fifth) */}
            <TransposeControl
              transpose={transpose}
              tempTranspose={tempTranspose}
              isTransposeVisible={isTransposeVisible}
              showTranspose={showTranspose}
              scheduleHideTranspose={scheduleHideTranspose}
              handleTempTransposeChange={handleTempTransposeChange}
              applyTranspose={applyTranspose}
              resetTranspose={resetTranspose}
              disabled={!audioReady || !isAudioServiceReady}
            />
            
            {/* Playback Speed Control */}
            <PlaybackSpeedControl
              speed={speed}
              tempSpeed={tempSpeed}
              isSpeedControlVisible={isSpeedControlVisible}
              showSpeedControl={showSpeedControl}
              scheduleHideSpeedControl={scheduleHideSpeedControl}
              handleTempSpeedChange={handleTempSpeedChange}
              applySpeed={applySpeed}
              resetSpeed={resetSpeed}
              speedToSliderValue={speedToSliderValue}
              MIN_SPEED={MIN_SPEED}
              MAX_SPEED={MAX_SPEED}
              SPEED_STEP={SPEED_STEP}
              disabled={!audioReady || !isAudioServiceReady}
            />

            {/* Loop Button (now Fifth) */}
            <div className="control-with-label">
              <Button 
                variant={isLooping ? "default" : "ghost"} 
                size="icon" 
                onClick={toggleLoop}
                aria-label={isLooping ? "Disable loop" : "Enable loop"}
                className="audio-control-button"
                data-state={isLooping ? "active" : "inactive"}
                disabled={!audioReady || !isAudioServiceReady}
              >
                <div className="audio-control-icon">
                  <Repeat2 size={20} strokeWidth={2} />
                </div>
              </Button>
              {isLooping && (
                <div className="label-below">
                  Loop
                </div>
              )}
            </div>

            {/* Piano Button (now Sixth) */}
            <Button 
              variant={showPiano ? "default" : "ghost"} 
              size="icon" 
              onClick={togglePiano}
              aria-label={showPiano ? "Hide piano" : "Show piano"}
              className="control-slot piano-button"
              data-state={showPiano ? "active" : "inactive"}
              disabled={!audioReady || !isAudioServiceReady}
            >
              <div className="icon-slot">
                <Piano size={20} strokeWidth={2} />
              </div>
            </Button>
          </div>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p>Upload an audio file to start playback</p>
          </div>
        )}
      </div>

      {/* Piano Keyboard */}
      <div 
        className={`piano-container ${showPiano ? 'active' : ''} ${wasShowingPiano ? 'was-active' : ''}`}
        onTransitionEnd={() => {
          // Clear the was-active class after the animation finishes
          if (!showPiano) {
            setWasShowingPiano(false);
          }
        }}
      >
        <PianoKeyboard />
      </div>
    </div>
  );
}
