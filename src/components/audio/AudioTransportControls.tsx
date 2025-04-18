
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';

interface AudioTransportControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlayPause: () => void;
  skip: (seconds: number) => void;
  handleTimeChange: (newValue: number[]) => void;
  formatTime: (time: number) => string;
}

export default function AudioTransportControls({
  isPlaying,
  currentTime,
  duration,
  togglePlayPause,
  skip,
  handleTimeChange,
  formatTime
}: AudioTransportControlsProps) {
  return (
    <>
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
    </>
  );
}
