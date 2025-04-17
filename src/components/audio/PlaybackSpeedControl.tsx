
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  return (
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
  );
}
