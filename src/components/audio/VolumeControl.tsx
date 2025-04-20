import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VerticalSlider } from '@/components/ui/vertical-slider';
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react';
import { useHoverControl } from '@/hooks/useHoverControl';
import { cn } from '@/lib/utils';

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
  const { isVisible, show, scheduleHide } = useHoverControl(250);
  const [displayVolume, setDisplayVolume] = useState<number>(volume);
  const [mutedBySlider, setMutedBySlider] = useState<boolean>(false);
  const lastVolumeRef = useRef<number>(volume > 0 ? volume : 0.75);
  const [isHoveringSlider, setIsHoveringSlider] = useState<boolean>(false);
  const hideTimeoutRef = useRef<number | null>(null);

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
    show();
  };
  
  // Function to schedule hiding the volume slider after delay
  const scheduleHideVolumeSlider = () => {
    scheduleHide();
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
      className="relative flex-shrink-0 volume-control"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      <Popover open={isVisible}>
        <PopoverTrigger asChild>
          <Button 
            variant={isMuted ? "default" : "ghost"}
            size="icon" 
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            aria-pressed={isMuted}
            className="audio-control-button flex-shrink-0"
            data-state={isMuted ? "active" : "inactive"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            <div className="audio-control-icon volume-icon">
              {getVolumeIcon()}
            </div>
            {isMuted && (
              <span className="audio-control-label">
                Muted
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="volume-slider w-14 p-3 h-32 flex flex-col items-center justify-center gap-1 z-50"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
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
