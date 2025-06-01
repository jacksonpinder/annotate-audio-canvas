import { useRef, useState, useEffect, useCallback } from 'react';
import { makePlayer } from '../utils/makePlayer';
import AudioService from '../audio/AudioService';

export default function AudioLab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [pitch, setPitch] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [balance, setBalance] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isAudioServiceInitialized, setIsAudioServiceInitialized] = useState<boolean>(false);

  // Initialize AudioService on component mount
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const contextStarted = await AudioService.startAudioContext();
        if (contextStarted) {
          const workletLoaded = await AudioService.loadSoundTouchModule();
          const nodeCreated = AudioService.createSoundTouchAudioNode(0);
          if (nodeCreated) {
            console.log('AudioLab: AudioService successfully initialized');
            setIsAudioServiceInitialized(true);
          }
        }
      } catch (error) {
        console.error('AudioLab: Failed to initialize AudioService', error);
      }
    };

    initializeAudio();
  }, []);

  // Sync state with AudioService when it's initialized
  useEffect(() => {
    if (isAudioServiceInitialized) {
      // Set initial state values from AudioService
      setPitch(AudioService.getCurrentPitchSemitones());
      setSpeed(AudioService.getCurrentSpeed());
      setBalance(AudioService.getCurrentPan());
      setVolume(AudioService.getCurrentVolume());
    }
  }, [isAudioServiceInitialized]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !containerRef.current) return;
    
    // Initialize player for visualization with WaveSurfer
    const p = await makePlayer(file, containerRef.current);
    setPlayer(p);
    
    // Also load the file into AudioService
    if (isAudioServiceInitialized) {
      const loaded = await AudioService.loadAudioFile(file);
      if (loaded) {
        console.log('AudioLab: File loaded into AudioService');
      }
    }
  }

  const handlePitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = Number(e.target.value);
    setPitch(newPitch);
    
    // Update pitch in both systems
    if (player) {
      player.setPitch(newPitch);
    }
    
    if (isAudioServiceInitialized) {
      AudioService.setPitch(newPitch);
    }
  }, [player, isAudioServiceInitialized]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = Number(e.target.value);
    setSpeed(newSpeed);
    
    // Update speed in both systems
    if (player) {
      player.setTempo(newSpeed);
    }
    
    if (isAudioServiceInitialized) {
      AudioService.setSpeed(newSpeed);
    }
  }, [player, isAudioServiceInitialized]);

  const handleBalanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newBalance = Number(e.target.value);
    setBalance(newBalance);
    
    // Update balance in both systems
    if (player) {
      player.setBalance(newBalance);
    }
    
    if (isAudioServiceInitialized) {
      AudioService.setPan(newBalance);
    }
  }, [player, isAudioServiceInitialized]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    
    // Update volume in both systems
    if (player) {
      player.setVolume(newVolume);
    }
    
    if (isAudioServiceInitialized) {
      AudioService.setVolume(newVolume);
    }
  }, [player, isAudioServiceInitialized]);

  const handlePlay = useCallback(() => {
    if (player) {
      player.play();
    }
    
    if (isAudioServiceInitialized && AudioService.isPlayerReady()) {
      AudioService.play();
    }
  }, [player, isAudioServiceInitialized]);

  const handleStop = useCallback(() => {
    if (player) {
      player.stop();
    }
    
    if (isAudioServiceInitialized) {
      AudioService.stop();
    }
  }, [player, isAudioServiceInitialized]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Audio Lab</h2>
      <p className="text-sm">
        {isAudioServiceInitialized 
          ? "AudioService ready - enhanced pitch-shifting available" 
          : "Initializing AudioService..."}
      </p>
      
      <input 
        type="file" 
        accept="audio/*" 
        onChange={handleFile}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />

      <div ref={containerRef} className="h-24" />

      {player && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <button 
              onClick={handlePlay}
              className="py-2 px-4 rounded bg-green-500 hover:bg-green-700 text-white font-bold"
            >
              Play
            </button>
            <button 
              onClick={handleStop}
              className="py-2 px-4 rounded bg-red-500 hover:bg-red-700 text-white font-bold"
            >
              Stop
            </button>
            <button 
              onClick={() => player.skip(-15)} 
              className="py-2 px-4 rounded bg-blue-500 hover:bg-blue-700 text-white font-bold"
            >
              « 15s
            </button>
            <button 
              onClick={() => player.skip(15)}
              className="py-2 px-4 rounded bg-blue-500 hover:bg-blue-700 text-white font-bold"
            >
              15s »
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-8 text-right">{pitch < 0 ? pitch : `+${pitch}`}</span>
              <label className="flex-1">
                <span className="block text-sm font-medium mb-1">Pitch (semitones)</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitch}
                  onChange={handlePitchChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="w-8 text-right">{speed.toFixed(2)}x</span>
              <label className="flex-1">
                <span className="block text-sm font-medium mb-1">Speed</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={speed}
                  onChange={handleSpeedChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="w-8 text-right">{balance.toFixed(2)}</span>
              <label className="flex-1">
                <span className="block text-sm font-medium mb-1">Balance</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={balance}
                  onChange={handleBalanceChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="w-8 text-right">{(volume * 100).toFixed(0)}%</span>
              <label className="flex-1">
                <span className="block text-sm font-medium mb-1">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </label>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                onChange={e => player.loop(e.target.checked)}
                className="rounded bg-blue-500"
              />
              <span className="text-sm font-medium">Loop</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
} 