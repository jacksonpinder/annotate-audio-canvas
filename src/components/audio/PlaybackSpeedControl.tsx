import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Gauge } from 'lucide-react';  // Changed from Clock to Gauge
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PlaybackSpeedControlProps {
  speed: number;
  tempSpeed: number;
  isSpeedControlVisible: boolean;
  showSpeedControl: () => void;
  scheduleHideSpeedControl: () => void;
  handleTempSpeedChange: (newValue: number[]) => void;
  applySpeed: () => void;
  resetSpeed: () => void;
  speedToSliderValue: (speed: number) => number;
}

// Helper function to format speed to exactly 2 decimal places
const formatSpeed = (speed: number, includeWord: boolean = false): string => {
  return speed.toFixed(2).replace(/\.?0+$/, '') + 'x' + (includeWord ? ' speed' : '');
};

export default function PlaybackSpeedControl({
  speed,
  tempSpeed,
  isSpeedControlVisible,
  showSpeedControl,
  scheduleHideSpeedControl,
  handleTempSpeedChange,
  applySpeed,
  resetSpeed,
  speedToSliderValue
}: PlaybackSpeedControlProps) {
  const isNonDefaultSpeed = speed !== 1;
  // Store the last non-default speed value
  const lastCustomSpeedRef = useRef<number>(isNonDefaultSpeed ? speed : 1.25);
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);

  // Custom reset/toggle function
  const handleSpeedToggle = () => {
    if (isNonDefaultSpeed) {
      // If non-default, store the current speed and reset to default
      lastCustomSpeedRef.current = speed;
      resetSpeed();
    } else {
      // If at default (1.0), restore to the last custom speed
      handleTempSpeedChange([speedToSliderValue(lastCustomSpeedRef.current)]);
      applySpeed();
    }
  };
  
  // Sync external visibility state with local state
  useEffect(() => {
    setIsSliderOpen(isSpeedControlVisible);
  }, [isSpeedControlVisible]);
  
  // Function to show the slider
  const handleShowSlider = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showSpeedControl();
  };
  
  // Function to hide the slider
  const handleHideSlider = () => {
    scheduleHideSpeedControl();
  };
  
  return (
    <div className="relative flex-shrink-0 speed-control"
      onMouseEnter={handleShowSlider}
      onMouseLeave={handleHideSlider}
    >
      <Popover open={isSliderOpen} onOpenChange={setIsSliderOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={isNonDefaultSpeed ? "default" : "ghost"}
            size="icon" 
            onClick={handleSpeedToggle}
            aria-label="Adjust playback speed"
            className="audio-control-button flex-shrink-0"
            data-state={isNonDefaultSpeed ? "active" : "inactive"}
          >
            <div className="audio-control-icon">
              <Gauge size={20} />
            </div>
            {isNonDefaultSpeed && (
              <span className="audio-control-label">
                {formatSpeed(speed)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="speed-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleShowSlider}
          onMouseLeave={handleHideSlider}
        >
          <div className="text-center mb-1 text-xs font-medium">{formatSpeed(tempSpeed, true)}</div>
          <div className="w-full flex items-center gap-2 py-1">
            <span className="text-xs font-medium">0.5x</span>
            <Slider
              value={[speedToSliderValue(tempSpeed)]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleTempSpeedChange}
              onValueCommit={applySpeed}
              aria-label="Playback speed"
            />
            <span className="text-xs font-medium">1.5x</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
