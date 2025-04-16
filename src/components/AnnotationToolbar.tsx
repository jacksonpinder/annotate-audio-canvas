
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PenLine, Square, Type, Undo2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface AnnotationToolbarProps {
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function AnnotationToolbar({
  activeTool,
  setActiveTool,
  scale,
  onZoomIn,
  onZoomOut,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage
}: AnnotationToolbarProps) {
  const handleToolClick = (tool: string) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  return (
    <div className="annotation-toolbar flex items-center p-2 bg-muted rounded-md mb-2 overflow-x-auto">
      <TooltipProvider>
        <div className="flex space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'pen' ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleToolClick('pen')}
                aria-label="Freehand drawing"
              >
                <PenLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freehand drawing</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'shape' ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleToolClick('shape')}
                aria-label="Shape tool"
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shape tool</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'text' ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleToolClick('text')}
                aria-label="Text tool"
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Text tool</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveTool(null)}
                aria-label="Undo"
                disabled={!activeTool}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel annotation</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-2 h-6" />

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onZoomOut}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <span className="text-xs px-2">
            {Math.round(scale * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onZoomIn}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-2 h-6" />

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevPage}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>

          <span className="text-xs px-2 min-w-12 text-center">
            {currentPage} / {totalPages}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
