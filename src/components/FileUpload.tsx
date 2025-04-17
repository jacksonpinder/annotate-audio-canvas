import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, Music } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onPdfUpload: (file: File) => void;
  onAudioUpload: (file: File) => void;
  onBothFilesUploaded: () => void;
}

export default function FileUpload({ onPdfUpload, onAudioUpload, onBothFilesUploaded }: FileUploadProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [isAudioDragging, setIsAudioDragging] = useState(false);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
        return;
      }
      
      setPdfFile(file);
      onPdfUpload(file);
      
      // Don't automatically proceed when both files are uploaded
    }
  };
  
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
      
      if (!validAudioTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an MP3, WAV, or OGG audio file",
          variant: "destructive"
        });
        return;
      }
      
      setAudioFile(file);
      onAudioUpload(file);
      
      // Don't automatically proceed when both files are uploaded
    }
  };
  
  const handlePdfButtonClick = () => {
    if (pdfInputRef.current) {
      pdfInputRef.current.click();
    }
  };
  
  const handleAudioButtonClick = () => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePdfDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPdfDragging(true);
  };

  const handlePdfDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      setIsPdfDragging(false);
    }
  };

  const handleAudioDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioDragging(true);
  };

  const handleAudioDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      setIsAudioDragging(false);
    }
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPdfDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
        return;
      }
      
      setPdfFile(file);
      onPdfUpload(file);
    }
  };

  const handleAudioDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
      
      if (!validAudioTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an MP3, WAV, or OGG audio file",
          variant: "destructive"
        });
        return;
      }
      
      setAudioFile(file);
      onAudioUpload(file);
    }
  };
  
  const handleContinue = () => {
    if (pdfFile && audioFile) {
      onBothFilesUploaded();
    } else {
      toast({
        title: "Missing files",
        description: "Please upload both PDF and audio files before continuing",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Upload */}
        <div 
          className={`relative border-2 ${
            isPdfDragging 
              ? 'border-primary bg-primary/5' 
              : pdfFile 
                ? 'border-primary/50' 
                : 'border-dashed border-muted-foreground/30'
          } rounded-lg p-6 hover:bg-muted/50 transition-all duration-200 cursor-pointer`}
          onClick={handlePdfButtonClick}
          onDrop={handlePdfDrop}
          onDragOver={handleDragOver}
          onDragEnter={handlePdfDragEnter}
          onDragLeave={handlePdfDragLeave}
        >
          {isPdfDragging && (
            <div className="absolute inset-0 bg-primary/5 rounded-lg" />
          )}
          <input 
            type="file" 
            ref={pdfInputRef} 
            onChange={handlePdfChange} 
            accept=".pdf" 
            className="hidden" 
            data-testid="pdf-upload"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3 relative">
            <div className={`p-3 rounded-full ${isPdfDragging ? 'bg-primary/20' : 'bg-primary/10'}`}>
              <File className={`h-8 w-8 ${isPdfDragging ? 'text-primary scale-110' : 'text-primary'}`} />
            </div>
            
            <div className="text-center">
              <h3 className="font-medium">Upload PDF Document</h3>
              <p className="text-sm text-muted-foreground">
                {isPdfDragging ? 'Drop your PDF here' : 'Drag and drop or click to browse'}
              </p>
            </div>
            
            {pdfFile && (
              <div className="bg-primary/10 text-primary font-medium rounded-full px-3 py-1 text-sm">
                {pdfFile.name}
              </div>
            )}
          </div>
        </div>
        
        {/* Audio Upload */}
        <div 
          className={`relative border-2 ${
            isAudioDragging 
              ? 'border-primary bg-primary/5' 
              : audioFile 
                ? 'border-primary/50' 
                : 'border-dashed border-muted-foreground/30'
          } rounded-lg p-6 hover:bg-muted/50 transition-all duration-200 cursor-pointer`}
          onClick={handleAudioButtonClick}
          onDrop={handleAudioDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleAudioDragEnter}
          onDragLeave={handleAudioDragLeave}
        >
          {isAudioDragging && (
            <div className="absolute inset-0 bg-primary/5 rounded-lg" />
          )}
          <input 
            type="file" 
            ref={audioInputRef} 
            onChange={handleAudioChange} 
            accept=".mp3,.wav,.ogg" 
            className="hidden" 
            data-testid="audio-upload"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3 relative">
            <div className={`p-3 rounded-full ${isAudioDragging ? 'bg-primary/20' : 'bg-primary/10'}`}>
              <Music className={`h-8 w-8 ${isAudioDragging ? 'text-primary scale-110' : 'text-primary'}`} />
            </div>
            
            <div className="text-center">
              <h3 className="font-medium">Upload Audio File</h3>
              <p className="text-sm text-muted-foreground">
                {isAudioDragging ? 'Drop your audio file here' : 'MP3, WAV, or OGG format'}
              </p>
            </div>
            
            {audioFile && (
              <div className="bg-primary/10 text-primary font-medium rounded-full px-3 py-1 text-sm">
                {audioFile.name}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        className="w-full" 
        onClick={handleContinue} 
        disabled={!pdfFile || !audioFile}
      >
        <Upload className="mr-2 h-4 w-4" />
        Continue
      </Button>
    </div>
  );
}
