import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import PianoKeyboard from './PianoKeyboard';
import { useAudioBalance } from '@/hooks/useAudioBalance';
import { usePlaybackSpeed } from '@/hooks/usePlaybackSpeed';
import TransposeControl from './audio/TransposeControl';
import { useTranspose } from '@/hooks/useTranspose';

// Import our new component modules
import AudioTransportControls from './audio/AudioTransportControls';
import BalanceControl from './audio/BalanceControl';
import PlaybackSpeedControl from './audio/PlaybackSpeedControl';
import VolumeControl from './audio/VolumeControl';
import AudioUtilityControls from './audio/AudioUtilityControls';

interface AudioPlayerProps {
  audioFile: File | null;
  onHomeClick?: () => void;
}

export default function AudioPlayer({ audioFile, onHomeClick }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Initialize the balance control hook
  const {
    balance,
    isBalanceVisible,
    showBalance,
    scheduleHideBalance,
    hideBalanceImmediate,
    handleBalanceChange,
    resetBalance
  } = useAudioBalance(audioRef, { snapThreshold: 0.08 });

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
    speedToSliderValue
  } = usePlaybackSpeed(audioRef);

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
  } = useTranspose(audioRef);

  // Convert the File to a URL for audio element
  useEffect(() => {
    if (audioFile) {
      const fileUrl = URL.createObjectURL(audioFile);
      setAudioUrl(fileUrl);

      // Reset player state when a new file is loaded
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      // Clean up the URL when component unmounts
      return () => {
        URL.revokeObjectURL(fileUrl);
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
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      audioRef.current.play();
      animationRef.current = requestAnimationFrame(updateProgressBar);
    }
    
    setIsPlaying(!isPlaying);
  };

  // Update progress bar during playback
  const updateProgressBar = () => {
    if (!audioRef.current) return;
    
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
    
    animationRef.current = requestAnimationFrame(updateProgressBar);
  };

  // Skip forward or backward by 15 seconds
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = Math.min(
      Math.max(audioRef.current.currentTime + seconds, 0),
      audioRef.current.duration
    );
    
    setCurrentTime(audioRef.current.currentTime);
  };

  // Handle seeking through the track
  const handleTimeChange = (newValue: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = newValue[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    if (!isPlaying) {
      setCurrentTime(newTime);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (newValue: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = newValue[0];
    audioRef.current.volume = isMuted ? 0 : newVolume;
    setVolume(newVolume);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  // Toggle piano visibility
  const togglePiano = () => {
    setShowPiano(!showPiano);
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

  // Load audio metadata
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    setDuration(audioRef.current.duration);
  };

  return (
    <div className={`audio-player-container ${showPiano ? 'piano-open' : ''}`}>
      <div className="audio-player bg-muted p-3 rounded-md shadow-md">
        {audioUrl ? (
          <>
            
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
            
            <div className="flex items-center space-x-2 md:space-x-3">
              
              
              {/* Audio Transport Controls */}
              <AudioTransportControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                togglePlayPause={togglePlayPause}
                skip={skip}
                handleTimeChange={handleTimeChange}
                formatTime={formatTime}
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
              />
              
              {/* Transpose Control */}
              <TransposeControl
                transpose={transpose}
                tempTranspose={tempTranspose}
                isTransposeVisible={isTransposeVisible}
                showTranspose={showTranspose}
                scheduleHideTranspose={scheduleHideTranspose}
                handleTempTransposeChange={handleTempTransposeChange}
                applyTranspose={applyTranspose}
                resetTranspose={resetTranspose}
              />
              
              {/* Balance Control */}
              <BalanceControl
                balance={balance}
                isBalanceVisible={isBalanceVisible}
                showBalance={showBalance}
                scheduleHideBalance={scheduleHideBalance}
                handleBalanceChange={handleBalanceChange}
                resetBalance={resetBalance}
              />
              
              {/* Volume Control */}
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                toggleMute={toggleMute}
                handleVolumeChange={handleVolumeChange}
              />
              
              {/* Utility Controls */}
              <AudioUtilityControls
                isLooping={isLooping}
                showPiano={showPiano}
                toggleLoop={toggleLoop}
                togglePiano={togglePiano}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p>Upload an audio file to start playback</p>
          </div>
        )}
      </div>

      {/* Piano Keyboard */}
      <div 
        className={`piano-container transition-transform duration-300 ease-in-out ${
          showPiano ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <PianoKeyboard />
      </div>
    </div>
  );
}
