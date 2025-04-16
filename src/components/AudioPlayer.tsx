
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, Pause, Rewind, FastForward, Repeat, Volume2, VolumeX, Piano
} from 'lucide-react';
import PianoKeyboard from './PianoKeyboard';

interface AudioPlayerProps {
  audioFile: File | null;
}

export default function AudioPlayer({ audioFile }: AudioPlayerProps) {
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
              
              {/* Volume/Mute Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="flex-shrink-0"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>
              
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
