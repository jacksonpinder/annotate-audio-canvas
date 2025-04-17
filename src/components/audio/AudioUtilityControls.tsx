
import { Button } from '@/components/ui/button';
import { Piano, Repeat } from 'lucide-react';

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
        className="flex-shrink-0"
      >
        <Repeat size={20} />
      </Button>
      
      {/* Piano Button */}
      <Button 
        variant={showPiano ? "default" : "ghost"} 
        size="icon" 
        onClick={togglePiano}
        aria-label={showPiano ? "Hide piano" : "Show piano"}
        className="flex-shrink-0"
      >
        <Piano size={20} />
      </Button>
    </>
  );
}
