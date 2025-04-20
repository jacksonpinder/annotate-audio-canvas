export interface Annotation {
  id?: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  timestamp: string;
  color?: string;
  author?: string;
} 