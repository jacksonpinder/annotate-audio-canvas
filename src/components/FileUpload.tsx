
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onPdfUpload: (file: File) => void;
  onAudioUpload: (file: File) => void;
  onBothFilesUploaded: () => void;
}

export default function FileUpload({ onPdfUpload, onAudioUpload, onBothFilesUploaded }: FileUploadProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        onPdfUpload(file);
        
        // Check if both files are now uploaded
        if (audioFile) {
          toast({
            title: "Files uploaded",
            description: "Both PDF and audio files are ready to use",
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
      }
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        onAudioUpload(file);
        
        // Check if both files are now uploaded
        if (pdfFile) {
          toast({
            title: "Files uploaded",
            description: "Both PDF and audio files are ready to use",
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file",
          variant: "destructive"
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const pdfFile = Array.from(e.dataTransfer.files).find(file => 
        file.type === 'application/pdf'
      );
      
      const audioFile = Array.from(e.dataTransfer.files).find(file => 
        file.type.startsWith('audio/')
      );

      if (pdfFile) {
        setPdfFile(pdfFile);
        onPdfUpload(pdfFile);
      }
      
      if (audioFile) {
        setAudioFile(audioFile);
        onAudioUpload(audioFile);
      }
      
      // Check if both files are now uploaded
      if (pdfFile && audioFile) {
        toast({
          title: "Files uploaded",
          description: "Both PDF and audio files are ready to use",
        });
      }
    }
  };

  const handleContinue = () => {
    if (pdfFile && audioFile) {
      onBothFilesUploaded();
    } else {
      toast({
        title: "Missing files",
        description: "Please upload both a PDF and an audio file before continuing",
        variant: "destructive"
      });
    }
  };

  return (
    <Card 
      className={`p-6 border-2 border-dashed ${isDragging ? 'border-primary bg-muted' : 'border-muted-foreground'} rounded-lg transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Upload Files</h2>
        <p className="text-muted-foreground">Drag and drop your files or click to browse</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">PDF Document</p>
            <Input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="cursor-pointer"
            />
            {pdfFile && (
              <p className="text-xs text-muted-foreground truncate">
                ✓ {pdfFile.name}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Audio File</p>
            <Input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="cursor-pointer"
            />
            {audioFile && (
              <p className="text-xs text-muted-foreground truncate">
                ✓ {audioFile.name}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <Button 
            onClick={handleContinue}
            disabled={!pdfFile || !audioFile}
            className="w-full md:w-auto"
          >
            Continue to Annotation
          </Button>
        </div>
      </div>
    </Card>
  );
}
