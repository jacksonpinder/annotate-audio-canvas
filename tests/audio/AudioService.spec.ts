import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import audioServiceInstance from '../../src/audio/AudioService'; // Import the instance
import { SoundTouchNode } from '../../src/audio/SoundTouchNode';
import { getPeaks } from '../../src/plugins/getPeaks';

// Mock SoundTouchNode
// We need to mock the entire module
vi.mock('../../src/audio/SoundTouchNode', () => {
  const mockSoundTouchNodeInstance = {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setPitchSemitones: vi.fn(),
    setTempo: vi.fn(),
    flush: vi.fn(),
    dispose: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    isLoaded: true, // Default to true for easier testing, can be overridden
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    port: {
      postMessage: vi.fn(),
      close: vi.fn(),
      onmessage: null,
      onmessageerror: null,
      start: vi.fn(),
    }
  };

  return {
    SoundTouchNode: {
      create: vi.fn().mockResolvedValue(mockSoundTouchNodeInstance), // Static method
    },
    // Export a mock instance that can be manipulated in tests if needed for type checks
    // Or more simply, ensure create returns the configurable mock instance.
    mockSoundTouchNodeInstance // Expose for direct manipulation if needed
  };
});

// Mock getPeaks
vi.mock('../../src/plugins/getPeaks');

// Mock AudioContext and its nodes
const mockDecodeAudioData = vi.fn();
const mockCreateStereoPanner = vi.fn();
const mockCreateGain = vi.fn();
const mockResume = vi.fn();
const mockClose = vi.fn();

const mockPannerNode = {
  pan: { value: 0 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  context: null as any // Will be set to mockAudioContext
};
const mockGainNode = {
  gain: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  context: null as any // Will be set to mockAudioContext
};
const mockAudioDestinationNode = { type: 'destination' };

const mockAudioContext = {
  decodeAudioData: mockDecodeAudioData,
  createStereoPanner: mockCreateStereoPanner.mockReturnValue(mockPannerNode),
  createGain: mockCreateGain.mockReturnValue(mockGainNode),
  resume: mockResume.mockResolvedValue(undefined),
  close: mockClose.mockResolvedValue(undefined),
  get state() { return this._state; }, // Use a getter to allow state changes
  set state(newState) { this._state = newState; },
  _state: 'suspended' as AudioContextState, // Initial state
  currentTime: 0,
  sampleRate: 44100,
  destination: mockAudioDestinationNode,
  onstatechange: null as (() => void) | null,
};

// Helper to reset mock AudioContext state
function resetMockAudioContextState(initialState: AudioContextState = 'suspended') {
    mockAudioContext._state = initialState;
    mockAudioContext.onstatechange = null;
    // Re-assign context to nodes in case they were created with a stale mock
    mockPannerNode.context = mockAudioContext as any;
    mockGainNode.context = mockAudioContext as any;
}


// Mock global AudioContext
global.AudioContext = vi.fn(() => {
    resetMockAudioContextState(); // Ensure fresh state on new context creation
    return mockAudioContext as any;
}) as any;
(global as any).webkitAudioContext = global.AudioContext;


describe('AudioService', () => {
  let AudioService: typeof audioServiceInstance; // To get a fresh instance for each test suite if needed
                                                // Or use the singleton and reset its state.
                                                // For these tests, we'll use the singleton and manage its state.

  beforeEach(async () => {
    // Reset the singleton's internal state before each test
    // This is crucial because we're testing a singleton instance.
    // A more robust approach for isolated tests would be to export the class
    // and instantiate it in each test, but the current codebase exports an instance.
    await audioServiceInstance.dispose(); // Clean up from previous test
    
    vi.clearAllMocks();

    // Reset global AudioContext mock and its nodes
    resetMockAudioContextState();
    mockPannerNode.pan.value = 0;
    mockGainNode.gain.value = 1;
    
    // Mock implementations
    (getPeaks as vi.Mock).mockReturnValue([[0, 0.5, -0.5, 0], [0, 0.5, -0.5, 0]]); // Default mock peaks
    mockDecodeAudioData.mockImplementation((arrayBuffer, successCallback, errorCallback) => {
        const mockAudioBuffer = {
            duration: 10, // 10 seconds
            sampleRate: 44100,
            numberOfChannels: 2,
            length: 44100 * 10,
            getChannelData: vi.fn(channel => new Float32Array(44100 * 10)),
        };
        if (successCallback) { // For older API style
            successCallback(mockAudioBuffer);
        }
        return Promise.resolve(mockAudioBuffer); // For newer Promise-based API
    });
    mockResume.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);

    // Ensure SoundTouchNode.create returns the mock instance that can be spied on
    // We need to access the mock *instance* to check its methods.
    // The module mock structure was a bit off. Let's refine.
    const { mockSoundTouchNodeInstance: actualMockSTNInstance } = vi.mocked(SoundTouchNode, true) as any;
    vi.mocked(SoundTouchNode.create).mockResolvedValue(actualMockSTNInstance);
    
    // Set default states for the mock SoundTouchNode instance
    actualMockSTNInstance.isLoaded = true;
    actualMockSTNInstance.isPlaying = false;
    actualMockSTNInstance.currentTime = 0;
    actualMockSTNInstance.duration = 0;


    // Ensure the service gets a fresh context for tests that create it
    // (though dispose should handle this)
    // audioServiceInstance['audioContext'] = null; 
    // audioServiceInstance['isAudioContextStarted'] = false;
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore original implementations
  });

  // Test cases will go here
  describe('AudioContext Management', () => {
    it('should create AudioContext on first getAudioContext call', () => {
      const context = audioServiceInstance.getAudioContext();
      expect(context).toBe(mockAudioContext);
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('should return existing AudioContext on subsequent calls', () => {
      audioServiceInstance.getAudioContext(); // First call
      const context = audioServiceInstance.getAudioContext(); // Second call
      expect(context).toBe(mockAudioContext);
      expect(global.AudioContext).toHaveBeenCalledTimes(1); // Should still be 1
    });

    it('should set isAudioContextStarted to true when context is running', async () => {
      mockAudioContext.state = 'running';
      audioServiceInstance.getAudioContext(); // Initialize context
      expect(audioServiceInstance.isContextStarted()).toBe(true);
    });

    it('should attempt to resume a suspended AudioContext via startAudioContext', async () => {
      mockAudioContext.state = 'suspended';
      audioServiceInstance.getAudioContext(); // Initialize context
      await audioServiceInstance.startAudioContext();
      expect(mockResume).toHaveBeenCalled();
      expect(audioServiceInstance.isContextStarted()).toBe(true); // Assuming resume succeeds
    });

    it('should handle resume failure for startAudioContext', async () => {
      mockAudioContext.state = 'suspended';
      mockResume.mockRejectedValueOnce(new Error('Resume failed'));
      const errorSpy = vi.spyOn(audioServiceInstance, 'dispatchEvent');
      audioServiceInstance.getAudioContext();

      const result = await audioServiceInstance.startAudioContext();

      expect(mockResume).toHaveBeenCalled();
      expect(audioServiceInstance.isContextStarted()).toBe(false);
      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: expect.objectContaining({ message: 'Error resuming AudioContext.' })
      }));
    });
    
    it('unlockAndInit should start and return true if context starts', async () => {
        mockAudioContext.state = 'suspended';
        const result = await audioServiceInstance.unlockAndInit();
        expect(mockResume).toHaveBeenCalled();
        expect(result).toBe(true);
        expect(audioServiceInstance.isContextStarted()).toBe(true);
    });

    it('unlockAndInit should return false if context fails to start', async () => {
        mockAudioContext.state = 'suspended';
        mockResume.mockRejectedValueOnce(new Error('Resume failed badly'));
        const result = await audioServiceInstance.unlockAndInit();
        expect(mockResume).toHaveBeenCalled();
        expect(result).toBe(false);
        expect(audioServiceInstance.isContextStarted()).toBe(false);
    });

    it('should use webkitAudioContext if AudioContext is not available', () => {
      const originalAudioContext = global.AudioContext;
      (global.AudioContext as any) = undefined;
      (global as any).webkitAudioContext = vi.fn(() => {
        resetMockAudioContextState();
        return mockAudioContext as any;
      });

      const context = audioServiceInstance.getAudioContext();
      expect(context).toBe(mockAudioContext);
      expect((global as any).webkitAudioContext).toHaveBeenCalledTimes(1);

      global.AudioContext = originalAudioContext; // Restore
      delete (global as any).webkitAudioContext; // Clean up test-specific mock
    });

    it('should dispatch error if no AudioContext implementation is found', () => {
      const originalAudioContext = global.AudioContext;
      const originalWebkitAudioContext = (global as any).webkitAudioContext;
      (global.AudioContext as any) = undefined;
      (global as any).webkitAudioContext = undefined;
      const errorSpy = vi.spyOn(audioServiceInstance, 'dispatchEvent');

      const context = audioServiceInstance.getAudioContext();
      expect(context).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: { message: 'Web Audio API not supported.' }
      }));

      global.AudioContext = originalAudioContext; // Restore
      (global as any).webkitAudioContext = originalWebkitAudioContext; // Restore
    });
  });

  describe('File Loading', () => {
    let mockFetch: vi.Mock;
    let mockArrayBuffer: vi.Mock;
    let mockCreateObjectURL: vi.Mock;
    let mockRevokeObjectURL: vi.Mock;
    const mockFileUrl = 'test.mp3';
    const mockFile = new File([new ArrayBuffer(10)], 'test.mp3', { type: 'audio/mpeg' });
    const mockPeaks = [[1,2,3], [1,2,3]];
    const mockAudioBuffer = {
        duration: 15, // Different from default beforeEach to test updates
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 44100 * 15,
        getChannelData: vi.fn(channel => new Float32Array(44100 * 15)),
    };

    beforeEach(() => {
      // Ensure AudioContext is "running" for loading tests by default
      mockAudioContext.state = 'running';
      audioServiceInstance.getAudioContext(); // Initialize it and set state
      (audioServiceInstance as any).isAudioContextStarted = true; // Force this for simplicity in load tests

      mockArrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: mockArrayBuffer,
      });
      global.fetch = mockFetch as any;

      mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-id');
      mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);
      (getPeaks as vi.Mock).mockReturnValue(mockPeaks);

      // Ensure SoundTouchNode.create returns the controllable mock
      const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;
      vi.mocked(SoundTouchNode.create).mockResolvedValue(mockSoundTouchNodeInstance);
      mockSoundTouchNodeInstance.duration = mockAudioBuffer.duration; // Sync STN duration
    });

    it('should decode audio from URL, generate peaks, create SoundTouchNode, and connect graph', async () => {
      const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;
      const loadedSpy = vi.fn();
      audioServiceInstance.addEventListener('loaded', loadedSpy);

      const success = await audioServiceInstance.loadAudioFile(mockFileUrl);

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(mockFileUrl);
      expect(mockArrayBuffer).toHaveBeenCalled();
      expect(mockDecodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer));
      expect(getPeaks).toHaveBeenCalledWith(mockAudioBuffer, (audioServiceInstance as any).SAMPLES_PER_PEAK_PIXEL);
      expect(SoundTouchNode.create).toHaveBeenCalledWith(mockAudioContext, mockAudioBuffer);
      
      expect(mockSoundTouchNodeInstance.connect).toHaveBeenCalledWith(mockPannerNode);
      expect(mockPannerNode.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);

      expect(loadedSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'loaded',
        detail: {
          duration: mockAudioBuffer.duration,
          peaks: mockPeaks,
          fileUrl: mockFileUrl,
        }
      }));
      expect(audioServiceInstance.getDuration()).toBe(mockAudioBuffer.duration); // Check internal duration update
    });

    it('should decode audio from File object, generate peaks, and dispatch loaded event', async () => {
      const loadedSpy = vi.fn();
      audioServiceInstance.addEventListener('loaded', loadedSpy);

      const success = await audioServiceInstance.loadAudioFile(mockFile);

      expect(success).toBe(true);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
      expect(mockDecodeAudioData).toHaveBeenCalled();
      expect(getPeaks).toHaveBeenCalled();
      expect(SoundTouchNode.create).toHaveBeenCalled();
      expect(loadedSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'loaded',
        detail: {
          duration: mockAudioBuffer.duration,
          peaks: mockPeaks,
          fileUrl: 'blob:http://localhost/mock-blob-id',
        }
      }));
    });

    it('should call unlockAndInit if AudioContext is not started before loading', async () => {
      (audioServiceInstance as any).audioContext = null; // Force re-init
      (audioServiceInstance as any).isAudioContextStarted = false;
      mockAudioContext.state = 'suspended'; // Ensure it needs resuming

      const unlockSpy = vi.spyOn(audioServiceInstance, 'unlockAndInit');

      await audioServiceInstance.loadAudioFile(mockFileUrl);

      expect(unlockSpy).toHaveBeenCalled();
      expect(mockResume).toHaveBeenCalled(); // From unlockAndInit path
    });

    it('should handle fetch error and dispatch an error event', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const errorSpy = vi.fn();
      audioServiceInstance.addEventListener('error', errorSpy);

      const success = await audioServiceInstance.loadAudioFile(mockFileUrl);

      expect(success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: expect.objectContaining({ message: 'Error loading audio file: HTTP error! status: 404 for test.mp3' })
      }));
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
    });

    it('should handle decodeAudioData error and dispatch an error event', async () => {
      const decodeError = new Error('Decode failed');
      mockDecodeAudioData.mockRejectedValueOnce(decodeError);
      const errorSpy = vi.fn();
      audioServiceInstance.addEventListener('error', errorSpy);

      const success = await audioServiceInstance.loadAudioFile(mockFileUrl);

      expect(success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: { 
            message: 'Error loading audio file: Decode failed',
            error: decodeError
        }
      }));
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
    });

    it('should handle SoundTouchNode.create error and dispatch an error event', async () => {
      const createError = new Error('STN create failed');
      vi.mocked(SoundTouchNode.create).mockRejectedValueOnce(createError);
      const errorSpy = vi.fn();
      audioServiceInstance.addEventListener('error', errorSpy);

      const success = await audioServiceInstance.loadAudioFile(mockFileUrl);

      expect(success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: { 
            message: 'Error loading audio file: STN create failed',
            error: createError 
        }
      }));
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
    });

    it('should clean up previous SoundTouchNode and event listeners on new load', async () => {
      const { mockSoundTouchNodeInstance: firstSTN } = vi.mocked(SoundTouchNode, true) as any;
      vi.mocked(SoundTouchNode.create).mockResolvedValue(firstSTN);
      await audioServiceInstance.loadAudioFile(mockFileUrl); // First load
      
      expect(firstSTN.addEventListener).toHaveBeenCalledTimes(5); // timeupdate, ended, error, loaded, statechange

      const { mockSoundTouchNodeInstance: secondSTN } = vi.mocked(SoundTouchNode, true) as any;
      vi.mocked(SoundTouchNode.create).mockResolvedValue(secondSTN); // Prepare for second load
       // Manually assign a new mock instance for the second call if the mock setup doesn't provide a new one each time
      const newMockInstance = { ...firstSTN, dispose: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), connect:vi.fn() }; 
      vi.mocked(SoundTouchNode.create).mockResolvedValueOnce(newMockInstance);

      await audioServiceInstance.loadAudioFile('another.mp3'); // Second load

      expect(firstSTN.dispose).toHaveBeenCalled();
      expect(firstSTN.removeEventListener).toHaveBeenCalledTimes(5);
      expect(newMockInstance.addEventListener).toHaveBeenCalledTimes(5);
    });
    
    it('should apply initial pan, volume, pitch, and speed settings after loading', async () => {
      const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;
      const initialPitch = -3;
      const initialSpeed = 1.25;
      const initialPan = 0.5;
      const initialVolume = 0.75;

      audioServiceInstance.setPitch(initialPitch);
      audioServiceInstance.setSpeed(initialSpeed);
      audioServiceInstance.setPan(initialPan);
      audioServiceInstance.setVolume(initialVolume);

      await audioServiceInstance.loadAudioFile(mockFileUrl);
      
      expect(mockSoundTouchNodeInstance.setPitchSemitones).toHaveBeenCalledWith(initialPitch);
      expect(mockSoundTouchNodeInstance.setTempo).toHaveBeenCalledWith(initialSpeed);
      expect(mockPannerNode.pan.value).toBe(initialPan);
      expect(mockGainNode.gain.value).toBe(initialVolume);
    });
  });

  describe('Playback Controls', () => {
    const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;

    beforeEach(async () => {
      // Ensure AudioContext is running and a file is loaded for playback tests
      mockAudioContext.state = 'running';
      (audioServiceInstance as any).isAudioContextStarted = true;
      audioServiceInstance.getAudioContext(); // Initialize
      // Simulate a loaded state
      vi.mocked(SoundTouchNode.create).mockResolvedValue(mockSoundTouchNodeInstance);
      mockSoundTouchNodeInstance.isLoaded = true;
      mockSoundTouchNodeInstance.duration = 10;
      (audioServiceInstance as any).soundTouchNode = mockSoundTouchNodeInstance;
      (audioServiceInstance as any).isReadyForPlayback = true;
      (audioServiceInstance as any).audioBuffer = { duration: 10 } as any;
      (audioServiceInstance as any).internalDuration = 10;
    });

    it('play() should call SoundTouchNode.play() and resume context if suspended', async () => {
      mockAudioContext.state = 'suspended'; // Test resume path
      await audioServiceInstance.play();
      expect(mockResume).toHaveBeenCalled();
      expect(mockSoundTouchNodeInstance.play).toHaveBeenCalled();
    });

    it('play() should not call SoundTouchNode.play() if not ready', async () => {
      (audioServiceInstance as any).isReadyForPlayback = false;
      await audioServiceInstance.play();
      expect(mockSoundTouchNodeInstance.play).not.toHaveBeenCalled();
    });

    it('play() should handle errors during play initiation', async () => {
        mockSoundTouchNodeInstance.play.mockImplementationOnce(() => { 
            throw new Error('Play failed'); 
        });
        const errorSpy = vi.spyOn(audioServiceInstance, 'dispatchEvent');
        await audioServiceInstance.play();
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            detail: expect.objectContaining({ message: 'Error during play initiation.' })
        }));
    });

    it('pause() should call SoundTouchNode.pause()', () => {
      audioServiceInstance.pause();
      expect(mockSoundTouchNodeInstance.pause).toHaveBeenCalled();
    });

    it('pause() should not call SoundTouchNode.pause() if not ready', () => {
      (audioServiceInstance as any).isReadyForPlayback = false;
      mockSoundTouchNodeInstance.isLoaded = false;
      audioServiceInstance.pause();
      expect(mockSoundTouchNodeInstance.pause).not.toHaveBeenCalled();
    });

    it('stop() should call SoundTouchNode.stop()', () => {
      audioServiceInstance.stop();
      expect(mockSoundTouchNodeInstance.stop).toHaveBeenCalled();
    });

    it('stop() should reset internal state if SoundTouchNode is not available', () => {
        (audioServiceInstance as any).soundTouchNode = null;
        const timeUpdateSpy = vi.fn();
        const stateChangeSpy = vi.fn();
        audioServiceInstance.addEventListener('timeupdate', timeUpdateSpy);
        audioServiceInstance.addEventListener('statechange', stateChangeSpy);
        audioServiceInstance.stop();
        expect(mockSoundTouchNodeInstance.stop).not.toHaveBeenCalled(); // STN is null
        expect(audioServiceInstance.getCurrentTime()).toBe(0);
        expect(audioServiceInstance.getPlayerState()).toBe('stopped');
        expect(timeUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: { currentTime: 0 } }));
        expect(stateChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: { isPlaying: false, playState: 'stopped' } }));
    });

    it('seek() should call SoundTouchNode.seek() with clamped time', () => {
      audioServiceInstance.seek(5);
      expect(mockSoundTouchNodeInstance.seek).toHaveBeenCalledWith(5);

      audioServiceInstance.seek(15); // Duration is 10
      expect(mockSoundTouchNodeInstance.seek).toHaveBeenCalledWith(10);

      audioServiceInstance.seek(-5);
      expect(mockSoundTouchNodeInstance.seek).toHaveBeenCalledWith(0);
    });

    it('seek() should not call SoundTouchNode.seek() if not ready', () => {
      (audioServiceInstance as any).isReadyForPlayback = false;
      audioServiceInstance.seek(5);
      expect(mockSoundTouchNodeInstance.seek).not.toHaveBeenCalled();
    });
  });

  describe('Parameter Controls', () => {
    const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;

    beforeEach(async () => {
      // Basic setup: AudioContext running, nodes available
      mockAudioContext.state = 'running';
      (audioServiceInstance as any).isAudioContextStarted = true;
      audioServiceInstance.getAudioContext(); // Initializes context and nodes
      
      // Simulate a loaded state with SoundTouchNode for methods that require it
      vi.mocked(SoundTouchNode.create).mockResolvedValue(mockSoundTouchNodeInstance);
      (audioServiceInstance as any).soundTouchNode = mockSoundTouchNodeInstance;
      (audioServiceInstance as any).pannerNode = mockPannerNode;
      (audioServiceInstance as any).gainNode = mockGainNode;
      mockSoundTouchNodeInstance.isLoaded = true;
      (audioServiceInstance as any).isReadyForPlayback = true;
    });

    it('setPitch() should call SoundTouchNode.setPitchSemitones() and dispatch event', () => {
      const pitchSpy = vi.fn();
      audioServiceInstance.addEventListener('pitchchange', pitchSpy);
      const semitones = -2.5;
      audioServiceInstance.setPitch(semitones);
      expect(mockSoundTouchNodeInstance.setPitchSemitones).toHaveBeenCalledWith(semitones);
      expect(pitchSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { pitch: semitones }
      }));
    });

    it('setPitch() should call SoundTouchNode.flush() if forceUpdate is true', () => {
      audioServiceInstance.setPitch(-2.5, true);
      expect(mockSoundTouchNodeInstance.flush).toHaveBeenCalled();
    });

    it('setSpeed() should call SoundTouchNode.setTempo() and dispatch event', () => {
      const speedSpy = vi.fn();
      audioServiceInstance.addEventListener('speedchange', speedSpy);
      const speed = 1.5;
      audioServiceInstance.setSpeed(speed);
      expect(mockSoundTouchNodeInstance.setTempo).toHaveBeenCalledWith(speed);
      expect(speedSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { speed: speed }
      }));
    });

    it('setSpeed() should call SoundTouchNode.flush() if forceUpdate is true', () => {
      audioServiceInstance.setSpeed(1.5, true);
      expect(mockSoundTouchNodeInstance.flush).toHaveBeenCalled();
    });

    it('setPan() should update StereoPannerNode.pan.value and dispatch event', () => {
      const panSpy = vi.fn();
      audioServiceInstance.addEventListener('panchange', panSpy);
      const panValue = 0.7;
      audioServiceInstance.setPan(panValue);
      expect(mockPannerNode.pan.value).toBe(panValue);
      expect(panSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { pan: panValue }
      }));
    });

    it('setPan() should clamp values to [-1, 1] and snap to 0 near center', () => {
      audioServiceInstance.setPan(1.5);
      expect(mockPannerNode.pan.value).toBe(1);
      audioServiceInstance.setPan(-1.5);
      expect(mockPannerNode.pan.value).toBe(-1);
      audioServiceInstance.setPan(0.05); // Within snap threshold
      expect(mockPannerNode.pan.value).toBe(0);
      audioServiceInstance.setPan(-0.05); // Within snap threshold
      expect(mockPannerNode.pan.value).toBe(0);
      audioServiceInstance.setPan(0.1); // Outside snap threshold
      expect(mockPannerNode.pan.value).toBe(0.1);
    });

    it('setVolume() should update GainNode.gain.value and dispatch event', () => {
      const volumeSpy = vi.fn();
      audioServiceInstance.addEventListener('volumechange', volumeSpy);
      const volumeValue = 0.65;
      audioServiceInstance.setVolume(volumeValue);
      expect(mockGainNode.gain.value).toBe(volumeValue);
      expect(volumeSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: { volume: volumeValue }
      }));
    });

    it('setVolume() should clamp values to [0, 1]', () => {
      audioServiceInstance.setVolume(1.5);
      expect(mockGainNode.gain.value).toBe(1);
      audioServiceInstance.setVolume(-0.5);
      expect(mockGainNode.gain.value).toBe(0);
    });

    it('setPitch() should not call SoundTouchNode if node is not available', () => {
        (audioServiceInstance as any).soundTouchNode = null;
        audioServiceInstance.setPitch(2);
        expect(mockSoundTouchNodeInstance.setPitchSemitones).not.toHaveBeenCalled();
    });

    it('setSpeed() should not call SoundTouchNode if node is not available', () => {
        (audioServiceInstance as any).soundTouchNode = null;
        audioServiceInstance.setSpeed(1.2);
        expect(mockSoundTouchNodeInstance.setTempo).not.toHaveBeenCalled();
    });
  });

  describe('State Accessors', () => {
    const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;

    beforeEach(() => {
      // Reset relevant internal state of audioServiceInstance for these tests
      (audioServiceInstance as any).soundTouchNode = mockSoundTouchNodeInstance;
      (audioServiceInstance as any).audioContext = mockAudioContext;
      (audioServiceInstance as any).isAudioContextStarted = true;
      (audioServiceInstance as any).isReadyForPlayback = true;
      mockSoundTouchNodeInstance.isLoaded = true;
      mockSoundTouchNodeInstance.isPlaying = false;
      mockSoundTouchNodeInstance.currentTime = 0;
      mockSoundTouchNodeInstance.duration = 0;
      (audioServiceInstance as any).playState = 'stopped';
      (audioServiceInstance as any).internalCurrentTime = 0;
      (audioServiceInstance as any).internalDuration = 0;
      (audioServiceInstance as any).currentPitchSemitones = 0;
      (audioServiceInstance as any).currentSpeedFactor = 1.0;
      (audioServiceInstance as any).currentPan = 0;
      (audioServiceInstance as any).currentVolume = 1.0;
    });

    it('getCurrentTime() should return internalCurrentTime (updated by STN events)', () => {
      (audioServiceInstance as any).internalCurrentTime = 5.5;
      expect(audioServiceInstance.getCurrentTime()).toBe(5.5);
    });

    it('getDuration() should return internalDuration (updated by STN events or buffer)', () => {
      (audioServiceInstance as any).internalDuration = 25.2;
      expect(audioServiceInstance.getDuration()).toBe(25.2);
    });

    it('getPlayerState() should return the current play state', () => {
      (audioServiceInstance as any).playState = 'playing';
      expect(audioServiceInstance.getPlayerState()).toBe('playing');
      (audioServiceInstance as any).playState = 'paused';
      expect(audioServiceInstance.getPlayerState()).toBe('paused');
    });

    it('isPlayerReady() should reflect overall readiness', () => {
      // Default true from beforeEach
      expect(audioServiceInstance.isPlayerReady()).toBe(true);

      (audioServiceInstance as any).isAudioContextStarted = false;
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
      (audioServiceInstance as any).isAudioContextStarted = true; // reset

      (audioServiceInstance as any).isReadyForPlayback = false;
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
      (audioServiceInstance as any).isReadyForPlayback = true; // reset

      (audioServiceInstance as any).soundTouchNode = null;
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
      (audioServiceInstance as any).soundTouchNode = mockSoundTouchNodeInstance; // reset

      mockSoundTouchNodeInstance.isLoaded = false;
      expect(audioServiceInstance.isPlayerReady()).toBe(false);
    });

    it('isAudioPlaying() should reflect playing state', () => {
      (audioServiceInstance as any).playState = 'playing';
      expect(audioServiceInstance.isAudioPlaying()).toBe(true);
      (audioServiceInstance as any).playState = 'paused';
      expect(audioServiceInstance.isAudioPlaying()).toBe(false);
      (audioServiceInstance as any).playState = 'stopped';
      expect(audioServiceInstance.isAudioPlaying()).toBe(false);
    });

    it('getCurrentPitchSemitones() should return current pitch', () => {
      (audioServiceInstance as any).currentPitchSemitones = -4;
      expect(audioServiceInstance.getCurrentPitchSemitones()).toBe(-4);
    });

    it('getCurrentSpeed() should return current speed factor', () => {
      (audioServiceInstance as any).currentSpeedFactor = 1.75;
      expect(audioServiceInstance.getCurrentSpeed()).toBe(1.75);
    });

    it('getCurrentPan() should return current pan value', () => {
      (audioServiceInstance as any).currentPan = 0.35;
      expect(audioServiceInstance.getCurrentPan()).toBe(0.35);
    });

    it('getCurrentVolume() should return current volume', () => {
      (audioServiceInstance as any).currentVolume = 0.88;
      expect(audioServiceInstance.getCurrentVolume()).toBe(0.88);
    });
    
    it('isReady() should reflect context started and general readiness for loading', () => {
      expect(audioServiceInstance.isReady()).toBe(true); // From beforeEach

      (audioServiceInstance as any).isAudioContextStarted = false;
      expect(audioServiceInstance.isReady()).toBe(false);
      (audioServiceInstance as any).isAudioContextStarted = true; // reset
      
      (audioServiceInstance as any).isReadyForPlayback = false;
      expect(audioServiceInstance.isReady()).toBe(false);
    });
    
    it('getIsSoundTouchActive() should reflect if SoundTouchNode exists and is loaded', () => {
        expect(audioServiceInstance.getIsSoundTouchActive()).toBe(true); // From beforeEach
        
        mockSoundTouchNodeInstance.isLoaded = false;
        expect(audioServiceInstance.getIsSoundTouchActive()).toBe(false);
        mockSoundTouchNodeInstance.isLoaded = true; // reset
        
        (audioServiceInstance as any).soundTouchNode = null;
        expect(audioServiceInstance.getIsSoundTouchActive()).toBe(false);
    });

  });

  describe('Dispose Method', () => {
    const { mockSoundTouchNodeInstance } = vi.mocked(SoundTouchNode, true) as any;
    let mockPanner: any;
    let mockGain: any;

    beforeEach(async () => {
      // Setup a fairly complete state to ensure dispose cleans it up
      mockAudioContext.state = 'running';
      audioServiceInstance.getAudioContext(); // Creates context
      (audioServiceInstance as any).isAudioContextStarted = true;

      // Create fresh mocks for panner and gain to ensure disconnect is tracked per test
      mockPanner = { pan: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), context: mockAudioContext };
      mockGain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(), context: mockAudioContext };
      mockCreateStereoPanner.mockReturnValue(mockPanner);
      mockCreateGain.mockReturnValue(mockGain);
      
      // Simulate a loaded file state
      (audioServiceInstance as any).soundTouchNode = mockSoundTouchNodeInstance;
      (audioServiceInstance as any).pannerNode = mockPanner;
      (audioServiceInstance as any).gainNode = mockGain;
      (audioServiceInstance as any).audioBuffer = { duration: 10 } as any;
      (audioServiceInstance as any).waveformPeaks = [[1],[1]];
      (audioServiceInstance as any).currentFileUrl = 'blob:http://localhost/mock-blob-id-todispose';
      global.URL.revokeObjectURL = vi.fn(); // Reset revoke mock for each test

      (audioServiceInstance as any).internalCurrentTime = 5;
      (audioServiceInstance as any).internalDuration = 10;
      (audioServiceInstance as any).isLoading = false;
      (audioServiceInstance as any).isReadyForPlayback = true;
      (audioServiceInstance as any).playState = 'playing';
      
      // Ensure event listeners are spied upon for removal
      // We'll rely on the number of times removeEventListener is called on the mock STN
      mockSoundTouchNodeInstance.removeEventListener.mockClear();
      mockSoundTouchNodeInstance.dispose.mockClear();
      mockPanner.disconnect.mockClear();
      mockGain.disconnect.mockClear();
    });

    it('should call stop', async () => {
      const stopSpy = vi.spyOn(audioServiceInstance, 'stop');
      await audioServiceInstance.dispose();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should remove event listeners from SoundTouchNode', async () => {
      // Load a file to ensure listeners are added
      // This is a bit redundant with beforeEach but makes the intent clear for listener addition
      vi.mocked(SoundTouchNode.create).mockResolvedValue(mockSoundTouchNodeInstance);
      await audioServiceInstance.loadAudioFile('test.mp3');
      // Now dispose
      await audioServiceInstance.dispose();
      // Expect 5 listeners to be removed (timeupdate, ended, error, loaded, statechange)
      expect(mockSoundTouchNodeInstance.removeEventListener).toHaveBeenCalledTimes(5);
    });

    it('should call dispose on SoundTouchNode', async () => {
      await audioServiceInstance.dispose();
      expect(mockSoundTouchNodeInstance.dispose).toHaveBeenCalled();
    });

    it('should disconnect panner and gain nodes', async () => {
      await audioServiceInstance.dispose();
      expect(mockPanner.disconnect).toHaveBeenCalled();
      expect(mockGain.disconnect).toHaveBeenCalled();
    });

    it('should revoke object URL if currentFileUrl is a blob URL', async () => {
      await audioServiceInstance.dispose();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-id-todispose');
    });

    it('should not revoke object URL if currentFileUrl is not a blob URL or is null', async () => {
      (audioServiceInstance as any).currentFileUrl = 'http://example.com/file.mp3';
      await audioServiceInstance.dispose();
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
      
      (audioServiceInstance as any).currentFileUrl = null;
      await audioServiceInstance.dispose();
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled(); // Still not called for the second dispose
    });

    it('should reset internal state variables', async () => {
      await audioServiceInstance.dispose();
      expect((audioServiceInstance as any).soundTouchNode).toBeNull();
      expect((audioServiceInstance as any).pannerNode).toBeNull();
      expect((audioServiceInstance as any).gainNode).toBeNull();
      expect((audioServiceInstance as any).audioBuffer).toBeNull();
      expect((audioServiceInstance as any).waveformPeaks).toEqual([]);
      expect((audioServiceInstance as any).currentFileUrl).toBeNull();
      expect(audioServiceInstance.getCurrentTime()).toBe(0);
      expect(audioServiceInstance.getDuration()).toBe(0);
      expect((audioServiceInstance as any).isLoading).toBe(false);
      expect((audioServiceInstance as any).isReadyForPlayback).toBe(false);
      expect(audioServiceInstance.getPlayerState()).toBe('stopped');
    });

    // The AudioService currently comments out closing the AudioContext.
    // If that behavior changes, this test would need to be updated.
    it('should NOT close AudioContext by default (as per current implementation)', async () => {
      await audioServiceInstance.dispose();
      expect(mockClose).not.toHaveBeenCalled();
      expect(audioServiceInstance.getAudioContext()).not.toBeNull(); // Context should still be there
    });

    // Example test if AudioContext close were to be enabled:
    // it('should close AudioContext if it was exclusively owned and dispose is configured to do so', async () => {
    //   // Modify AudioService to enable context closing for this test or assume it's enabled
    //   mockAudioContext.state = 'running';
    //   await audioServiceInstance.dispose();
    //   expect(mockClose).toHaveBeenCalled();
    //   // Further checks if audioContext reference is nulled etc.
    // });
  });

}); 