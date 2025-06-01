// import { AudioContext } from 'standardized-audio-context'; // DELETE THIS

// src/audioContext.ts  – the only place you create a context
export const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

export async function readyWorklet() {
  try {
    // Load the worklet from the path configured in vite.config.ts -> viteStaticCopy
    await ctx.audioWorklet.addModule('/assets/worklets/soundtouch-worklet.js');
    console.log('AudioContext: SoundTouch worklet loaded successfully');
  } catch (error) {
    console.error('AudioContext: Error loading SoundTouch worklet:', error);
    
    // Fallback - try original path if using older version
    try {
      console.log('AudioContext: Trying fallback worklet path');
      await ctx.audioWorklet.addModule('/soundtouch-worklet.js');
      console.log('AudioContext: SoundTouch worklet loaded via fallback path');
    } catch (fallbackError) {
      console.error('AudioContext: All worklet load attempts failed:', fallbackError);
      throw new Error('Failed to load SoundTouch worklet');
    }
  }

  // Quick sanity check:
  console.log('Is ctx a native AudioContext instance?', ctx instanceof (window.AudioContext || (window as any).webkitAudioContext));
} 