/// <reference lib="webworker" />
/// <reference lib="DOM" />

// Temporary fix for soundtouchjs types - proper solution is to ensure type definitions are installed and discoverable.
// declare module 'soundtouchjs'; // Commenting out, as proper type installation is preferred.

import { SoundTouch, SimpleFilter, SimpleSource } from 'soundtouchjs';

// The following globals are expected to be available in AudioWorkletGlobalScope:
// - AudioWorkletProcessor class
// - registerProcessor function
// - currentFrame (number)
// - sampleRate (number)
// TypeScript should provide these via lib "DOM" or "WebWorker".

interface SoundTouchProcessorOptions extends AudioWorkletNodeOptions {
  processorOptions?: {
    // Define any options you might pass during construction
  };
}

class SoundTouchProcessor extends AudioWorkletProcessor {
  private soundtouch: SoundTouch;
  private source: SimpleSource | null = null;
  private filter: SimpleFilter | null = null;
  
  private isPlaying = false;
  private isSourceSet = false;
  private eofReached = false;
  private totalFramesProcessed = 0;
  private processorSampleRate: number; // Renamed to avoid conflict with global sampleRate

  // Buffer for SoundTouch to extract into. Max 128 frames, 2 channels.
  private soundtouchOutputBuffer: Float32Array = new Float32Array(128 * 2); 
  // Buffer to hold one of the input channels for SoundTouch source creation.
  // Size this appropriately if needed, or create dynamically.
  // For now, we assume WebAudioBufferSource takes an object with channel data directly.
  private inputChannelData: [Float32Array, Float32Array] | null = null;


  constructor(options?: SoundTouchProcessorOptions) {
    super(options);
    this.processorSampleRate = globalThis.sampleRate; // Reverted: Get sample rate from global scope in worklet
    this.soundtouch = new SoundTouch();

    this.port.onmessage = (event) => {
      const { type, ...data } = event.data;
      try {
        switch (type) {
          case 'loadData': {
            const { channelData, sampleRate: newSampleRate } = data as { channelData: [Float32Array, Float32Array], sampleRate: number };
            if (!channelData || channelData.length !== 2 || !channelData[0] || !channelData[1]) {
              this.port.postMessage({ type: 'error', message: 'loadData: Invalid channelData provided.' });
              return;
            }
            this.processorSampleRate = newSampleRate; // Update sample rate if provided
            
            // soundtouchjs WebAudioBufferSource expects an object similar to an AudioBuffer
            // with getChannelData method and numberOfChannels property.
            const audioBufferLike = {
              getChannelData: (i: number) => channelData[i],
              numberOfChannels: channelData.length,
              sampleRate: this.processorSampleRate,
              length: channelData[0].length // Assuming both channels have same length
            };

            // Assuming SimpleSource can be created from an object like this
            // This part might need adjustment based on SimpleSource's actual constructor/API
            // For now, creating a temporary buffer and feeding it, similar to potential SoundTouch examples
            const buffer = new Float32Array(channelData[0].length * 2);
            for (let i = 0; i < channelData[0].length; i++) {
                buffer[i*2] = channelData[0][i];
                buffer[i*2+1] = channelData[1][i];
            }
            this.source = new SimpleSource();
            this.source.buffer = buffer; 
            this.source.sampleRate = this.processorSampleRate; // Corrected from samplesPerPixel
            this.source.numChannels = 2; // Assuming stereo

            // this.source = new WebAudioBufferSource(audioBufferLike as any); // Use 'as any' for now if type mismatch -REPLACED
            this.filter = new SimpleFilter(this.source, this.soundtouch);
            
            this.isSourceSet = true;
            this.eofReached = false;
            this.totalFramesProcessed = 0;
            this.soundtouch.clear(); // Clear any previous effect states
            // this.soundtouch.sampleRate = this.processorSampleRate; // Set sample rate on SoundTouch instance
            // this.soundtouch.numChannels = audioBufferLike.numberOfChannels; // Set channels on SoundTouch instance

            console.log('SoundTouchProcessor: Data loaded, sampleRate:', this.processorSampleRate, 'channels:', 2, 'length:', channelData[0].length);
            this.port.postMessage({ type: 'loaded', duration: channelData[0].length / this.processorSampleRate });
            break;
          }
          case 'setPitch': {
            const { semitones } = data as { semitones: number };
            this.soundtouch.pitchSemitones = semitones;
            console.log('SoundTouchProcessor: Pitch set to', semitones);
            break;
          }
          case 'setTempo': {
            const { tempo } = data as { tempo: number };
            // soundtouchjs uses 'rate' for tempo/speed changes.
            // A tempo of 1.0 is normal speed. 1.5 is 50% faster. 0.5 is 50% slower.
            this.soundtouch.rate = tempo;
            console.log('SoundTouchProcessor: Tempo (rate) set to', tempo);
            break;
          }
          case 'seek': {
            const { positionFrames } = data as { positionFrames: number };
            if (this.source && this.filter) {
              // WebAudioBufferSource doesn't have a direct seek.
              // We need to re-create the source or filter with the new position.
              // The simplest way for now, if source allows seeking or re-initialization:
              // For WebAudioBufferSource, it processes the entire buffer.
              // Seeking means adjusting totalFramesProcessed and letting extract pull from new logical time.
              // More accurately, SoundTouch's SimpleFilter or the source needs to support seeking.
              // If not, we might need to re-feed data or manage position externally.
              // This is a known challenge with some SoundTouch wrappers.
              // For now, we'll adjust totalFramesProcessed and clear the filter.
              // SoundTouch itself doesn't maintain a playhead in the same way a player does;
              // it processes what it's fed.
              
              this.filter.clear(); // Clear any buffered/processed samples in the filter
              
              // If WebAudioBufferSource could be "reset" with an offset, that would be ideal.
              // For now, assume we are "seeking" by adjusting our processed frame count.
              // The next 'process' call will then request samples from this new logical time.
              // This is a simplified seek. True seeking might require more complex buffer management
              // or a source that supports it.
              // Let's assume for now that the filter will correctly provide data from the new position
              // after being cleared and the source's internal pointer *might* be implicitly managed
              // or that SoundTouch handles this when processing.
              // A more robust seek would be to create a new WebAudioBufferSource with an offset,
              // if the library supported it, or to slice the original AudioBuffer.
              // For now, we just adjust our counter and rely on the filter.
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
          case 'stop': // Stop is effectively pause + seek to 0
            this.isPlaying = false;
            if (this.source && this.filter) {
              this.filter.clear();
              this.totalFramesProcessed = 0;
              this.eofReached = false;
              // Consider if source needs explicit reset for 'stop'
            }
            console.log('SoundTouchProcessor: Stop');
            this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying, currentTime: 0 });
            this.port.postMessage({ type: 'timeupdate', currentTime: 0 }); // Explicitly send 0 time
            break;
          case 'flush': // Used to apply pitch/tempo changes immediately if they are buffered
            if (this.soundtouch) {
                this.soundtouch.flush();
            }
            if (this.filter) {
                this.filter.clear(); // Clear filter buffer to get fresh samples with new settings
            }
            console.log('SoundTouchProcessor: Flushed');
            break;
          default:
            console.warn('SoundTouchProcessor: Unknown message type received:', type);
            this.port.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
        }
      } catch (e: any) {
        console.error('SoundTouchProcessor: Error in onmessage:', e);
        this.port.postMessage({ type: 'error', message: `onmessage error: ${e.message || String(e)}` });
      }
    };
  }

  process(
    inputs: Float32Array[][], // Typically not used if we load the whole buffer
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    if (!this.isPlaying || !this.isSourceSet || !this.filter || this.eofReached) {
      // Output silence if not playing, not setup, or EOF
      if (outputs[0] && outputs[0][0] && outputs[0][1]) {
        outputs[0][0].fill(0);
        outputs[0][1].fill(0);
      }
      return true; // Keep processor alive
    }

    const outputChannelLeft = outputs[0][0];
    const outputChannelRight = outputs[0][1];
    const numFramesToProcess = outputChannelLeft.length; // Typically 128

    try {
      // SoundTouch SimpleFilter.extract processes stereo interleaved data.
      // We need to ensure soundtouchOutputBuffer is large enough.
      // It's pre-sized to 128 * 2.
      if (this.soundtouchOutputBuffer.length < numFramesToProcess * 2) {
          // This should not happen if numFramesToProcess is always 128
          this.soundtouchOutputBuffer = new Float32Array(numFramesToProcess * 2);
      }
      
      const framesExtracted = this.filter.extract(this.soundtouchOutputBuffer, numFramesToProcess);

      if (framesExtracted === 0) {
        this.eofReached = true;
        this.isPlaying = false; // Stop playing on EOF
        this.port.postMessage({ type: 'ended' });
        this.port.postMessage({ type: 'stateChange', isPlaying: this.isPlaying });
        outputChannelLeft.fill(0);
        outputChannelRight.fill(0);
        return true;
      }

      // De-interleave the stereo data from soundtouchOutputBuffer into output channels
      for (let i = 0; i < framesExtracted; i++) {
        outputChannelLeft[i] = this.soundtouchOutputBuffer[i * 2];
        outputChannelRight[i] = this.soundtouchOutputBuffer[i * 2 + 1];
      }
      
      // Fill remaining part of the output buffer with silence if fewer frames were extracted
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
    } catch (e: any) {
      console.error('SoundTouchProcessor: Error in process method:', e);
      this.port.postMessage({ type: 'error', message: `Process error: ${e.message || String(e)}` });
      // Output silence in case of error
      outputChannelLeft.fill(0);
      outputChannelRight.fill(0);
      return true; // Keep processor alive, but effectively stopped due to error
    }

    return true; // Keep processor alive
  }
}

// registerProcessor must be called at the top level, not inside any try-catch from previous versions.
registerProcessor('soundtouch-processor', SoundTouchProcessor);

// Mark file as a module for Vite and for import.meta.url to work if it were ever used here (though not typical for a processor file).
// This also helps ensure it's treated as an ES module scope by TypeScript.
// export {}; 