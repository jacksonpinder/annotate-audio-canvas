import React, { useRef, useEffect } from 'react';

interface ScrewFrameProps {
  audioFile: File | null;
  transpose: number;
  onLoad?: () => void;
}

const ScrewFrame: React.FC<ScrewFrameProps> = ({ audioFile, transpose, onLoad }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileObjectUrl = useRef<string | null>(null);

  // When the transpose value changes, update the iframe
  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    try {
      // Try to access the app instance and set the transpose
      if (iframeWindow.document.readyState === 'complete') {
        const audioPlayer = (iframeWindow as any).audioPlayer;
        if (audioPlayer) {
          audioPlayer.pitchSemitones = transpose;
          console.log("Set pitch to", transpose, "semitones in Screw engine");
        }
      }
    } catch (e) {
      console.error("Error accessing iframe content:", e);
    }
  }, [transpose]);

  // When the audio file changes, load it into the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !audioFile) return;

    // Revoke previous URL if it exists
    if (fileObjectUrl.current) {
      URL.revokeObjectURL(fileObjectUrl.current);
    }

    // Create a new object URL for the file
    fileObjectUrl.current = URL.createObjectURL(audioFile);

    // Wait for iframe to load
    const handleLoad = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return;

        // Find the file input in the iframe
        const fileInput = iframeWindow.document.querySelector('#sas-file') as HTMLInputElement;
        if (fileInput) {
          // Create a new DataTransfer to programmatically set the file
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(audioFile);
          fileInput.files = dataTransfer.files;
          
          // Trigger the change event to load the file
          const event = new Event('change', { bubbles: true });
          fileInput.dispatchEvent(event);
          
          if (onLoad) onLoad();
        }
      } catch (e) {
        console.error("Error setting file in iframe:", e);
      }
    };

    iframe.addEventListener('load', handleLoad);
    
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [audioFile, onLoad]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (fileObjectUrl.current) {
        URL.revokeObjectURL(fileObjectUrl.current);
      }
    };
  }, []);

  return (
    <iframe 
      ref={iframeRef}
      src="/screw-app/build/index.html"
      style={{ 
        position: 'absolute', 
        width: '1px', 
        height: '1px', 
        opacity: 0,
        pointerEvents: 'none'
      }}
      title="Screw Engine"
    />
  );
};

export default ScrewFrame; 