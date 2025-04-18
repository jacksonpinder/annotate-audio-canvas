
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
        <div className="flex flex-col items-center">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="text-[10px] mt-1 text-muted-foreground">
            {isPlaying ? 'Pause' : 'Play'}
          </span>
        </div>
      </Button>
      
      {/* Skip Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => skip(-15)}
          aria-label="Rewind 15 seconds"
          className="flex-shrink-0"
        >
          <div className="flex flex-col items-center">
            <Rewind size={20} />
            <span className="text-[10px] mt-1 text-muted-foreground">-15s</span>
          </div>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => skip(15)}
          aria-label="Fast forward 15 seconds"
          className="flex-shrink-0"
        >
          <div className="flex flex-col items-center">
            <FastForward size={20} />
            <span className="text-[10px] mt-1 text-muted-foreground">+15s</span>
          </div>
        </Button>
      </div>
      
      {/* Progress Bar Section */}
      <div className="flex items-center gap-2 flex-grow mx-2">
        <span className="text-xs text-muted-foreground min-w-[3ch]">
          {formatTime(currentTime)}
        </span>
        
        <div className="flex-grow">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.01}
            onValueChange={handleTimeChange}
            aria-label="Seek position"
          />
        </div>
        
        <span className="text-xs text-muted-foreground min-w-[3ch]">
          {formatTime(duration - currentTime)}
        </span>
      </div>
    </>
  );
}
