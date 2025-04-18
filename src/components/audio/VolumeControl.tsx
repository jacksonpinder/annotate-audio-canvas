
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VerticalSlider } from '@/components/ui/vertical-slider';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  toggleMute: () => void;
  handleVolumeChange: (newValue: number[]) => void;
}

export default function VolumeControl({
  volume,
  isMuted,
  toggleMute,
  handleVolumeChange
}: VolumeControlProps) {
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState<boolean>(false);

  return (
    <div className="relative flex-shrink-0">
      <Popover open={isVolumeSliderOpen} onOpenChange={setIsVolumeSliderOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="flex-shrink-0"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="w-12 p-3 h-32 flex items-center justify-center"
        >
          <VerticalSlider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            aria-label="Volume"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
