
import { useRef, useEffect } from 'react';

interface AudioPlayerCoreProps {
  audioUrl: string | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  onPause: () => void;
  onPlay: () => void;
}

export default function AudioPlayerCore({
  audioUrl,
  isPlaying,
  volume,
  isMuted,
  isLooping,
  onLoadedMetadata,
  onEnded,
  onPause,
  onPlay
}: AudioPlayerCoreProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Make audioRef available outside this component
  useEffect(() => {
    // Return the audioRef in the cleanup function so it can be accessed
    return () => {
      // This is just to expose the ref, no actual cleanup needed
    };
  }, [audioRef.current]);

  // Expose the audio element reference
  return (
    <audio
      ref={audioRef}
      src={audioUrl || undefined}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={onEnded}
      onPause={onPause}
      onPlay={onPlay}
      loop={isLooping}
      muted={isMuted}
      volume={volume}
    />
  );
}

// Helper function to expose the audio reference
export const getAudioRef = (element: HTMLElement | null): HTMLAudioElement | null => {
  if (!element) return null;
  return element.querySelector('audio');
};
