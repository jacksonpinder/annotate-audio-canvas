declare module 'soundtouchjs' {
    export class SoundTouch {
        constructor();
        pitchSemitones: number;
        rate: number;
        tempo: number;
        clear(): void;
        flush(): void;
        // Add other methods/properties if known and needed
    }

    export class SimpleSource {
        constructor();
        buffer: Float32Array; // Or ArrayBuffer, or appropriate type
        sampleRate: number;
        numChannels: number;
        // Add other methods/properties if known and needed
        // e.g., seek(position: number): void;
    }

    export class WebAudioBufferSource { // Keep this in case it's still used or for reference
        constructor(buffer: any);
        // Add other methods/properties if known and needed
    }

    export class SimpleFilter {
        constructor(source: SimpleSource | WebAudioBufferSource, soundtouch: SoundTouch);
        extract(target: Float32Array, numFrames: number): number;
        clear(): void;
        // Add other methods/properties if known and needed
    }

    // Add other exports if known (FIFOSampleBuffer, etc.)
} 