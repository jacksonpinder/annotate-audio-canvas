
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, Pause, SkipForward, SkipBack, Repeat, Volume2, VolumeX, Piano 
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
  const [audioDuration, setAudioDuration] = useState(0);
  
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

  // Handle volume change
  const handleVolumeChange = (newValue: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = newValue[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
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
    setAudioDuration(audioRef.current.duration);
  };

  return (
    <div className={`audio-player-container ${showPiano ? 'pb-72 transition-all duration-300' : 'transition-all duration-300'}`}>
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
            
            <div className="grid grid-cols-12 gap-2 items-center">
              {/* Play/Pause Button */}
              <div className="col-span-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </Button>
              </div>
              
              {/* Skip Backward/Forward */}
              <div className="col-span-2 flex justify-start">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => skip(-15)}
                  aria-label="Skip backward 15 seconds"
                >
                  <SkipBack size={20} />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => skip(15)}
                  aria-label="Skip forward 15 seconds"
                >
                  <SkipForward size={20} />
                </Button>
              </div>
              
              {/* Current Time */}
              <div className="col-span-1 text-xs text-right">
                {formatTime(currentTime)}
              </div>
              
              {/* Progress Bar */}
              <div className="col-span-4">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={0.01}
                  onValueChange={handleTimeChange}
                  aria-label="Seek position"
                />
              </div>
              
              {/* Duration */}
              <div className="col-span-1 text-xs text-left">
                {formatTime(duration)}
              </div>
              
              {/* Loop Button */}
              <div className="col-span-1">
                <Button 
                  variant={isLooping ? "default" : "ghost"} 
                  size="icon" 
                  onClick={toggleLoop}
                  aria-label={isLooping ? "Disable loop" : "Enable loop"}
                >
                  <Repeat size={20} />
                </Button>
              </div>
              
              {/* Volume Control */}
              <div className="col-span-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
              </div>
              
              <div className="col-span-2 md:block hidden">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </div>
              
              {/* Piano Button */}
              <div className="col-span-1">
                <Button 
                  variant={showPiano ? "default" : "ghost"} 
                  size="icon" 
                  onClick={togglePiano}
                  aria-label={showPiano ? "Hide piano" : "Show piano"}
                >
                  <Piano size={20} />
                </Button>
              </div>
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
        className={`piano-container fixed bottom-0 left-0 right-0 bg-background border-t transition-transform duration-300 ease-in-out ${
          showPiano ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <PianoKeyboard />
      </div>
    </div>
  );
}
