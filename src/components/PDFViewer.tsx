
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import AnnotationToolbar from './AnnotationToolbar';
import AnnotationLayer from './AnnotationLayer';
import { useIsMobile } from '@/hooks/use-mobile';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfFile: File | null;
}

export default function PDFViewer({ pdfFile }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Convert the File to a URL for react-pdf
  useEffect(() => {
    if (pdfFile) {
      const fileUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(fileUrl);

      // Clean up the URL when component unmounts
      return () => {
        URL.revokeObjectURL(fileUrl);
      };
    }
  }, [pdfFile]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    if (numPages) {
      const newPage = Math.max(1, Math.min(pageNumber + offset, numPages));
      setPageNumber(newPage);
    }
  }

  function changeScale(delta: number) {
    setScale(Math.max(0.5, Math.min(scale + delta, 2.5)));
  }

  return (
    <div className="pdf-viewer-container flex flex-col h-full">
      {pdfUrl ? (
        <>
          <AnnotationToolbar 
            activeTool={activeAnnotationTool}
            setActiveTool={setActiveAnnotationTool}
            scale={scale}
            onZoomIn={() => changeScale(0.1)}
            onZoomOut={() => changeScale(-0.1)}
            currentPage={pageNumber}
            totalPages={numPages || 0}
            onPrevPage={() => changePage(-1)}
            onNextPage={() => changePage(1)}
          />
          
          <div 
            ref={containerRef}
            className="pdf-document-container flex-grow overflow-auto relative border rounded-md"
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="flex justify-center items-center h-full">Loading PDF...</div>}
              error={<div className="flex justify-center items-center h-full">Error loading PDF. Please check the file.</div>}
            >
              <div className="relative">
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale}
                  width={isMobile ? window.innerWidth - 32 : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                <AnnotationLayer 
                  containerRef={containerRef}
                  activeTool={activeAnnotationTool} 
                  scale={scale}
                />
              </div>
            </Document>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-md p-6">
          <p className="text-muted-foreground">Upload a PDF to view and annotate</p>
        </div>
      )}
    </div>
  );
}
