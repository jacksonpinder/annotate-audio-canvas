// Make sure AudioWorkletNode is recognized globally or import if necessary
// For standard browser environments, it should be globally available.

import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

// Ensure this file is treated as a module for import.meta.url
export {};

/**
 * Represents the events dispatched by SoundTouchNode.
 */
export interface SoundTouchNodeEventMap extends AudioWorkletNodeEventMap {
  "loaded": CustomEvent<{ duration: number }>;
  "timeupdate": CustomEvent<{ currentTime: number }>;
  "ended": CustomEvent<void>;
  "error": CustomEvent<{ message: string }>;
  "statechange": CustomEvent<{ isPlaying: boolean }>;
  "seeked": CustomEvent<{ currentTime: number }>;
}

/**
 * SoundTouchNode wraps the SoundTouchProcessor AudioWorklet.
 * It handles loading the worklet, communication, and provides a higher-level API.
 */
export class SoundTouchNode extends AudioWorkletNode {
  private audioBuffer: AudioBuffer;
  private _isPlaying = false;
  private _currentTime = 0;
  private _duration = 0;
  private _isLoaded = false;

  // Store the URL for the processor for potential re-use or debugging
  private static workletModuleAdded = false;

  /**
   * Asynchronously creates and initializes a SoundTouchNode.
   * This method handles adding the AudioWorklet module if it hasn't been added yet.
   * @param context The AudioContext to create the node in.
   * @param audioBuffer The initial AudioBuffer to load into the processor.
   * @returns A Promise that resolves with the created SoundTouchNode instance.
   */
  public static async create(context: AudioContext, audioBuffer: AudioBuffer): Promise<SoundTouchNode> {
    if (!SoundTouchNode.workletModuleAdded) {
      try {
        // Use the bundled worklet from the public directory
        const processorUrl = '/worklets/soundtouch-processor.js';
        
        console.log(`SoundTouchNode: Adding module from URL: ${processorUrl}`);
        await context.audioWorklet.addModule(processorUrl);
        SoundTouchNode.workletModuleAdded = true;
        console.log('SoundTouchNode: AudioWorklet module added successfully ✅');
      } catch (e) {
        console.error('SoundTouchNode: Error adding AudioWorklet module:', e);
        throw new Error(`Failed to load SoundTouchProcessor module: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    try {
      const node = new SoundTouchNode(context, audioBuffer);
      return node;
    } catch (e) {
      console.error('SoundTouchNode: Error creating SoundTouchNode instance:', e);
      throw new Error(`Failed to create SoundTouchNode: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private constructor(context: AudioContext, audioBuffer: AudioBuffer) {
    super(context, 'soundtouch-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2], // Ensure stereo output
      processorOptions: { /* initial options if any */ }
    });
    console.log('SoundTouchNode: Constructor called, node created.');

    this.audioBuffer = audioBuffer;
    this._duration = audioBuffer.duration; // Initial duration from buffer, worklet will confirm

    this.port.onmessage = (event) => {
      const { type, ...data } = event.data;
      switch (type) {
        case 'loaded':
          this._isLoaded = true;
          this._duration = data.duration as number;
          this.dispatchEvent(new CustomEvent('loaded', { detail: { duration: this._duration } }));
          console.log('SoundTouchNode: Worklet reported data loaded, duration:', this._duration);
          break;
        case 'timeupdate':
          this._currentTime = data.currentTime as number;
          this.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime: this._currentTime } }));
          break;
        case 'ended':
          this._isPlaying = false;
          // this._currentTime = this._duration; // Optionally set current time to duration on end
          this.dispatchEvent(new CustomEvent('ended'));
          console.log('SoundTouchNode: Worklet reported ended.');
          break;
        case 'error':
          console.error('SoundTouchNode: Error from worklet:', data.message);
          this.dispatchEvent(new CustomEvent('error', { detail: { message: data.message as string } }));
          break;
        case 'stateChange':
          this._isPlaying = data.isPlaying as boolean;
          this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: this._isPlaying } }));
          console.log('SoundTouchNode: Worklet reported stateChange, isPlaying:', this._isPlaying);
          break;
        case 'seeked':
          // The worklet confirms the new position in frames, convert back to seconds
          this._currentTime = (data.newPositionFrames as number) / this.audioBuffer.sampleRate;
          this.dispatchEvent(new CustomEvent('seeked', { detail: { currentTime: this._currentTime } }));
          console.log('SoundTouchNode: Worklet reported seeked to time:', this._currentTime);
          break;
        default:
          console.warn('SoundTouchNode: Received unknown message type from worklet:', type);
      }
    };

    // Handle errors on the port itself (e.g., if the worklet crashes)
    this.port.onmessageerror = (event) => {
      console.error('SoundTouchNode: Message error on port:', event);
      this.dispatchEvent(new CustomEvent('error', { detail: { message: 'MessagePort communication error' } }));
    };

    this._loadDataToWorklet(this.audioBuffer);
  }

  private _loadDataToWorklet(audioBuffer: AudioBuffer): void {
    if (audioBuffer.numberOfChannels < 1) {
        const msg = 'AudioBuffer has no channels.';
        console.error("SoundTouchNode: " + msg);
        this.dispatchEvent(new CustomEvent('error', { detail: { message: msg } }));
        return;
    }

    const leftChannel = audioBuffer.getChannelData(0);
    // For mono, create a new copy of channel 0 for the right channel
    // This ensures we have separate ArrayBuffers that can be transferred
    const rightChannel = audioBuffer.numberOfChannels > 1 
      ? audioBuffer.getChannelData(1) 
      : new Float32Array(leftChannel);

    // Build transfer list with unique ArrayBuffers
    const transferable: Transferable[] = [leftChannel.buffer];
    // Only add right channel buffer if it's different from left
    if (rightChannel.buffer !== leftChannel.buffer) {
      transferable.push(rightChannel.buffer);
    }
    
    this.port.postMessage(
      {
        type: 'loadData',
        channelData: [leftChannel, rightChannel],
        sampleRate: audioBuffer.sampleRate,
      },
      transferable
    );
    console.log('SoundTouchNode: Sent loadData to worklet.');
  }

  // Public control methods
  public play(): void {
    if (!this._isLoaded) {
      console.warn('SoundTouchNode: Play called before data is loaded in worklet.');
      return;
    }
    if (this.context.state === 'suspended') {
        this.context.resume().then(() => {
            console.log('SoundTouchNode: AudioContext resumed.');
            this.port.postMessage({ type: 'play' });
        }).catch(err => {
            console.error('SoundTouchNode: Error resuming AudioContext:', err);
            this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Failed to resume AudioContext'} }));
        });
    } else {
        this.port.postMessage({ type: 'play' });
    }
  }

  public pause(): void {
    if (!this._isLoaded) return;
    this.port.postMessage({ type: 'pause' });
  }

  public stop(): void {
    if (!this._isLoaded) return;
    this.port.postMessage({ type: 'stop' });
    // Current time is reset by worklet's 'stop' and confirmed via 'timeupdate' or 'stateChange' message
  }

  public seek(timeInSeconds: number): void {
    if (!this._isLoaded) {
      console.warn('SoundTouchNode: Seek called before data is loaded.');
      return;
    }
    const positionFrames = Math.max(0, timeInSeconds * this.audioBuffer.sampleRate);
    this.port.postMessage({ type: 'seek', positionFrames });
    // Optimistically update current time, or wait for 'seeked' event from worklet
    // For now, we wait for 'seeked' or 'timeupdate' from worklet.
    // this._currentTime = timeInSeconds;
    // this.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime: this._currentTime } }));
  }

  public setPitchSemitones(semitones: number): void {
    if (!this._isLoaded) return;
    this.port.postMessage({ type: 'setPitch', semitones });
  }

  public setTempo(tempo: number): void {
    if (!this._isLoaded) return;
    this.port.postMessage({ type: 'setTempo', tempo });
  }
  
  public flush(): void {
    if (!this._isLoaded) return;
    this.port.postMessage({ type: 'flush' });
  }

  // Public getters
  public get currentTime(): number {
    return this._currentTime;
  }

  public get duration(): number {
    return this._duration;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  /**
   * Disconnects the node and cleans up resources.
   */
  public dispose(): void {
    console.log('SoundTouchNode: Disposing...');
    if (this.port) {
        // Optionally send a specific message to the worklet to clean up its resources
        // this.port.postMessage({ type: 'dispose' }); 
        // Though 'stop' and clearing buffers might be enough if worklet is stateless on demand.
        this.port.postMessage({ type: 'stop'}); // Ensure it stops processing
        this.port.close();
    }
    this.disconnect(); // Disconnect from audio graph
    // Any other cleanup specific to SoundTouchNode itself
    this._isLoaded = false;
    this._isPlaying = false;
     console.log('SoundTouchNode: Disposed.');
  }

  // Type-safe addEventListener and removeEventListener
  public addEventListener<K extends keyof SoundTouchNodeEventMap>(
    type: K,
    listener: (this: AudioWorkletNode, ev: SoundTouchNodeEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type as string, listener as EventListener, options);
  }

  public removeEventListener<K extends keyof SoundTouchNodeEventMap>(
    type: K,
    listener: (this: AudioWorkletNode, ev: SoundTouchNodeEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type as string, listener as EventListener, options);
  }
} 