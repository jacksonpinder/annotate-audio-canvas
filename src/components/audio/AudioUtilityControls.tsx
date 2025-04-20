import { Button } from '@/components/ui/button';
import { Piano, Repeat2 } from 'lucide-react';

interface AudioUtilityControlsProps {
  isLooping: boolean;
  showPiano: boolean;
  toggleLoop: () => void;
  togglePiano: () => void;
}

export default function AudioUtilityControls({
  isLooping,
  showPiano,
  toggleLoop,
  togglePiano
}: AudioUtilityControlsProps) {
  return (
    <>
      {/* Loop Button */}
      <Button 
        variant={isLooping ? "default" : "ghost"} 
        size="icon" 
        onClick={toggleLoop}
        aria-label={isLooping ? "Disable loop" : "Enable loop"}
        className="audio-control-button flex-shrink-0"
        data-state={isLooping ? "active" : "inactive"}
      >
        <div className="audio-control-icon">
          <Repeat2 size={20} />
        </div>
        {isLooping && (
          <span className="audio-control-label">
            Loop
          </span>
        )}
      </Button>
      
      {/* Piano Button */}
      <Button 
        variant={showPiano ? "default" : "ghost"} 
        size="icon" 
        onClick={togglePiano}
        aria-label={showPiano ? "Hide piano" : "Show piano"}
        className="audio-control-button flex-shrink-0"
        data-state={showPiano ? "active" : "inactive"}
      >
        <div className="audio-control-icon">
          <Piano size={20} />
        </div>
        {showPiano && (
          <span className="audio-control-label">
            Piano
          </span>
        )}
      </Button>
    </>
  );
}
