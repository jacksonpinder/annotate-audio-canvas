
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import PianoKeyboard from './PianoKeyboard';
import { getAudioRef } from './audio/AudioPlayerCore';

// Import our component modules
import AudioTransportControls from './audio/AudioTransportControls';
import BalanceControl from './audio/BalanceControl';
import PlaybackSpeedControl from './audio/PlaybackSpeedControl';
import VolumeControl from './audio/VolumeControl';
import AudioUtilityControls from './audio/AudioUtilityControls';
import TransposeControl from './audio/TransposeControl';
import { useAudioPlayer } from './audio/useAudioPlayer';
import AudioPlayerCore from './audio/AudioPlayerCore';

interface AudioPlayerProps {
  audioFile: File | null;
}

export default function AudioPlayer({ audioFile }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use our custom hook to manage audio player state and functionality
  const {
    audioUrl,
    isPlaying,
    duration,
    currentTime,
    volume,
    isMuted,
    isLooping,
    showPiano,
    wasShowingPiano,
    formatTime,
    togglePlayPause,
    skip,
    handleTimeChange,
    handleVolumeChange,
    toggleMute,
    toggleLoop,
    togglePiano,
    handleLoadedMetadata,
    handleEnded,
    balanceControls,
    speedControls,
    transposeControls
  } = useAudioPlayer(audioFile);
  
  // Get the actual audio element ref after the component mounts
  useEffect(() => {
    if (containerRef.current) {
      const audioElement = getAudioRef(containerRef.current);
      if (audioElement) {
        // Now we have access to the actual audio element
        // This is needed for the hooks that use the audio ref
      }
    }
  }, [containerRef.current]);

  return (
    <div className={`audio-player-container ${showPiano ? 'piano-open' : ''}`}>
      <div className="audio-player p-3 rounded-md shadow-md" ref={containerRef}>
        {audioUrl ? (
          <>
            <AudioPlayerCore
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              isLooping={isLooping}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onPause={() => isPlaying && togglePlayPause()}
              onPlay={() => !isPlaying && togglePlayPause()}
            />
            
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Audio Transport Controls */}
              <AudioTransportControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                togglePlayPause={togglePlayPause}
                skip={skip}
                handleTimeChange={handleTimeChange}
                formatTime={formatTime}
              />
              
              {/* Volume Control */}
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                toggleMute={toggleMute}
                handleVolumeChange={handleVolumeChange}
              />
              
              {/* Balance Control */}
              <BalanceControl
                balance={balanceControls.balance}
                handleBalanceChange={balanceControls.handleBalanceChange}
                resetBalance={balanceControls.resetBalance}
              />
              
              {/* Transpose Control (Pitch) */}
              <TransposeControl
                transpose={transposeControls.transpose}
                tempTranspose={transposeControls.tempTranspose}
                isTransposeVisible={transposeControls.isTransposeVisible}
                showTranspose={transposeControls.showTranspose}
                scheduleHideTranspose={transposeControls.scheduleHideTranspose}
                handleTempTransposeChange={transposeControls.handleTempTransposeChange}
                applyTranspose={transposeControls.applyTranspose}
                resetTranspose={transposeControls.resetTranspose}
              />
              
              {/* Playback Speed Control */}
              <PlaybackSpeedControl
                speed={speedControls.speed}
                tempSpeed={speedControls.tempSpeed}
                isSpeedControlVisible={speedControls.isSpeedControlVisible}
                showSpeedControl={speedControls.showSpeedControl}
                scheduleHideSpeedControl={speedControls.scheduleHideSpeedControl}
                handleTempSpeedChange={speedControls.handleTempSpeedChange}
                applySpeed={speedControls.applySpeed}
                resetSpeed={speedControls.resetSpeed}
                speedToSliderValue={speedControls.speedToSliderValue}
              />
              
              {/* Utility Controls (Loop and Piano) */}
              <AudioUtilityControls
                isLooping={isLooping}
                showPiano={showPiano}
                toggleLoop={toggleLoop}
                togglePiano={togglePiano}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p>Upload an audio file to start playback</p>
          </div>
        )}
      </div>

      {/* Piano Keyboard */}
      <div 
        className={`piano-container ${showPiano ? 'active' : ''} ${wasShowingPiano ? 'was-active' : ''}`}
        onTransitionEnd={() => {
          if (!showPiano) {
            setWasShowingPiano(false);
          }
        }}
      >
        <PianoKeyboard />
      </div>
    </div>
  );
}
