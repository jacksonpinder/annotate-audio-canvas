import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundTouchNode, SoundTouchNodeEventMap } from '../../src/audio/SoundTouchNode';

// --- Mocks Setup ---

class MockMessagePort implements MessagePort {
  onmessage: ((this: MessagePort, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: MessagePort, ev: MessageEvent) => any) | null = null;
  postMessage = vi.fn();
  start = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn() as MessagePort['addEventListener']; // Type assertion for stricter matching
  removeEventListener = vi.fn() as MessagePort['removeEventListener'];
  dispatchEvent = vi.fn((event: Event): boolean => true);
}

// Mock for the AudioWorkletNode constructor
const mockAudioWorkletNodeConnect = vi.fn();
const mockAudioWorkletNodeDisconnect = vi.fn();
const mockAudioWorkletNodeAddEventListener = vi.fn();
const mockAudioWorkletNodeRemoveEventListener = vi.fn();
const mockAudioWorkletNodeDispatchEvent = vi.fn().mockImplementation((event: Event) => true);

const AudioWorkletNodeMock = vi.fn().mockImplementation(function (this: any, context, name, options) {
  this.context = context;
  this.name = name; // Store name for verification if needed
  this.options = options; // Store options for verification
  this.port = new MockMessagePort();
  this.connect = mockAudioWorkletNodeConnect;
  this.disconnect = mockAudioWorkletNodeDisconnect;
  this.addEventListener = mockAudioWorkletNodeAddEventListener;
  this.removeEventListener = mockAudioWorkletNodeRemoveEventListener;
  this.dispatchEvent = mockAudioWorkletNodeDispatchEvent;
  this.numberOfInputs = 0;
  this.numberOfOutputs = options?.outputChannelCount?.length ?? 1;
  this.channelCount = options?.outputChannelCount?.[0] ?? 2;
  this.channelCountMode = 'explicit';
  this.channelInterpretation = 'speakers';
});
vi.stubGlobal('AudioWorkletNode', AudioWorkletNodeMock);

// Mock AudioContext
const mockAddModule = vi.fn();
const mockResume = vi.fn();
const mockAudioContext = {
  audioWorklet: {
    addModule: mockAddModule,
  },
  resume: mockResume,
  sampleRate: 44100, // Default sample rate
  currentTime: 0,
  destination: {} as AudioDestinationNode, // Dummy destination
  state: 'running', // Default state
  createGain: vi.fn(), // Add other factory methods if used by SoundTouchNode indirectly
  // ... other AudioContext properties/methods if needed
} as unknown as AudioContext;

// Mock URL global
// SoundTouchNode attempts: new URL('./SoundTouchProcessor.js', import.meta.url)
// If import.meta.url is undefined in test, it falls back to './SoundTouchProcessor.js'
// This mock will handle either case and return a predictable string.
vi.stubGlobal('URL', vi.fn().mockImplementation((path, base) => {
  if (base && typeof base === 'string' && base.includes('import.meta.url')) {
    return `mocked-url-base/${path}`.replace('/./','/'); // e.g. mocked-url-base/SoundTouchProcessor.js
  }
  // Fallback case from SoundTouchNode or general usage
  return path.startsWith('.') ? `relative/${path}` : path; 
}));

// Mock AudioBuffer (similar to getPeaks.spec.ts)
class MockAudioBuffer implements Partial<AudioBuffer> {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelDataArrays: Float32Array[];

  constructor(channelData: Float32Array[], sampleRateVal = 44100) {
    this.numberOfChannels = channelData.length;
    this.length = channelData.length > 0 && channelData[0] ? channelData[0].length : 0;
    this.sampleRate = sampleRateVal;
    this.channelDataArrays = channelData;
    this.duration = this.length / this.sampleRate;
  }

  getChannelData = vi.fn((channelIndex: number): Float32Array => {
    if (channelIndex < 0 || channelIndex >= this.channelDataArrays.length) {
      throw new Error('Invalid channel index for mock');
    }
    return this.channelDataArrays[channelIndex];
  });
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

// --- Tests --- 

describe('SoundTouchNode', () => {
  let mockAudioBuffer: AudioBuffer;
  let mockNodeInstancePort: MockMessagePort; // To store the port of the latest node instance

  beforeEach(async () => { // Made beforeEach async if create is always awaited
    vi.resetAllMocks();
    vi.stubGlobal('AudioWorkletNode', AudioWorkletNodeMock);
    vi.stubGlobal('URL', vi.fn().mockImplementation((path, base) => 
      base && typeof base === 'string' && base.includes('import.meta.url') ? `mocked-url-base/${path}`.replace('/./','/') : (path.startsWith('.') ? `relative/${path}` : path)
    ));

    const leftChannel = new Float32Array([0.1, 0.2, 0.3]);
    const rightChannel = new Float32Array([-0.1, -0.2, -0.3]);
    mockAudioBuffer = new MockAudioBuffer([leftChannel, rightChannel]) as AudioBuffer;

    mockAddModule.mockResolvedValue(undefined);
    mockResume.mockResolvedValue(undefined);
    
    // Helper to get the port of the most recently created SoundTouchNode instance
    // This is useful because the constructor sets up onmessage handlers.
    // We need to simulate messages on the *correct* port instance.
    const node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
    const lastMockNodeConstruction = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length - 1];
    if (lastMockNodeConstruction && lastMockNodeConstruction.value) {
        mockNodeInstancePort = lastMockNodeConstruction.value.port as MockMessagePort;
    }
  });

  describe('SoundTouchNode.create()', () => {
    it('should call audioWorklet.addModule with the processor URL', async () => {
      // globalThis.importMetaUrl = 'file:///test/'; // Mocking import.meta.url if needed by URL mock
      await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      // The URL mock will return 'mocked-url-base/SoundTouchProcessor.js' or 'relative/./SoundTouchProcessor.js'
      // We check that addModule was called with one of these, or a general string check.
      expect(mockAddModule).toHaveBeenCalledOnce();
      expect(mockAddModule.mock.calls[0][0]).stringContaining('SoundTouchProcessor.js');
    });

    it('should return an instance of SoundTouchNode on successful module load', async () => {
      const node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      expect(node).toBeInstanceOf(SoundTouchNode);
      // Check if the AudioWorkletNodeMock (super constructor) was called with correct params
      expect(AudioWorkletNodeMock).toHaveBeenCalledWith(mockAudioContext, 'soundtouch-processor', expect.anything());
    });

    it('should throw if audioWorklet.addModule fails', async () => {
      mockAddModule.mockRejectedValueOnce(new Error('Module load failed'));
      await expect(SoundTouchNode.create(mockAudioContext, mockAudioBuffer))
        .rejects
        .toThrow('Failed to add SoundTouchProcessor module');
    });

    it('should use cached processor URL on subsequent calls', async () => {
      const firstUrl = 'first-call-url/SoundTouchProcessor.js';
      const secondUrl = 'second-call-url/SoundTouchProcessor.js'; // Should not be used

      const urlMock = vi.fn()
        .mockReturnValueOnce(firstUrl)
        .mockReturnValueOnce(secondUrl); // This should not be reached for the URL generation itself
      vi.stubGlobal('URL', urlMock);
      
      // Clear static property for this test
      (SoundTouchNode as any).processorUrl = null; 

      await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      expect(mockAddModule).toHaveBeenCalledWith(firstUrl);
      expect(urlMock).toHaveBeenCalledTimes(1); // URL constructor called once to determine URL

      // Call create again
      mockAddModule.mockClear(); // Clear previous call to addModule
      await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      expect(mockAddModule).toHaveBeenCalledWith(firstUrl); // Still uses the cached URL
      expect(urlMock).toHaveBeenCalledTimes(1); // URL constructor not called again

      // Reset for other tests
      (SoundTouchNode as any).processorUrl = null; 
    });
  });

  describe('Constructor and Initial Data Loading', () => {
    let node: SoundTouchNode;
    let mockPort: MockMessagePort;

    beforeEach(async () => {
      // Create node will call constructor, which calls _loadDataToWorklet
      node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      // The AudioWorkletNodeMock provides the port instance used by the SoundTouchNode instance.
      // We need to get the port associated with THIS specific node instance.
      const mockNodeInstance = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length-1].value;
      mockPort = mockNodeInstance.port as MockMessagePort;
    });

    it('should call super constructor (AudioWorkletNode) with correct parameters', () => {
      expect(AudioWorkletNodeMock).toHaveBeenCalledWith(mockAudioContext, 'soundtouch-processor', {
        outputChannelCount: [2],
      });
    });

    it('should post 'loadData' message to worklet with audio data and sampleRate', () => {
      expect(mockPort.postMessage).toHaveBeenCalledOnce();
      const expectedLeftChannel = mockAudioBuffer.getChannelData(0);
      const expectedRightChannel = mockAudioBuffer.getChannelData(1);
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        {
          type: 'loadData',
          channelData: [expectedLeftChannel, expectedRightChannel],
          sampleRate: mockAudioBuffer.sampleRate,
        },
        [expectedLeftChannel.buffer, expectedRightChannel.buffer] // Transferable objects
      );
    });

    it('should duplicate mono channel data for 'loadData' message', async () => {
      const monoData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const monoBuffer = new MockAudioBuffer([monoData]) as AudioBuffer;
      
      // Reset relevant mocks for this specific test case if create was called in global beforeEach
      AudioWorkletNodeMock.mockClear();
      mockAddModule.mockClear();
      const freshNode = await SoundTouchNode.create(mockAudioContext, monoBuffer);
      const lastCallResult = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length-1].value;
      const portForMonoNode = lastCallResult.port as MockMessagePort;

      expect(portForMonoNode.postMessage).toHaveBeenCalledOnce();
      expect(portForMonoNode.postMessage).toHaveBeenCalledWith(
        {
          type: 'loadData',
          channelData: [monoData, monoData], // Left and Right are the same
          sampleRate: monoBuffer.sampleRate,
        },
        [monoData.buffer, monoData.buffer]
      );
    });

    it('should handle AudioBuffer with zero channels in _loadDataToWorklet by dispatching an error', async () => {
        const zeroChannelBuffer = new MockAudioBuffer([], 44100) as AudioBuffer;
        (zeroChannelBuffer as any).numberOfChannels = 0; // Force zero channels for test

        AudioWorkletNodeMock.mockClear();
        mockAddModule.mockClear();
        mockAudioWorkletNodeDispatchEvent.mockClear();

        const nodeWithNoChannels = await SoundTouchNode.create(mockAudioContext, zeroChannelBuffer);
        const lastCallResult = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length-1].value;
        const portForNoChannelNode = lastCallResult.port as MockMessagePort;
        
        expect(portForNoChannelNode.postMessage).not.toHaveBeenCalled(); // Should not attempt to post if no channels
        expect(mockAudioWorkletNodeDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            detail: { message: 'AudioBuffer has no channels.' }
        }));
    });
  });

  describe('Worklet Message Handling', () => {
    let node: SoundTouchNode;
    let port: MockMessagePort; // Port of the specific node instance for these tests
    let dispatchEventSpy: any;

    beforeEach(async () => {
      // Ensure a fresh node and port for each test in this describe block
      // This might re-create the node if the outer beforeEach doesn't isolate enough
      // For now, let's assume the outer beforeEach sets up a common node, and we grab its port.
      // However, to be safe and ensure dispatchEventSpy is on the correct instance:
      AudioWorkletNodeMock.mockClear(); // Clear calls to the constructor itself
      mockAudioWorkletNodeDispatchEvent.mockClear(); // Clear calls to the event dispatcher of the mock

      node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      const lastMockNodeConstruction = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length - 1];
      port = lastMockNodeConstruction.value.port as MockMessagePort;
      dispatchEventSpy = lastMockNodeConstruction.value.dispatchEvent;
    });

    it('should handle 'loaded' message from worklet', () => {
      expect(node.isLoaded).toBe(false); // Initial state if create doesn't auto-trigger 'loaded' via postMessage mock
      expect(node.duration).toBe(mockAudioBuffer.duration); // Initial duration from buffer

      const workletReportedDuration = 123.45;
      port.onmessage?.(new MessageEvent('message', { data: { type: 'loaded', duration: workletReportedDuration } }));

      expect(node.isLoaded).toBe(true);
      expect(node.duration).toBe(workletReportedDuration);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'loaded',
        detail: { duration: workletReportedDuration },
      }));
    });

    it('should handle 'timeupdate' message from worklet', () => {
      const newTime = 5.5;
      port.onmessage?.(new MessageEvent('message', { data: { type: 'timeupdate', currentTime: newTime } }));
      expect(node.currentTime).toBe(newTime);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'timeupdate',
        detail: { currentTime: newTime },
      }));
    });

    it('should handle 'ended' message from worklet', () => {
      // Manually set isPlaying to true for test
      (node as any)._isPlaying = true;
      port.onmessage?.(new MessageEvent('message', { data: { type: 'ended' } }));
      expect(node.isPlaying).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'ended' }));
    });

    it('should handle 'error' message from worklet', () => {
      const errorMessage = 'Worklet crashed!';
      port.onmessage?.(new MessageEvent('message', { data: { type: 'error', message: errorMessage } }));
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: { message: errorMessage },
      }));
    });

    it('should handle 'stateChange' message from worklet', () => {
      port.onmessage?.(new MessageEvent('message', { data: { type: 'stateChange', isPlaying: true } }));
      expect(node.isPlaying).toBe(true);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'statechange',
        detail: { isPlaying: true },
      }));

      dispatchEventSpy.mockClear();
      port.onmessage?.(new MessageEvent('message', { data: { type: 'stateChange', isPlaying: false } }));
      expect(node.isPlaying).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'statechange',
        detail: { isPlaying: false },
      }));
    });

    it('should handle 'seeked' message from worklet', () => {
      const seekedPositionFrames = 44100; // e.g., 1 second at 44100Hz
      const expectedSeekedTime = seekedPositionFrames / mockAudioBuffer.sampleRate;
      port.onmessage?.(new MessageEvent('message', { data: { type: 'seeked', newPositionFrames: seekedPositionFrames } }));
      expect(node.currentTime).toBe(expectedSeekedTime);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'seeked',
        detail: { currentTime: expectedSeekedTime },
      }));
    });

    it('should handle port.onmessageerror', () => {
      port.onmessageerror?.(new MessageEvent('messageerror'));
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        detail: { message: 'MessagePort communication error' },
      }));
    });
  });

  describe('Control Methods', () => {
    let node: SoundTouchNode;
    let port: MockMessagePort;

    beforeEach(async () => {
      // Node is created, and initial 'loadData' is posted by constructor
      node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      const lastMockNodeConstruction = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length - 1];
      port = lastMockNodeConstruction.value.port as MockMessagePort;
      
      // Simulate worklet confirming data load for methods that check isLoaded
      // Assuming _loadDataToWorklet was called and port.postMessage for loadData was spied on, if needed.
      // For these control methods, we often need the node to be in a 'loaded' state.
      port.onmessage?.(new MessageEvent('message', { data: { type: 'loaded', duration: mockAudioBuffer.duration } }));
      port.postMessage.mockClear(); // Clear the initial 'loadData' postMessage call
    });

    it('play() should post 'play' message to worklet', () => {
      node.play();
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'play' });
    });

    it('play() should call context.resume() if context is suspended', async () => {
      (mockAudioContext as any).state = 'suspended'; // Set context to suspended
      node.play();
      expect(mockResume).toHaveBeenCalledOnce();
      // Simulate resume succeeding, then check for postMessage
      await Promise.resolve(); // Allow promise from resume() to resolve if it was truly async
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'play' });
      (mockAudioContext as any).state = 'running'; // Reset for other tests
    });
    
    it('play() should dispatch an error event if context.resume() fails', async () => {
        (mockAudioContext as any).state = 'suspended';
        mockResume.mockRejectedValueOnce(new Error('Resume failed'));
        const dispatchEventSpy = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length -1].value.dispatchEvent;

        node.play();
        await Promise.resolve(); // Wait for promises to settle

        expect(mockResume).toHaveBeenCalledOnce();
        expect(port.postMessage).not.toHaveBeenCalledWith({ type: 'play' });
        expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            detail: { message: 'Failed to resume AudioContext' }
        }));
        (mockAudioContext as any).state = 'running'; // Reset state
    });

    it('play() should not post 'play' message if not loaded', () => {
      (node as any)._isLoaded = false; // Force not loaded state
      node.play();
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true; // Reset for other tests
    });

    it('pause() should post 'pause' message to worklet', () => {
      node.pause();
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'pause' });
    });

    it('pause() should not post 'pause' message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.pause();
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });

    it('stop() should post 'stop' message to worklet', () => {
      node.stop();
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'stop' });
    });

    it('stop() should not post 'stop' message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.stop();
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });

    it('seek() should post 'seek' message with positionFrames', () => {
      const seekTimeSeconds = 1.0;
      const expectedFrames = seekTimeSeconds * mockAudioBuffer.sampleRate;
      node.seek(seekTimeSeconds);
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'seek', positionFrames: expectedFrames });
    });

    it('seek() should not post 'seek' message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.seek(1.0);
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });

    it('setPitchSemitones() should post 'setPitch' message', () => {
      const semitones = -2;
      node.setPitchSemitones(semitones);
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'setPitch', semitones });
    });

    it('setPitchSemitones() should not post message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.setPitchSemitones(-2);
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });

    it('setTempo() should post 'setTempo' message', () => {
      const tempo = 1.5;
      node.setTempo(tempo);
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'setTempo', tempo });
    });

    it('setTempo() should not post message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.setTempo(1.5);
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });
    
    it('flush() should post 'flush' message', () => {
      node.flush();
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'flush' });
    });

    it('flush() should not post message if not loaded', () => {
      (node as any)._isLoaded = false;
      node.flush();
      expect(port.postMessage).not.toHaveBeenCalled();
      (node as any)._isLoaded = true;
    });
  });

  describe('Getters', () => {
    let node: SoundTouchNode;
    let port: MockMessagePort;

    beforeEach(async () => {
      node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      const lastMockNodeConstruction = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length - 1];
      port = lastMockNodeConstruction.value.port as MockMessagePort;
    });

    it('currentTime should return the internal _currentTime value', () => {
      const testTime = 10.5;
      (node as any)._currentTime = testTime; // Manually set for testing getter
      expect(node.currentTime).toBe(testTime);
    });

    it('duration should return the internal _duration value, initially from AudioBuffer', () => {
      expect(node.duration).toBe(mockAudioBuffer.duration);
    });

    it('duration should update after 'loaded' message from worklet', () => {
      const workletDuration = 99.9;
      port.onmessage?.(new MessageEvent('message', { data: { type: 'loaded', duration: workletDuration } }));
      expect(node.duration).toBe(workletDuration);
    });

    it('isPlaying should return the internal _isPlaying value', () => {
      expect(node.isPlaying).toBe(false); // Default
      (node as any)._isPlaying = true;
      expect(node.isPlaying).toBe(true);
    });

    it('isLoaded should return the internal _isLoaded value', () => {
      expect(node.isLoaded).toBe(false); // Default before worklet confirms load
      port.onmessage?.(new MessageEvent('message', { data: { type: 'loaded', duration: mockAudioBuffer.duration } }));
      expect(node.isLoaded).toBe(true);
    });
  });

  describe('dispose()', () => {
    let node: SoundTouchNode;
    let port: MockMessagePort;
    let disconnectSpy: any;

    beforeEach(async () => {
      node = await SoundTouchNode.create(mockAudioContext, mockAudioBuffer);
      const lastMockNodeConstruction = AudioWorkletNodeMock.mock.results[AudioWorkletNodeMock.mock.results.length - 1];
      port = lastMockNodeConstruction.value.port as MockMessagePort;
      disconnectSpy = lastMockNodeConstruction.value.disconnect; // Spy on the instance's disconnect
    });

    it('should post 'stop' message to worklet', () => {
      node.dispose();
      expect(port.postMessage).toHaveBeenCalledWith({ type: 'stop' });
    });

    it('should close the port', () => {
      node.dispose();
      expect(port.close).toHaveBeenCalledOnce();
    });

    it('should call disconnect on the node', () => {
      node.dispose();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    });

    it('should reset isLoaded and isPlaying flags', () => {
      // Set them to true first
      port.onmessage?.(new MessageEvent('message', { data: { type: 'loaded', duration: mockAudioBuffer.duration } }));
      (node as any)._isPlaying = true;
      expect(node.isLoaded).toBe(true);
      expect(node.isPlaying).toBe(true);

      node.dispose();

      expect(node.isLoaded).toBe(false);
      expect(node.isPlaying).toBe(false);
    });
  });

  // Next: Getters, dispose()
}); 