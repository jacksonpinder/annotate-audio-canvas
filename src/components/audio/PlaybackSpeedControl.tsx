import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Gauge } from 'lucide-react';  // Changed from Clock to Gauge
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AudioService from '@/audio/AudioService';

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
  MIN_SPEED?: number;
  MAX_SPEED?: number;
  SPEED_STEP?: number;
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
  speedToSliderValue,
  MIN_SPEED = 0.5,
  MAX_SPEED = 1.5,
  SPEED_STEP = 0.05
}: PlaybackSpeedControlProps) {
  const isNonDefaultSpeed = speed !== 1;
  // Store the last non-default speed value
  const lastCustomSpeedRef = useRef<number>(isNonDefaultSpeed ? speed : 1.25);
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom toggle function - only toggles slider visibility
  const handleSpeedToggle = () => {
    setIsSliderOpen((prev) => !prev);
  };
  
  // Separate function for handling speed changes - not tied to button click
  const handleSpeedChange = () => {
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

  // Mouse enter and leave handlers
  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsSliderOpen(false);
    }, 250);
  };
  
  // Effect to handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const popoverContent = document.querySelector('.speed-slider');
      const speedControl = document.querySelector('.speed-control');
      const speedButton = document.querySelector('.speed-control .audio-control-button');

      if (
        isSliderOpen &&
        !speedControl?.contains(target) &&
        !speedButton?.contains(target) &&
        !popoverContent?.contains(target)
      ) {
        if (speed !== 1) {
          lastCustomSpeedRef.current = speed;
        }
        setIsSliderOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSliderOpen, speed]);
  
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
    <div className="relative flex-shrink-0 speed-control">
      <Popover open={isSliderOpen} onOpenChange={(open) => open && setIsSliderOpen(true)}>
        <div className="control-with-label">
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
            </Button>
          </PopoverTrigger>
          <div className="label-below">{formatSpeed(speed)}</div>
        </div>
        <PopoverContent 
          side="top" 
          align="center" 
          className="speed-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-center mb-1 text-xs font-medium">{formatSpeed(tempSpeed, true)}</div>
          <div className="w-full flex items-center gap-2 py-1">
            <span className="text-xs font-medium">{MIN_SPEED}x</span>
            <Slider
              value={[speedToSliderValue(tempSpeed)]}
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={SPEED_STEP}
              onValueChange={handleTempSpeedChange}
              onValueCommit={() => {
                applySpeed();
                if (AudioService.getIsSoundTouchActive()) {
                  console.log(`PlaybackSpeedControl: Committing speed change to ${tempSpeed}`);
                  AudioService.setSpeed(tempSpeed);
                  AudioService.crossFadeNodes(AudioService.getCurrentPitchSemitones(), tempSpeed);
                }
              }}
              aria-label="Playback speed"
            />
            <span className="text-xs font-medium">{MAX_SPEED}x</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
