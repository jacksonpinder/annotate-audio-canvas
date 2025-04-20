import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from '@/types/annotation';

interface AnnotationLayerProps {
  annotations: Annotation[];
  pageNumber: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationAdd?: (annotation: Partial<Annotation>) => void;
  isEditing: boolean;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  pageNumber,
  scale,
  rotation,
  width,
  height,
  onAnnotationClick,
  onAnnotationAdd,
  isEditing
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Filter annotations for current page
  const pageAnnotations = annotations.filter(a => a.pageNumber === pageNumber);

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas dimensions to match the page
    canvas.width = width;
    canvas.height = height;
    
    // Draw each annotation
    pageAnnotations.forEach(annotation => {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Yellow highlight with transparency
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
      ctx.lineWidth = 2;
      
      const x = annotation.x * scale;
      const y = annotation.y * scale;
      const w = annotation.width * scale;
      const h = annotation.height * scale;
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });
  }, [pageAnnotations, scale, width, height]);

  // Handle mouse events for drawing new annotations
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditing || !isDrawing || !startPoint) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    
    // Clear the canvas and redraw existing annotations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw existing annotations
    pageAnnotations.forEach(annotation => {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
      ctx.lineWidth = 2;
      
      const x = annotation.x * scale;
      const y = annotation.y * scale;
      const w = annotation.width * scale;
      const h = annotation.height * scale;
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });
    
    // Draw the current selection rectangle
    ctx.fillStyle = 'rgba(0, 162, 255, 0.3)';
    ctx.strokeStyle = 'rgba(0, 122, 205, 0.5)';
    ctx.lineWidth = 2;
    
    const x = Math.min(startPoint.x, currentX) * scale;
    const y = Math.min(startPoint.y, currentY) * scale;
    const w = Math.abs(currentX - startPoint.x) * scale;
    const h = Math.abs(currentY - startPoint.y) * scale;
    
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isEditing || !isDrawing || !startPoint) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    
    // Create new annotation
    const minX = Math.min(startPoint.x, currentX);
    const minY = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);
    
    // Only add annotation if it has some size
    if (width > 5 / scale && height > 5 / scale && onAnnotationAdd) {
      onAnnotationAdd({
        pageNumber,
        x: minX,
        y: minY,
        width,
        height,
        text: '',
        timestamp: new Date().toISOString()
      });
    }
    
    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleAnnotationClick = (e: React.MouseEvent) => {
    if (isEditing || !onAnnotationClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Find if the click is inside any annotation
    for (const annotation of pageAnnotations) {
      if (
        x >= annotation.x &&
        x <= annotation.x + annotation.width &&
        y >= annotation.y &&
        y <= annotation.y + annotation.height
      ) {
        onAnnotationClick(annotation);
        break;
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="annotation-layer" 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'all',
          cursor: isEditing ? 'crosshair' : 'pointer'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleAnnotationClick}
      />
    </div>
  );
};

export default AnnotationLayer; 