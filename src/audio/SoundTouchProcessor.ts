/// <reference lib="webworker" />
/// <reference lib="DOM" />

// Temporary fix for soundtouchjs types - proper solution is to ensure type definitions are installed and discoverable.
// declare module 'soundtouchjs'; // Commenting out, as proper type installation is preferred.

import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

// Add type declarations for AudioWorklet globals
declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};
declare var registerProcessor: (name: string, processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor) => void;
declare var sampleRate: number;

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

interface AudioWorkletGlobalScope {
  sampleRate: number;
}

declare var globalThis: AudioWorkletGlobalScope;

interface SoundTouchProcessorOptions extends AudioWorkletNodeOptions {
  processorOptions?: {
    // Define any options you might pass during construction
  };
}

class SoundTouchProcessor extends AudioWorkletProcessor {
  private soundtouch: SoundTouch;
  private processorSampleRate: number;
  private source: WebAudioBufferSource | null;
  private filter: SimpleFilter | null;
  private isPlaying: boolean;
  private isSourceSet: boolean;
  private eofReached: boolean;
  private totalFramesProcessed: number;
  private soundtouchOutputBuffer: Float32Array;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    this.soundtouch = new SoundTouch();

    // --- quality tweaks ---
    this.soundtouch.useIdealFFT   = true;   // cleaner HF content
    this.soundtouch.fftFrameSize  = 2048;   // longer window
    this.soundtouch.sequenceMs    = 50;     // bigger overlap block
    this.soundtouch.seekWindowMs  = 25;     // overlap search
    // -----------------------

    this.processorSampleRate = globalThis.sampleRate;
    this.source = null;
    this.filter = null;
    this.isPlaying = false;
    this.isSourceSet = false;
    this.eofReached = false;
    this.totalFramesProcessed = 0;
    this.soundtouchOutputBuffer = new Float32Array(128 * 2);

    this.port.onmessage = (event) => {
      const { type, ...data } = event.data;
      try {
        switch (type) {
          case 'loadData': {
            const { channelData, sampleRate: newSampleRate } = data;
            if (!channelData || channelData.length !== 2 || !channelData[0] || !channelData[1]) {
              this.port.postMessage({ type: 'error', message: 'loadData: Invalid channelData provided.' });
              return;
            }
            this.processorSampleRate = newSampleRate;

            // Create a buffer that matches the format WebAudioBufferSource expects
            const buffer = {
              numberOfChannels: 2,
              sampleRate: this.processorSampleRate,
              getChannelData: (channel: number) => {
                return channelData[channel];
              },
              duration: channelData[0].length / this.processorSampleRate
            };

            this.source = new WebAudioBufferSource(buffer);
            this.filter = new SimpleFilter(this.source, this.soundtouch);
            this.isSourceSet = true;
            this.eofReached = false;
            this.totalFramesProcessed = 0;
            this.soundtouch.clear();

            console.log('SoundTouchProcessor: Data loaded, sampleRate:', this.processorSampleRate, 'channels:', 2, 'length:', channelData[0].length);
            this.port.postMessage({ type: 'loaded', duration: channelData[0].length / this.processorSampleRate });
            break;
          }
          case 'setPitch': {
            const { semitones } = data;
            this.soundtouch.pitchSemitones = semitones;
            console.log('SoundTouchProcessor: Pitch set to', semitones);
            break;
          }
          case 'setTempo': {
            const { tempo } = data;
            this.soundtouch.tempo = tempo;
            console.log('SoundTouchProcessor: Tempo set to', tempo);
            break;
          }
          case 'seek': {
            const { positionFrames } = data;
            if (this.source && this.filter) {
              this.filter.clear();
              this.totalFramesProcessed = Math.max(0, Math.floor(positionFrames));
              this.eofReached = false;
              console.log('SoundTouchProcessor: Seek to frame', this.totalFramesProcessed);
              this.port.postMessage({ type: 'seeked', newPositionFrames: this.totalFramesProcessed });
            } else {
              this.port.postMessage({ type: 'error', message: 'seek: Source not set.' });
            }
            break;
          }
          case 'play':
            this.isPlaying = true;
            console.log('SoundTouchProcessor: Play');
            this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying });
            break;
          case 'pause':
            this.isPlaying = false;
            console.log('SoundTouchProcessor: Pause');
            this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying });
            break;
          case 'stop':
            this.isPlaying = false;
            if (this.source && this.filter) {
              this.filter.clear();
              this.totalFramesProcessed = 0;
              this.eofReached = false;
            }
            console.log('SoundTouchProcessor: Stop');
            this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying, currentTime: 0 });
            this.port.postMessage({ type: 'timeupdate', currentTime: 0 });
            break;
          case 'flush':
            if (this.soundtouch) {
              this.soundtouch.flush();
            }
            if (this.filter) {
              this.filter.clear();
            }
            console.log('SoundTouchProcessor: Flushed');
            break;
          default:
            console.warn('SoundTouchProcessor: Unknown message type received:', type);
            this.port.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
        }
      } catch (e) {
        console.error('SoundTouchProcessor: Error in onmessage:', e);
        this.port.postMessage({ type: 'error', message: `onmessage error: ${e instanceof Error ? e.message : String(e)}` });
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    if (!this.isPlaying || !this.isSourceSet || !this.filter || this.eofReached) {
      if (outputs[0] && outputs[0][0] && outputs[0][1]) {
        outputs[0][0].fill(0);
        outputs[0][1].fill(0);
      }
      return true;
    }

    const outputChannelLeft = outputs[0][0];
    const outputChannelRight = outputs[0][1];
    const numFramesToProcess = outputChannelLeft.length;

    try {
      if (this.soundtouchOutputBuffer.length < numFramesToProcess * 2) {
        this.soundtouchOutputBuffer = new Float32Array(numFramesToProcess * 2);
      }
      
      const framesExtracted = this.filter.extract(this.soundtouchOutputBuffer, numFramesToProcess);

      if (framesExtracted === 0) {
        this.eofReached = true;
        this.isPlaying = false;
        this.port.postMessage({ type: 'ended' });
        this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying });
        outputChannelLeft.fill(0);
        outputChannelRight.fill(0);
        return true;
      }

      for (let i = 0; i < framesExtracted; i++) {
        outputChannelLeft[i] = this.soundtouchOutputBuffer[i * 2];
        outputChannelRight[i] = this.soundtouchOutputBuffer[i * 2 + 1];
      }
      
      if (framesExtracted < numFramesToProcess) {
        for (let i = framesExtracted; i < numFramesToProcess; i++) {
          outputChannelLeft[i] = 0;
          outputChannelRight[i] = 0;
        }
      }

      this.totalFramesProcessed += framesExtracted;
      this.port.postMessage({
        type: 'timeupdate',
        currentTime: this.totalFramesProcessed / this.processorSampleRate,
      });
    } catch (e) {
      console.error('SoundTouchProcessor: Error in process method:', e);
      this.port.postMessage({ type: 'error', message: `Process error: ${e instanceof Error ? e.message : String(e)}` });
      outputChannelLeft.fill(0);
      outputChannelRight.fill(0);
      return true;
    }

    return true;
  }
}

// registerProcessor must be called at the top level, not inside any try-catch from previous versions.
registerProcessor('soundtouch-processor', SoundTouchProcessor);

// Mark file as a module for Vite and for import.meta.url to work if it were ever used here (though not typical for a processor file).
// This also helps ensure it's treated as an ES module scope by TypeScript.
// export {}; 