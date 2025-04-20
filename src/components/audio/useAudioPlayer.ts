
import { useState, useRef, useEffect } from 'react';
import { useAudioBalance } from '@/hooks/useAudioBalance';
import { usePlaybackSpeed } from '@/hooks/usePlaybackSpeed';
import { useTranspose } from '@/hooks/useTranspose';

export function useAudioPlayer(audioFile: File | null) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [wasShowingPiano, setWasShowingPiano] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Set up audio URL from file
  useEffect(() => {
    if (audioFile) {
      const fileUrl = URL.createObjectURL(audioFile);
      setAudioUrl(fileUrl);

      // Reset player state when a new file is loaded
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      // Clean up the URL when component unmounts
      return () => {
        URL.revokeObjectURL(fileUrl);
      };
    }
  }, [audioFile]);

  // Initialize hooks that need audio reference
  const balanceControls = useAudioBalance(audioRef, { snapThreshold: 0.08 });
  const speedControls = usePlaybackSpeed(audioRef);
  const transposeControls = useTranspose(audioRef);

  // Format time helper
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      audioRef.current.play();
      animationRef.current = requestAnimationFrame(updateProgressBar);
    }
    
    setIsPlaying(!isPlaying);
  };

  // Update progress bar during playback
  const updateProgressBar = () => {
    if (!audioRef.current) return;
    
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration);
    
    animationRef.current = requestAnimationFrame(updateProgressBar);
  };

  // Skip forward or backward
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = Math.min(
      Math.max(audioRef.current.currentTime + seconds, 0),
      audioRef.current.duration
    );
    
    setCurrentTime(audioRef.current.currentTime);
  };

  // Handle seeking through the track
  const handleTimeChange = (newValue: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = newValue[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    if (!isPlaying) {
      setCurrentTime(newTime);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (newValue: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = newValue[0];
    audioRef.current.volume = isMuted ? 0 : newVolume;
    setVolume(newVolume);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  // Toggle piano visibility
  const togglePiano = () => {
    if (showPiano) {
      setWasShowingPiano(true);
      setTimeout(() => {
        setShowPiano(false);
      }, 0);
    } else {
      setWasShowingPiano(false);
      setShowPiano(true);
    }
  };

  // Handle audio loaded metadata
  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    
    setDuration(audioRef.current.duration);
  };

  // Handle end of audio playback
  const handleEnded = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (!isLooping) {
      setCurrentTime(0);
    }
  };

  // Set audio reference when it's available
  const setAudioElement = (element: HTMLAudioElement | null) => {
    audioRef.current = element;
  };

  return {
    // Audio state
    audioUrl,
    isPlaying,
    duration,
    currentTime,
    volume,
    isMuted,
    isLooping,
    showPiano,
    wasShowingPiano,
    audioRef,
    
    // Piano state
    togglePiano,
    
    // Audio methods
    formatTime,
    togglePlayPause,
    skip,
    handleTimeChange,
    handleVolumeChange,
    toggleMute,
    toggleLoop,
    handleLoadedMetadata,
    handleEnded,
    setAudioElement,
    
    // Hooks
    balanceControls,
    speedControls,
    transposeControls
  };
}
