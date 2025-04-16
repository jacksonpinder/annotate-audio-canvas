
// Validate PDF file
export const validatePdfFile = (file: File): boolean => {
  return file && file.type === 'application/pdf';
};

// Validate audio file
export const validateAudioFile = (file: File): boolean => {
  return file && file.type.startsWith('audio/');
};

// Create object URL for file
export const createFileUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

// Revoke object URL to prevent memory leaks
export const revokeFileUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

// Format bytes to human-readable size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate a file thumbnail (if browser support exists)
export const generateThumbnail = async (file: File): Promise<string | null> => {
  if (file.type === 'application/pdf') {
    // For PDFs, we would need a PDF library that can generate thumbnails
    // This is a placeholder that returns null for PDFs
    return null;
  } else if (file.type.startsWith('audio/')) {
    // For audio files, we could use a generic audio icon
    return '/audio-icon.svg';
  }
  
  return null;
};
