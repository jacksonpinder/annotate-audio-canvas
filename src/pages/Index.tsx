
import { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import PDFViewer from '@/components/PDFViewer';
import AudioPlayer from '@/components/AudioPlayer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function Index() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading resources and initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handlePdfUpload = (file: File) => {
    setPdfFile(file);
  };

  const handleAudioUpload = (file: File) => {
    setAudioFile(file);
  };

  const handleBothFilesUploaded = () => {
    setIsFileUploaded(true);
  };

  const handleReset = () => {
    setPdfFile(null);
    setAudioFile(null);
    setIsFileUploaded(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-muted-foreground">Loading Audio PDF Annotator...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isFileUploaded ? (
        <main className="flex-grow container mx-auto p-4 flex flex-col">
          <div className="flex-grow flex flex-col justify-center items-center">
            <div className="max-w-xl w-full">
              <h2 className="text-2xl font-semibold mb-6 text-center">Get Started</h2>
              <FileUpload 
                onPdfUpload={handlePdfUpload}
                onAudioUpload={handleAudioUpload}
                onBothFilesUploaded={handleBothFilesUploaded}
              />
              
              <div className="mt-8 text-sm text-muted-foreground">
                <h3 className="font-medium text-base mb-2">How to use:</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Upload a PDF document and audio file</li>
                  <li>Click the Continue button when both files are ready</li>
                  <li>Use the annotation tools to mark up your PDF</li>
                  <li>Play the audio and annotate in sync</li>
                  <li>Use the piano keyboard to add musical notes</li>
                </ol>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-grow container mx-auto p-4 flex flex-col">
          <div className="grid grid-rows-[1fr,auto] h-full gap-4">
            <div className="pdf-container flex-grow overflow-hidden relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="absolute top-4 left-4 z-10 bg-black/20 hover:bg-black/30 backdrop-blur-sm md:h-8 md:w-8 h-10 w-10"
              >
                <Home className="md:h-4 md:w-4 h-5 w-5 text-white" />
              </Button>
              <PDFViewer pdfFile={pdfFile} />
            </div>
            
            <div className="audio-container sticky bottom-0 left-0 right-0 z-10">
              <AudioPlayer audioFile={audioFile} onHomeClick={handleReset} />
            </div>
          </div>
        </main>
      )}
      
      <footer className="bg-muted py-3 text-center text-sm text-muted-foreground">
        <p>Audio PDF Annotator &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
