
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VerticalSlider } from '@/components/ui/vertical-slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { 
  Play, Pause, Rewind, FastForward, Repeat, Volume2, VolumeX, Piano, Home,
  Headphones, Gauge
} from 'lucide-react';
import PianoKeyboard from './PianoKeyboard';
import { useAudioBalance } from '@/hooks/useAudioBalance';
import { usePlaybackSpeed } from '@/hooks/usePlaybackSpeed';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioFile: File | null;
  onHomeClick?: () => void;
}

// Custom Headphone Balance Icon Components
const HeadphonesBalanced = () => (
  <div className="relative">
    <Headphones size={20} />
    <span className="absolute text-[8px] font-semibold bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-semibold bottom-1.5 right-1">R</span>
  </div>
);

const HeadphonesLeftBiased = () => (
  <div className="relative">
    <Headphones size={20} />
    <span className="absolute text-[8px] font-bold bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-light opacity-60 bottom-1.5 right-1">R</span>
  </div>
);

const HeadphonesRightBiased = () => (
  <div className="relative">
    <Headphones size={20} />
    <span className="absolute text-[8px] font-light opacity-60 bottom-1.5 left-1">L</span>
    <span className="absolute text-[8px] font-bold bottom-1.5 right-1">R</span>
  </div>
);

export default function AudioPlayer({ audioFile, onHomeClick }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  
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
  
  // Determine which headphones icon to use based on balance
  const getHeadphonesIcon = () => {
    if (balance === 0) {
      return <HeadphonesBalanced />;
    } else if (balance < 0) {
      return <HeadphonesLeftBiased />;
    } else {
      return <HeadphonesRightBiased />;
    }
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
              {/* Home Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onHomeClick}
                aria-label="Return to home screen"
                className="flex-shrink-0"
              >
                <Home size={20} />
              </Button>
              
              {/* Play/Pause Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex-shrink-0"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>
              
              {/* Rewind 15 seconds */}
              <div className="flex flex-col items-center flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => skip(-15)}
                  aria-label="Rewind 15 seconds"
                  className="flex-shrink-0 h-8"
                >
                  <Rewind size={18} />
                </Button>
                <span className="text-[9px] mt-[-2px] text-muted-foreground">15 sec</span>
              </div>
              
              {/* Current Time */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatTime(currentTime)}
              </span>
              
              {/* Progress Bar */}
              <div className="flex-grow mx-1">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={0.01}
                  onValueChange={handleTimeChange}
                  aria-label="Seek position"
                />
              </div>
              
              {/* Duration/Time Left */}
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatTime(duration - currentTime)}
              </span>
              
              {/* Fast Forward 15 seconds */}
              <div className="flex flex-col items-center flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => skip(15)}
                  aria-label="Fast forward 15 seconds"
                  className="flex-shrink-0 h-8"
                >
                  <FastForward size={18} />
                </Button>
                <span className="text-[9px] mt-[-2px] text-muted-foreground">15 sec</span>
              </div>
              
              {/* Playback Speed Control */}
              <div className="relative flex-shrink-0"
                onMouseEnter={showSpeedControl}
                onMouseLeave={scheduleHideSpeedControl}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={resetSpeed}
                  aria-label="Adjust playback speed"
                  className={cn(
                    "flex-shrink-0",
                    speed !== 1 && "text-primary"
                  )}
                >
                  <div className="relative">
                    <Gauge size={20} />
                    <span className="absolute text-[8px] font-medium top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      {speed}x
                    </span>
                  </div>
                </Button>
                
                {/* Playback Speed Slider (shows on hover/tap) */}
                {isSpeedControlVisible && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover rounded-md shadow-md p-2 w-32 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center mb-1 text-xs font-medium">{tempSpeed}x</div>
                    <div className="w-full flex items-center gap-2 py-1">
                      <span className="text-xs font-medium">0.5x</span>
                      <Slider
                        value={[speedToSliderValue(tempSpeed)]}
                        min={0}
                        max={100}
                        step={25}
                        onValueChange={handleTempSpeedChange}
                        onValueCommit={applySpeed}
                        aria-label="Playback speed"
                      />
                      <span className="text-xs font-medium">1.5x</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Balance Control (Headphones) */}
              <div className="relative flex-shrink-0" 
                onMouseEnter={showBalance}
                onMouseLeave={scheduleHideBalance}
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={resetBalance}
                  aria-label="Adjust audio balance"
                  className={cn(
                    "flex-shrink-0",
                    balance !== 0 && "text-primary"
                  )}
                >
                  {getHeadphonesIcon()}
                </Button>
                
                {/* Balance Slider (shows on hover/tap) */}
                {isBalanceVisible && (
                  <div 
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover rounded-md shadow-md p-2 w-32 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex items-center gap-2 py-2">
                      <span className="text-xs font-medium">L</span>
                      <Slider
                        value={[balance]}
                        min={-1}
                        max={1}
                        step={0.01}
                        onValueChange={handleBalanceChange}
                        aria-label="Audio balance"
                      />
                      <span className="text-xs font-medium">R</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Volume Control */}
              <div className="relative flex-shrink-0">
                <Popover open={isVolumeSliderOpen} onOpenChange={setIsVolumeSliderOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                      className="flex-shrink-0"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="top" 
                    align="center" 
                    className="w-12 p-3 h-32 flex items-center justify-center"
                  >
                    <VerticalSlider
                      value={[volume]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      aria-label="Volume"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Loop Button */}
              <Button 
                variant={isLooping ? "default" : "ghost"} 
                size="icon" 
                onClick={toggleLoop}
                aria-label={isLooping ? "Disable loop" : "Enable loop"}
                className="flex-shrink-0"
              >
                <Repeat size={20} />
              </Button>
              
              {/* Piano Button */}
              <Button 
                variant={showPiano ? "default" : "ghost"} 
                size="icon" 
                onClick={togglePiano}
                aria-label={showPiano ? "Hide piano" : "Show piano"}
                className="flex-shrink-0"
              >
                <Piano size={20} />
              </Button>
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
