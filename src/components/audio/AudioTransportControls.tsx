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
        className="audio-control-button flex-shrink-0 play-pause-button"
      >
        <div className="audio-control-icon flex items-center justify-center w-full">
          {isPlaying ? 
            <Pause size={32} className="transform scale-125" /> : 
            <Play size={32} className="transform scale-125" />
          }
        </div>
      </Button>
      
      {/* Rewind 15 seconds */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => skip(-15)}
        aria-label="Rewind 15 seconds"
        className="audio-control-button flex-shrink-0"
      >
        <div className="audio-control-icon relative">
          <RotateCcw size={32} />
          <span 
            className="absolute text-[8px] font-bold text-current" 
            style={{ 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              marginTop: '-2px'  // Fine-tune vertical positioning
            }}
          >
            15
          </span>
        </div>
        <span className="audio-control-label font-light opacity-50">back</span>
      </Button>
      
      {/* Progress Bar Container */}
      <div className="flex-grow mx-1 relative audio-control-button">
        {/* Slider Container */}
        <div className="w-full flex items-center audio-control-icon justify-center">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.01}
            onValueChange={handleTimeChange}
            aria-label="Seek position"
            className="w-full"
          />
        </div>
        
        {/* Bottom label container, same level as other button labels */}
        <div className="absolute bottom-4 left-0 right-0 w-full">
          <span className="absolute left-0 text-xs" style={{ fontSize: '12px', lineHeight: 1 }}>
            {formatTime(currentTime)}
          </span>
          <span className="absolute right-0 text-xs" style={{ fontSize: '12px', lineHeight: 1 }}>
            {formatTime(duration - currentTime)}
          </span>
        </div>
      </div>
      
      {/* Fast Forward 15 seconds */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => skip(15)}
        aria-label="Fast forward 15 seconds"
        className="audio-control-button flex-shrink-0"
      >
        <div className="audio-control-icon relative">
          <RotateCw size={32} />
          <span 
            className="absolute text-[8px] font-bold text-current" 
            style={{ 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              marginTop: '-2px'  // Fine-tune vertical positioning
            }}
          >
            15
          </span>
        </div>
        <span className="audio-control-label font-light opacity-50">ahead</span>
      </Button>
    </>
  );
}
