import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

interface AudioTransportControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlayPause: () => void;
  skip: (seconds: number) => void;
  handleTimeChange: (newValue: number[]) => void;
  formatTime: (time: number) => string;
  isDisabled?: boolean;
  needsUserInteraction?: boolean;
}

export default function AudioTransportControls({
  isPlaying,
  currentTime,
  duration,
  togglePlayPause,
  skip,
  handleTimeChange,
  formatTime,
  isDisabled = false,
  needsUserInteraction = false
}: AudioTransportControlsProps) {

  const PlayPauseIcon = isPlaying ? Pause : Play;
  const playPauseLabel = isPlaying ? "Pause" : "Play";
  
  const playButtonClass = needsUserInteraction ? "animate-pulse border border-yellow-500" : "";

  return (
    <>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayPause}
        aria-label={playPauseLabel}
        className={`control-slot play-pause-button ${playButtonClass}`}
        data-state={isPlaying ? "active" : "inactive"}
        disabled={isDisabled}
      >
        <div className="icon-slot">
          <PlayPauseIcon strokeWidth={1.2} />
        </div>
        {needsUserInteraction && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-yellow-500"></span>}
      </Button>
      
      {/* Rewind 15 seconds */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => skip(-15)}
        aria-label="Rewind 15 seconds"
        className="control-slot rewind-button"
        disabled={isDisabled}
      >
        <div className="icon-slot">
          <RotateCcw strokeWidth={1.2} />
          <span className="numeric-label">15</span>
        </div>
      </Button>
      
      {/* Progress Bar Container */}
      <div className="flex-grow mx-1 relative audio-control-button">
        {/* Slider Container */}
        <div className="w-full flex items-center audio-control-icon justify-center">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.01}
            onValueChange={handleTimeChange}
            aria-label="Seek position"
            className="w-full"
            disabled={isDisabled || duration <= 0}
          />
        </div>
        
        {/* Bottom label container, same level as other button labels */}
        <div className="absolute bottom-4 left-0 right-0 w-full">
          <span className="absolute left-0 text-xs" style={{ fontSize: '12px', lineHeight: 1 }}>
            {formatTime(currentTime)}
          </span>
          <span className="absolute right-0 text-xs" style={{ fontSize: '12px', lineHeight: 1 }}>
            {duration > 0 ? formatTime(Math.max(0, duration - currentTime)) : '--:--'}
          </span>
        </div>
      </div>
      
      {/* Fast Forward 15 seconds */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => skip(15)}
        aria-label="Fast forward 15 seconds"
        className="control-slot forward-button"
        disabled={isDisabled}
      >
        <div className="icon-slot">
          <RotateCw strokeWidth={1.2} />
          <span className="numeric-label">15</span>
        </div>
      </Button>
    </>
  );
}
