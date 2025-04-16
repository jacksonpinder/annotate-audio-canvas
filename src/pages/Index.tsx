
import { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import PDFViewer from '@/components/PDFViewer';
import AudioPlayer from '@/components/AudioPlayer';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    setIsFileUploaded(true);
  };

  const handleAudioUpload = (file: File) => {
    setAudioFile(file);
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
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Audio PDF Annotator</h1>
            <p className="text-sm md:text-base text-primary-foreground/80">Annotate PDFs while listening to audio</p>
          </div>
          {isFileUploaded && (
            <button 
              onClick={handleReset}
              className="text-primary-foreground/90 hover:text-primary-foreground text-sm px-3 py-1 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              Upload New Files
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 flex flex-col">
        {!isFileUploaded ? (
          <div className="flex-grow flex flex-col justify-center items-center">
            <div className="max-w-xl w-full">
              <h2 className="text-2xl font-semibold mb-6 text-center">Get Started</h2>
              <FileUpload 
                onPdfUpload={handlePdfUpload}
                onAudioUpload={handleAudioUpload}
              />
              
              <div className="mt-8 text-sm text-muted-foreground">
                <h3 className="font-medium text-base mb-2">How to use:</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Upload a PDF document and audio file</li>
                  <li>Use the annotation tools to mark up your PDF</li>
                  <li>Play the audio and annotate in sync</li>
                  <li>Use the piano keyboard to add musical notes</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-rows-[1fr,auto] h-full gap-4">
            <div className="pdf-container flex-grow overflow-hidden">
              <PDFViewer pdfFile={pdfFile} />
            </div>
            
            <div className="audio-container sticky bottom-0 left-0 right-0 z-10">
              <AudioPlayer audioFile={audioFile} />
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-muted py-3 text-center text-sm text-muted-foreground">
        <p>Audio PDF Annotator &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
