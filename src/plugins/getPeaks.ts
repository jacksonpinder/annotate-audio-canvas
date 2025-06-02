/**
 * Generates peak data for a waveform display from an AudioBuffer.
 *
 * @param buffer The AudioBuffer containing the audio data.
 * @param samplesPerPixel The number of samples to process for each min/max peak pair.
 *                        Determines the resolution of the generated peaks.
 * @returns A 2D array where:
 *          - The outer array has two elements: one for the left channel peaks, one for the right.
 *          - Each inner array contains [min, max, min, max, ...] peak values for that channel.
 *          - If the input buffer is mono, the peak data is duplicated for both channels.
 *          - Peak values are normalized between -1 and 1 (as they are in a Float32Array from an AudioBuffer).
 */
export function getPeaks(buffer: AudioBuffer, samplesPerPixel = 1000): number[][] {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate; // Not directly used in calculation but good to have contextually

  if (length === 0) {
    return numChannels === 1 ? [[], []] : [[], []]; // Return empty peaks for both channels
  }

  const outputPeaks: number[][] = [];

  for (let channelIndex = 0; channelIndex < (numChannels === 1 ? 1 : 2) ; channelIndex++) {
    const channelData = buffer.getChannelData(channelIndex);
    const numPeakPairs = Math.floor(channelData.length / samplesPerPixel);
    const currentChannelPeaks: number[] = [];

    if (channelData.length === 0) {
        outputPeaks.push([]);
        continue;
    }

    for (let i = 0; i < numPeakPairs; i++) {
      const startIndex = i * samplesPerPixel;
      // .subarray does not copy, it creates a view. End index is exclusive.
      const endIndex = startIndex + samplesPerPixel; //chunk will have length samplesPerPixel
      const chunk = channelData.subarray(startIndex, endIndex);

      let minPeak = 1.0;
      let maxPeak = -1.0;

      // Fast loop over the chunk
      for (let j = 0; j < chunk.length; j++) {
        const sample = chunk[j];
        if (sample < minPeak) {
          minPeak = sample;
        }
        if (sample > maxPeak) {
          maxPeak = sample;
        }
      }
      currentChannelPeaks.push(minPeak, maxPeak);
    }
    
    // Handle the last partial chunk or if total samples < samplesPerPixel
    const remainingSamplesStartIndex = numPeakPairs * samplesPerPixel;
    if (remainingSamplesStartIndex < channelData.length) { 
      const chunk = channelData.subarray(remainingSamplesStartIndex, channelData.length);
      if (chunk.length > 0) {
          let minPeak = 1.0;
          let maxPeak = -1.0;
          for (let j = 0; j < chunk.length; j++) {
              const sample = chunk[j];
              if (sample < minPeak) {
                  minPeak = sample;
              }
              if (sample > maxPeak) {
                  maxPeak = sample;
              }
          }
          currentChannelPeaks.push(minPeak, maxPeak);
      }
    }

    outputPeaks.push(currentChannelPeaks);
  }

  // If the input was mono, duplicate the first channel's peaks for the second channel
  if (numChannels === 1 && outputPeaks.length > 0) {
    outputPeaks.push([...outputPeaks[0]]);
  }
   // Ensure stereo output even if mono input had zero length resulting in [[],[]]
  if (outputPeaks.length === 1 && numChannels === 1) {
      if(outputPeaks[0].length === 0) { // if mono produced no peaks (e.g. length 0)
          outputPeaks.push([]);
      } else {
          outputPeaks.push([...outputPeaks[0]]); // Should have been caught by above, but as safety
      }
  } else if (outputPeaks.length === 0 && numChannels === 0) { // Should not happen with valid AudioBuffer
      return [[],[]];
  }


  return outputPeaks;
} 