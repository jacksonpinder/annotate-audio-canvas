
export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: string;
  color: string;
  timestamp?: number; // Optional timestamp linked to audio
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Point[];
  strokeWidth: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse';
  start: Point;
  end: Point;
  strokeWidth: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Point;
  content: string;
  fontSize: number;
}

export type Annotation = FreehandAnnotation | ShapeAnnotation | TextAnnotation;

// Generate a unique ID for annotations
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Calculate dimensions for shape annotations
export const calculateShapeDimensions = (
  start: Point,
  end: Point
): { x: number; y: number; width: number; height: number } => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  
  return { x, y, width, height };
};

// Helper to convert canvas coordinates to PDF coordinates
export const canvasToPdfCoordinates = (
  point: Point,
  canvasRect: DOMRect,
  scale: number
): Point => {
  return {
    x: point.x / scale,
    y: point.y / scale,
  };
};

// Helper to convert PDF coordinates to canvas coordinates
export const pdfToCanvasCoordinates = (
  point: Point,
  canvasRect: DOMRect,
  scale: number
): Point => {
  return {
    x: point.x * scale,
    y: point.y * scale,
  };
};
