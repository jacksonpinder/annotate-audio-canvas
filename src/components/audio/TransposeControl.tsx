
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

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

  return (
    <div className="relative flex-shrink-0"
      onMouseEnter={showTranspose}
      onMouseLeave={scheduleHideTranspose}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={resetTranspose}
        aria-label="Adjust pitch"
        className={cn(
          "flex-shrink-0",
          transpose !== 0 && "text-primary"
        )}
      >
        <div className="relative flex items-center gap-0.5">
          <span className={cn(
            "text-base transition-opacity",
            transpose < 0 ? "opacity-100" : "opacity-40"
          )}>♭</span>
          <span className={cn(
            "text-base transition-opacity",
            transpose > 0 ? "opacity-100" : "opacity-40"
          )}>#</span>
          {transpose !== 0 && (
            <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] font-medium">
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
          )}
        </div>
      </Button>
      
      {isTransposeVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover rounded-md shadow-md p-2 w-48 z-50"
          onClick={(e) => e.stopPropagation()}
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
        </div>
      )}
    </div>
  );
}
