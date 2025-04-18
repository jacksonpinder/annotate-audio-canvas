
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomControl({
  scale,
  onZoomIn,
  onZoomOut
}: ZoomControlProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md border border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[4rem] text-center text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="hover:bg-accent hover:text-accent-foreground"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
