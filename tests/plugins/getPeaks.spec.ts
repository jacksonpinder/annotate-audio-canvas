import { describe, it, expect, vi } from 'vitest';
import { getPeaks } from '../../src/plugins/getPeaks';

// Helper to create a mock AudioBuffer
class MockAudioBuffer implements Partial<AudioBuffer> {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channelData: Float32Array[];

  constructor(channelData: Float32Array[], sampleRate = 44100) {
    this.numberOfChannels = channelData.length;
    this.length = channelData.length > 0 ? channelData[0].length : 0;
    this.sampleRate = sampleRate;
    this.channelData = channelData;
  }

  getChannelData = vi.fn((channelIndex: number): Float32Array => {
    if (channelIndex < 0 || channelIndex >= this.channelData.length) {
      throw new Error('Invalid channel index');
    }
    return this.channelData[channelIndex];
  });

  // Add other AudioBuffer methods if needed by the function under test, though getPeaks primarily uses the above.
  duration = this.length / this.sampleRate;
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

describe('getPeaks', () => {
  it('should return empty peak arrays for a zero-length mono AudioBuffer', () => {
    const emptyChannel = new Float32Array(0);
    const mockBuffer = new MockAudioBuffer([emptyChannel]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer);
    expect(peaks).toEqual([[], []]);
  });

  it('should return empty peak arrays for a zero-length stereo AudioBuffer', () => {
    const emptyChannel1 = new Float32Array(0);
    const emptyChannel2 = new Float32Array(0);
    const mockBuffer = new MockAudioBuffer([emptyChannel1, emptyChannel2]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer);
    expect(peaks).toEqual([[], []]);
  });

  it('should handle mono input shorter than samplesPerPixel', () => {
    const data = new Float32Array([0.1, 0.5, -0.2, 0.3]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 1000); // samplesPerPixel > data.length
    expect(peaks.length).toBe(2); // Stereo output
    expect(peaks[0]).toEqual([-0.2, 0.5]); // [min, max]
    expect(peaks[1]).toEqual([-0.2, 0.5]); // Duplicated for mono
  });

  it('should handle mono input equal to samplesPerPixel', () => {
    const data = new Float32Array([0.1, -0.1, 0.5, -0.5, 0.2]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 5); // samplesPerPixel === data.length
    expect(peaks[0]).toEqual([-0.5, 0.5]);
    expect(peaks[1]).toEqual([-0.5, 0.5]);
  });

  it('should handle mono input with length > samplesPerPixel (not multiple)', () => {
    // 7 samples, samplesPerPixel = 3. Should be 2 pairs from full chunks, 1 from remainder.
    // Chunk 1 (0,1,2): [0.1, 0.2, 0.3] -> min 0.1, max 0.3
    // Chunk 2 (3,4,5): [-0.1, -0.2, -0.3] -> min -0.3, max -0.1
    // Remainder (6): [0.5] -> min 0.5, max 0.5
    const data = new Float32Array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3, 0.5]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 3);
    expect(peaks[0]).toEqual([0.1, 0.3, -0.3, -0.1, 0.5, 0.5]);
    expect(peaks[1]).toEqual([0.1, 0.3, -0.3, -0.1, 0.5, 0.5]);
  });

  it('should handle mono input with length as a multiple of samplesPerPixel', () => {
    // 6 samples, samplesPerPixel = 3. Should be 2 pairs.
    // Chunk 1: [0.1, 0.2, 0.3] -> min 0.1, max 0.3
    // Chunk 2: [-0.1, -0.2, -0.3] -> min -0.3, max -0.1
    const data = new Float32Array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 3);
    expect(peaks[0]).toEqual([0.1, 0.3, -0.3, -0.1]);
    expect(peaks[1]).toEqual([0.1, 0.3, -0.3, -0.1]);
  });

  it('should handle stereo input shorter than samplesPerPixel', () => {
    const leftData = new Float32Array([0.1, 0.5, -0.2]);
    const rightData = new Float32Array([-0.1, -0.5, 0.2]);
    const mockBuffer = new MockAudioBuffer([leftData, rightData]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 1000);
    expect(peaks.length).toBe(2);
    expect(peaks[0]).toEqual([-0.2, 0.5]);
    expect(peaks[1]).toEqual([-0.5, 0.2]);
  });

  it('should handle stereo input with different values and lengths (aligned by samplesPerPixel)', () => {
    // Left: 6 samples, Right: 6 samples. samplesPerPixel = 3.
    // Left Ch1: [0.1, 0.2, 0.3] -> min 0.1, max 0.3
    // Left Ch2: [-0.1, -0.2, -0.3] -> min -0.3, max -0.1
    // Right Ch1: [0.4, 0.5, 0.6] -> min 0.4, max 0.6
    // Right Ch2: [-0.4, -0.5, -0.6] -> min -0.6, max -0.4
    const leftData = new Float32Array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3]);
    const rightData = new Float32Array([0.4, 0.5, 0.6, -0.4, -0.5, -0.6]);
    const mockBuffer = new MockAudioBuffer([leftData, rightData]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 3);
    expect(peaks[0]).toEqual([0.1, 0.3, -0.3, -0.1]);
    expect(peaks[1]).toEqual([0.4, 0.6, -0.6, -0.4]);
  });

  it('should calculate correct number of peak pairs based on samplesPerPixel', () => {
    const data = new Float32Array(10000); // 10000 samples
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    
    let peaks = getPeaks(mockBuffer, 1000); // 10000 / 1000 = 10 pairs
    expect(peaks[0].length).toBe(10 * 2); // 10 min, 10 max

    peaks = getPeaks(mockBuffer, 500); // 10000 / 500 = 20 pairs
    expect(peaks[0].length).toBe(20 * 2);
    
    peaks = getPeaks(mockBuffer, 10001); // 10000 / 10001 = 0 full pairs, 1 partial -> 1 pair
    expect(peaks[0].length).toBe(1 * 2);

    peaks = getPeaks(mockBuffer, 9999); // 10000 / 9999 = 1 full pair, 1 partial -> 2 pairs
    expect(peaks[0].length).toBe(2*2);
  });

  it('should handle an AudioBuffer with a very small number of samples (less than 1)', () => {
    // This case might not be realistic for AudioBuffer but tests robustness
    const data = new Float32Array([]); // Effectively zero length handled by earlier tests
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 1000);
    expect(peaks).toEqual([[],[]]);
  });

   it('should correctly process a mono buffer with exactly samplesPerPixel elements when samplesPerPixel is 1', () => {
    const data = new Float32Array([0.7]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 1);
    expect(peaks[0]).toEqual([0.7, 0.7]);
    expect(peaks[1]).toEqual([0.7, 0.7]);
  });

  it('should correctly process a mono buffer with multiple elements when samplesPerPixel is 1', () => {
    const data = new Float32Array([0.1, -0.2, 0.3]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 1);
    // Expects [0.1, 0.1, -0.2, -0.2, 0.3, 0.3]
    expect(peaks[0]).toEqual([0.1, 0.1, -0.2, -0.2, 0.3, 0.3]);
    expect(peaks[1]).toEqual([0.1, 0.1, -0.2, -0.2, 0.3, 0.3]);
  });

  it('should handle buffer with all zero samples', () => {
    const data = new Float32Array([0, 0, 0, 0, 0]);
    const mockBuffer = new MockAudioBuffer([data]) as AudioBuffer;
    const peaks = getPeaks(mockBuffer, 2);
    // Chunk1: [0,0] -> min 0, max 0
    // Chunk2: [0,0] -> min 0, max 0
    // Rem: [0] -> min 0, max 0
    expect(peaks[0]).toEqual([0,0, 0,0, 0,0]);
    expect(peaks[1]).toEqual([0,0, 0,0, 0,0]);
  });

}); 