import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useIsMobile } from '@/hooks/use-mobile';
import LoadingSpinner from './LoadingSpinner';
import ZoomControl from './ZoomControl';

// Set worker source from CDN - avoids worker loading issues with Vite
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface SimplePDFViewerProps {
  pdfFile: File | null;
}

export default function SimplePDFViewer({ pdfFile }: SimplePDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pageDimensions, setPageDimensions] = useState<Array<{width: number, height: number}>>([]);
  const isMobile = useIsMobile();
  const [isZooming, setIsZooming] = useState(false);
  const initialFitApplied = useRef<boolean>(false);
  const firstPageLoaded = useRef<boolean>(false);
  
  // Touch gesture state
  const touchStartDistance = useRef<number | null>(null);
  const lastScale = useRef<number>(1.0);
  const zoomTimeoutRef = useRef<number | null>(null);

  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  // Convert the File to a URL for react-pdf
  useEffect(() => {
    if (pdfFile) {
      const fileUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(fileUrl);
      initialFitApplied.current = false;
      firstPageLoaded.current = false;

      return () => {
        URL.revokeObjectURL(fileUrl);
      };
    }
  }, [pdfFile]);

  // Apply fit width with a delay after first page loads
  useEffect(() => {
    if (firstPageLoaded.current && !initialFitApplied.current && containerRef.current) {
      // Delay to ensure accurate measurements
      const timer = setTimeout(() => {
        console.log("Applying initial fit width");
        handleFitWidth(true);
        initialFitApplied.current = true;
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pageDimensions, containerRef.current]);

  // Track window resizing for fit width calculations
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && numPages && numPages > 0 && initialFitApplied.current) {
        handleFitWidth();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numPages, containerRef.current]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    // Initialize pageRefs array with the correct length
    pageRefs.current = Array(numPages).fill(null);
    setPageDimensions(Array(numPages).fill({ width: 0, height: 0 }));
    initialFitApplied.current = false;
  }

  const handleZoomIn = () => {
    setIsZooming(true);
    setCurrentScale(prevScale => Math.min(prevScale + 0.2, 3.0));
    
    // After zooming completes, let the animation finish
    setTimeout(() => setIsZooming(false), 300);
  };

  const handleZoomOut = () => {
    setIsZooming(true);
    setCurrentScale(prevScale => Math.max(prevScale - 0.2, 0.5));
    
    // After zooming completes, let the animation finish
    setTimeout(() => setIsZooming(false), 300);
  };

  const handleFitWidth = (isInitial = false) => {
    if (!containerRef.current || pageDimensions.length === 0) {
      console.log("Cannot fit width: container or dimensions not available");
      return;
    }
    
    if (!isInitial) {
      setIsZooming(true);
    }
    
    // Calculate container width (accounting for padding)
    const containerWidth = containerRef.current.clientWidth - 16; // Reduced padding
    
    // Find the first page with dimensions
    const firstPageWithDimensions = pageDimensions.find(dim => dim.width > 0);
    if (!firstPageWithDimensions) {
      console.log("Cannot fit width: no page dimensions available");
      
      // Use a reasonable default scale if no dimensions are available
      setCurrentScale(1.0);
      if (!isInitial) {
        setTimeout(() => setIsZooming(false), 300);
      }
      return;
    }
    
    // Use the original page width (divide by current scale to get original)
    const originalPageWidth = firstPageWithDimensions.width / currentScale;
    
    // Calculate scale needed to fit page to container width
    const newScale = containerWidth / originalPageWidth;
    
    console.log(`Fitting to width: container=${containerWidth}, page=${originalPageWidth}, scale=${newScale}`);
    
    setCurrentScale(newScale);
    if (!isInitial) {
      setTimeout(() => setIsZooming(false), 300);
    }
  };

  // Function to store the dimensions of each page
  const onPageLoadSuccess = (page: any, index: number) => {
    const { width, height } = page;
    
    setPageDimensions(prev => {
      const newDimensions = [...prev];
      newDimensions[index] = { width, height };
      return newDimensions;
    });

    // Mark the first page as loaded
    if (index === 0) {
      firstPageLoaded.current = true;
    }
  };

  // Function to handle touch start event for pinch zoom
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Calculate the initial distance between the two touch points
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastScale.current = currentScale;
      
      // Prevent default to avoid unwanted scrolling/zooming of the entire page
      e.preventDefault();
    }
  };

  // Function to handle touch move event for pinch zoom
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistance.current !== null) {
      // Calculate current distance between the two touch points
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate the scale factor
      const scaleFactor = currentDistance / touchStartDistance.current;
      
      // Apply the scale factor to the last known scale
      const newScale = Math.max(0.5, Math.min(3.0, lastScale.current * scaleFactor));
      
      // Update the scale if it's different
      if (Math.abs(newScale - currentScale) > 0.01) {
        setIsZooming(true);
        setCurrentScale(newScale);
        
        // Reset zooming state after a short delay
        if (zoomTimeoutRef.current) {
          window.clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = window.setTimeout(() => {
          setIsZooming(false);
          zoomTimeoutRef.current = null;
        }, 300);
      }
      
      // Prevent default to avoid unwanted scrolling/zooming of the entire page
      e.preventDefault();
    }
  };

  // Function to handle touch end event for pinch zoom
  const handleTouchEnd = () => {
    touchStartDistance.current = null;
  };

  // Define page renderer with optimal settings for a smooth experience
  const renderPage = (pageNumber: number) => (
    <div 
      key={`page_${pageNumber}`} 
      className="pdf-page mb-4 relative"
      ref={el => pageRefs.current[pageNumber - 1] = el}
    >
      <Page
        key={`page_${pageNumber}`}
        pageNumber={pageNumber}
        scale={currentScale}
        width={isMobile ? window.innerWidth - 32 : undefined}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner size="small" />
          </div>
        }
        className={`transition-transform duration-300 ${isZooming ? 'scale-transition' : ''}`}
        onLoadSuccess={page => onPageLoadSuccess(page, pageNumber - 1)}
      />
    </div>
  );

  return (
    <div className="simple-pdf-viewer-container flex flex-col h-full">
      {pdfUrl ? (
        <>
          <div 
            ref={containerRef}
            className={`pdf-document-container flex-grow overflow-auto relative ${isZooming ? 'zooming' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <ZoomControl 
              onZoomIn={handleZoomIn} 
              onZoomOut={handleZoomOut} 
              onFitWidth={handleFitWidth}
            />
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex justify-center items-center h-full">
                  <LoadingSpinner size="large" />
                  <p className="ml-3">Loading PDF...</p>
                </div>
              }
              error={<div className="flex justify-center items-center h-full">Error loading PDF. Please check the file.</div>}
              className="flex flex-col items-center px-0"
            >
              {numPages && 
                Array.from(new Array(numPages), (_, index) => renderPage(index + 1))
              }
            </Document>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-md p-6">
          <p className="text-muted-foreground">Upload a PDF to view</p>
        </div>
      )}
    </div>
  );
} 