import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VerticalSlider } from '@/components/ui/vertical-slider';
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  toggleMute: () => void;
  handleVolumeChange: (newValue: number[]) => void;
  className?: string;
}

export default function VolumeControl({
  volume,
  isMuted,
  toggleMute,
  handleVolumeChange,
  className
}: VolumeControlProps) {
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(volume > 0 ? volume : 0.75); // Initialize with current volume or default
  const [displayVolume, setDisplayVolume] = useState<number>(volume);
  const [mutedBySlider, setMutedBySlider] = useState<boolean>(false);
  const [isHoveringSlider, setIsHoveringSlider] = useState<boolean>(false);
  
  // Update the displayed volume based on mute state
  useEffect(() => {
    if (isMuted) {
      // When muted, show 0 for the slider
      setDisplayVolume(0);
    } else {
      // When unmuted, show actual volume
      setDisplayVolume(volume);
      
      // Store the last non-zero volume when unmuting or changing volume
      if (volume > 0) {
        lastVolumeRef.current = volume;
      }
    }
  }, [volume, isMuted]);
  
  // Clear any existing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);
  
  // Function to show the volume slider
  const showVolumeSlider = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVolumeSliderOpen(true);
  };
  
  // Function to schedule hiding the volume slider after delay
  const scheduleHideVolumeSlider = () => {
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVolumeSliderOpen(false);
      hideTimeoutRef.current = null;
    }, 250); // Reduced from 500ms to 250ms
  };
  
  // Handle mouse enter on the slider
  const handleSliderEnter = () => {
    setIsHoveringSlider(true);
    showVolumeSlider();
  };
  
  // Handle mouse leave on the slider
  const handleSliderLeave = () => {
    setIsHoveringSlider(false);
    scheduleHideVolumeSlider();
  };
  
  // Get the appropriate volume icon based on volume level and mute state
  const getVolumeIcon = () => {
    if (isMuted) return <VolumeX size={20} />;
    if (volume === 0) return <Volume size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };
  
  // Handle volume changes with automatic muting/unmuting
  const handleVolumeChangeWithAutoMute = (newValue: number[]) => {
    const newVolume = newValue[0];
    
    // If volume is set to 0, automatically mute and mark as muted by slider
    if (newVolume === 0 && !isMuted) {
      setMutedBySlider(true);
      toggleMute();
    }
    // If volume is changed from 0 to non-zero or is muted, unmute
    else if ((volume === 0 || isMuted) && newVolume > 0) {
      if (isMuted) {
        setMutedBySlider(false);
        toggleMute();
      }
    }
    
    // Always update the volume
    handleVolumeChange(newValue);
  };
  
  // Custom toggle mute that also sets volume to 0 or restores previous volume
  const handleToggleMute = () => {
    if (!isMuted) {
      // When muting via button, mark as NOT muted by slider
      setMutedBySlider(false);
      toggleMute();
    } else {
      // When unmuting, behavior depends on how it was muted
      if (mutedBySlider) {
        // If muted by sliding to zero, set to 60%
        handleVolumeChange([0.6]);
      } else {
        // If muted by button, restore to last non-zero volume
        const restoreVolume = lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.75;
        handleVolumeChange([restoreVolume]);
      }
      setMutedBySlider(false);
      toggleMute();
    }
  };

  return (
    <div 
      className={cn("relative flex-shrink-0 volume-control", className)}
      onMouseEnter={() => {
        if (!isHoveringSlider) {
          showVolumeSlider();
        }
      }}
      onMouseLeave={() => {
        if (!isHoveringSlider) {
          scheduleHideVolumeSlider();
        }
      }}
    >
      <Popover open={isVolumeSliderOpen} onOpenChange={setIsVolumeSliderOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={isMuted ? "destructive" : volume === 0 ? "secondary" : "ghost"}
            size="icon" 
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className={cn("audio-control-button flex-shrink-0", className)}
            data-state={isMuted ? "active" : "inactive"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            <div className="audio-control-icon volume-icon">
              {getVolumeIcon()}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="volume-slider w-14 p-3 h-32 flex flex-col items-center justify-center gap-1 z-50"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleSliderEnter}
          onMouseLeave={handleSliderLeave}
        >
          <VerticalSlider
            value={[displayVolume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChangeWithAutoMute}
            aria-label="Volume"
            aria-valuetext={`${Math.round(displayVolume * 100)}%`}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
