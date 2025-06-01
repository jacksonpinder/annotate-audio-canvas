import WaveSurfer from 'wavesurfer.js';
import { ctx, readyWorklet } from '../audioContext';

export async function makePlayer(file: File, mount: HTMLElement) {
await readyWorklet();

// decode + visual
const buf = await ctx.decodeAudioData(await file.arrayBuffer());
const ws = WaveSurfer.create({
container: mount,
waveColor: '#9ca3af',
progressColor: '#2563eb',
normalize: true,
backend: 'MediaElement'
});
ws.loadBlob(file);

// DSP graph
const src  = (ctx as any).createBufferSource();
src.buffer = buf;

const st   = new AudioWorkletNode(ctx as any, 'soundtouch-processor');
const pan  = (ctx as any).createStereoPanner();
const gain = (ctx as any).createGain();

(src as any).connect(st).connect(pan).connect(gain).connect((ctx as any).destination);

// public API
return {
play: () => src.start(),
stop: () => src.stop(),
seek: (sec: number) =>
ws.seekTo(Math.max(0, sec) / buf.duration),
skip: (delta = 15) =>
ws.seekTo(
Math.max(0, (ws.getCurrentTime() + delta) / buf.duration)
),
loop: (on: boolean) => (src.loop = on),
setPitch: (semi: number) =>
st.parameters.get('pitchSemitones')!.value = semi,
setTempo: (ratio: number) =>
st.parameters.get('tempo')!.value = ratio,
setBalance: (val: number) => (pan.pan.value = val),
setVolume: (val: number) => (gain.gain.value = val)
};
} 