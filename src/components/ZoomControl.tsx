
import React from 'react';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ZoomControl = ({ onZoomIn, onZoomOut }: ZoomControlProps) => {
  return (
    <div className="absolute top-4 right-4 flex gap-2 z-10">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        className="bg-black/20 hover:bg-black/30 backdrop-blur-sm md:h-8 md:w-8 h-10 w-10"
      >
        <ZoomOut className="md:h-4 md:w-4 h-5 w-5 text-white" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        className="bg-black/20 hover:bg-black/30 backdrop-blur-sm md:h-8 md:w-8 h-10 w-10"
      >
        <ZoomIn className="md:h-4 md:w-4 h-5 w-5 text-white" />
      </Button>
    </div>
  );
};

export default ZoomControl;
