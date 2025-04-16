
import { useRef, useState, useEffect, RefObject } from 'react';
import { useToast } from '@/components/ui/use-toast';
import Draggable from 'react-draggable';
import rough from 'roughjs/bundled/rough.esm';

interface Point {
  x: number;
  y: number;
}

interface FreehandAnnotation {
  type: 'freehand';
  points: Point[];
  color: string;
  width: number;
  pageNumber: number;
}

interface ShapeAnnotation {
  type: 'shape';
  shape: 'rectangle' | 'ellipse';
  start: Point;
  end: Point;
  color: string;
  width: number;
  pageNumber: number;
}

interface TextAnnotation {
  type: 'text';
  position: Point;
  content: string;
  color: string;
  fontSize: number;
  pageNumber: number;
}

type Annotation = FreehandAnnotation | ShapeAnnotation | TextAnnotation;

interface AnnotationLayerProps {
  containerRef: RefObject<HTMLDivElement>;
  activeTool: string | null;
  scale: number;
  pageNumber: number;
}

export default function AnnotationLayer({ containerRef, activeTool, scale, pageNumber }: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingText, setEditingText] = useState<TextAnnotation | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Resize canvas when container size changes
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          renderAnnotations();
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Filter annotations for current page and re-render when scale changes
  useEffect(() => {
    renderAnnotations();
  }, [scale, annotations, pageNumber]);

  // Focus the text input when editing text
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingText]);

  function getMousePosition(e: React.MouseEvent | MouseEvent): Point {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!activeTool || !canvasRef.current) return;
    
    const position = getMousePosition(e);
    
    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentAnnotation({
        type: 'freehand',
        points: [position],
        color: '#000000',
        width: 2,
        pageNumber
      });
    } else if (activeTool === 'shape') {
      setIsDrawing(true);
      setCurrentAnnotation({
        type: 'shape',
        shape: 'rectangle',
        start: position,
        end: position,
        color: '#000000',
        width: 2,
        pageNumber
      });
    } else if (activeTool === 'text') {
      const newTextAnnotation: TextAnnotation = {
        type: 'text',
        position,
        content: '',
        color: '#000000',
        fontSize: 16,
        pageNumber
      };
      setEditingText(newTextAnnotation);
      setTextContent('');
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing || !currentAnnotation || !canvasRef.current) return;
    
    const position = getMousePosition(e);
    
    if (currentAnnotation.type === 'freehand') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, position]
      });
      
      // Draw the current stroke
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const lastPoint = currentAnnotation.points[currentAnnotation.points.length - 1];
        ctx.strokeStyle = currentAnnotation.color;
        ctx.lineWidth = currentAnnotation.width;
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      }
    } else if (currentAnnotation.type === 'shape') {
      setCurrentAnnotation({
        ...currentAnnotation,
        end: position
      });
      
      // Redraw all annotations including the current one
      renderAnnotations();
    }
  }

  function handleMouseUp() {
    if (!isDrawing || !currentAnnotation) return;
    
    setIsDrawing(false);
    setAnnotations([...annotations, currentAnnotation]);
    setCurrentAnnotation(null);
  }

  function handleTextSubmit() {
    if (!editingText) return;
    
    if (textContent.trim()) {
      const newTextAnnotation: TextAnnotation = {
        ...editingText,
        content: textContent
      };
      
      setAnnotations([...annotations, newTextAnnotation]);
      setEditingText(null);
      setTextContent('');
    } else {
      setEditingText(null);
    }
  }

  function renderAnnotations() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create RoughCanvas instance using the updated import
    const roughCanvas = rough.canvas(canvas);
    
    // Filter annotations for the current page
    const pageAnnotations = annotations.filter(anno => anno.pageNumber === pageNumber);
    
    // Draw all annotations for this page
    pageAnnotations.forEach(annotation => {
      if (annotation.type === 'freehand') {
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.width;
        ctx.beginPath();
        
        const { points } = annotation;
        if (points.length < 2) return;
        
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
      } else if (annotation.type === 'shape') {
        const { start, end, color, width: lineWidth } = annotation;
        
        if (annotation.shape === 'rectangle') {
          roughCanvas.rectangle(
            start.x,
            start.y,
            end.x - start.x,
            end.y - start.y,
            {
              stroke: color,
              strokeWidth: lineWidth,
              fill: 'transparent',
              fillStyle: 'solid'
            }
          );
        } else if (annotation.shape === 'ellipse') {
          const centerX = (start.x + end.x) / 2;
          const centerY = (start.y + end.y) / 2;
          const width = Math.abs(end.x - start.x);
          const height = Math.abs(end.y - start.y);
          
          roughCanvas.ellipse(
            centerX,
            centerY,
            width,
            height,
            {
              stroke: color,
              strokeWidth: lineWidth,
              fill: 'transparent',
              fillStyle: 'solid'
            }
          );
        }
      } else if (annotation.type === 'text') {
        ctx.font = `${annotation.fontSize}px sans-serif`;
        ctx.fillStyle = annotation.color;
        ctx.fillText(annotation.content, annotation.position.x, annotation.position.y);
      }
    });
    
    // Draw current shape if drawing
    if (isDrawing && currentAnnotation && currentAnnotation.type === 'shape') {
      const { start, end, color, width: lineWidth } = currentAnnotation;
      
      if (currentAnnotation.shape === 'rectangle') {
        roughCanvas.rectangle(
          start.x,
          start.y,
          end.x - start.x,
          end.y - start.y,
          {
            stroke: color,
            strokeWidth: lineWidth,
            fill: 'transparent',
            fillStyle: 'solid'
          }
        );
      } else if (currentAnnotation.shape === 'ellipse') {
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        roughCanvas.ellipse(
          centerX,
          centerY,
          width,
          height,
          {
            stroke: color,
            strokeWidth: lineWidth,
            fill: 'transparent',
            fillStyle: 'solid'
          }
        );
      }
    }
  }

  return (
    <div className="annotation-layer absolute top-0 left-0 w-full h-full pointer-events-auto">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {editingText && (
        <Draggable
          defaultPosition={{
            x: editingText.position.x,
            y: editingText.position.y
          }}
          onStop={(e, data) => {
            setEditingText({
              ...editingText,
              position: { x: data.x, y: data.y }
            });
          }}
        >
          <div className="absolute z-10">
            <textarea
              ref={textInputRef}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              className="min-w-[100px] min-h-[40px] p-2 border rounded resize text-base"
              placeholder="Enter text here..."
              autoFocus
            />
          </div>
        </Draggable>
      )}
    </div>
  );
}
