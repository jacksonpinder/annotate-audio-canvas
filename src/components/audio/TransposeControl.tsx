import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useRef, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TransposeControlProps {
  transpose: number;
  tempTranspose: number;
  isTransposeVisible: boolean;
  showTranspose: () => void;
  scheduleHideTranspose: () => void;
  handleTempTransposeChange: (newValue: number[]) => void;
  applyTranspose: () => void;
  resetTranspose: () => void;
}

export default function TransposeControl({
  transpose,
  tempTranspose,
  isTransposeVisible,
  showTranspose,
  scheduleHideTranspose,
  handleTempTransposeChange,
  applyTranspose,
  resetTranspose
}: TransposeControlProps) {
  const pitchLabels = ['-b5', '-4', '-3', '-b3', '-2', '-b2', '0', '+b2', '+2', '+b3', '+3', '+4', '+b5'];
  const pitchToSliderValue = (pitch: number) => ((pitch + 6) / 12) * 100;
  const sliderToPitch = (value: number) => Math.round((value / 100) * 12) - 6;
  const isTransposed = transpose !== 0;
  
  // Store the last non-default transpose value
  const lastCustomTransposeRef = useRef<number>(isTransposed ? transpose : 2);
  const [isSliderOpen, setIsSliderOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);
  
  // Custom toggle function for transpose
  const handleTransposeToggle = () => {
    if (isTransposed) {
      // If currently transposed, save value and reset to default
      lastCustomTransposeRef.current = transpose;
      resetTranspose();
    } else {
      // If at default (0), apply the last custom transpose value
      handleTempTransposeChange([lastCustomTransposeRef.current]);
      applyTranspose();
    }
  };
  
  // Sync external visibility state with local state
  useEffect(() => {
    setIsSliderOpen(isTransposeVisible);
  }, [isTransposeVisible]);
  
  // Function to show the slider
  const handleShowSlider = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTranspose();
  };
  
  // Function to hide the slider
  const handleHideSlider = () => {
    scheduleHideTranspose();
  };

  return (
    <div className="relative flex-shrink-0 transpose-control"
      onMouseEnter={handleShowSlider}
      onMouseLeave={handleHideSlider}
    >
      <Popover open={isSliderOpen} onOpenChange={setIsSliderOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={isTransposed ? "default" : "ghost"}
            size="icon" 
            onClick={handleTransposeToggle}
            aria-label="Adjust pitch"
            className="audio-control-button flex-shrink-0"
            data-state={isTransposed ? "active" : "inactive"}
          >
            <div className="audio-control-icon flex items-center gap-0.5">
              <span className={cn(
                "text-base transition-opacity",
                transpose < 0 ? "opacity-100" : transpose === 0 ? "text-[#0F172A]" : "opacity-40"
              )}>♭</span>
              <span className={cn(
                "text-base transition-opacity",
                transpose > 0 ? "opacity-100" : transpose === 0 ? "text-[#0F172A]" : "opacity-40"
              )}>#</span>
            </div>
            {isTransposed && (
              <span className="audio-control-label">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          side="top" 
          align="center" 
          className="transpose-slider w-48 p-3 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleShowSlider}
          onMouseLeave={handleHideSlider}
        >
          <div className="text-center mb-1 text-xs font-medium">
            {tempTranspose === 0 ? 'Original pitch' : `${tempTranspose > 0 ? '+' : ''}${tempTranspose} semitones`}
          </div>
          <div className="w-full flex items-center gap-2 py-1">
            <span className="text-xs font-medium">-b5</span>
            <Slider
              value={[pitchToSliderValue(tempTranspose)]}
              min={0}
              max={100}
              step={8.33}
              onValueChange={(value) => handleTempTransposeChange([sliderToPitch(value[0])])}
              onValueCommit={applyTranspose}
              aria-label="Transpose pitch"
            />
            <span className="text-xs font-medium">+b5</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
