import { SoundTouchNode, type SoundTouchNodeEventMap } from './SoundTouchNode';
import { getPeaks } from '../plugins/getPeaks';
// import * as Tone from 'tone'; // Assuming Tone.js is being phased out here
// import { SoundTouchNode as LegacySoundTouchNodeAudioWorklet, type SoundTouchNodeMessage } from "@soundtouchjs/audio-worklet"; // Old import
import { throttle } from 'lodash';

// Add interface for webkitAudioContext if not already present globally by TypeScript DOM libs
interface Window {
    webkitAudioContext?: typeof AudioContext;
}

// Custom events that AudioService will dispatch
// Simpler event map for now to resolve linter errors, can be enhanced with more advanced TypeScript if needed.
interface AudioServiceEventDetailMap {
    'audiocontextstarted': void;
    'loaded': { duration: number; peaks: number[][]; fileUrl: string | null };
    'timeupdate': { currentTime: number };
    'ended': void;
    'error': { message: string; error?: any };
    'statechange': { isPlaying: boolean; playState: string };
    'pitchchange': { pitch: number };
    'speedchange': { speed: number };
    'volumechange': { volume: number };
    'panchange': { pan: number };
}

// console.log('AudioService.ts: Module loaded.'); // Removed Tone version log

/**
 * Converts semitones to a pitch ratio.
 * @param semitones - The number of semitones.
 * @returns The pitch ratio.
 */
function semitonesToRatio(semitones: number): number {
    return Math.pow(2, semitones / 12);
}

class AudioService extends EventTarget {
    private audioContext: AudioContext | null = null;
    private soundTouchNode: SoundTouchNode | null = null;
    private pannerNode: StereoPannerNode | null = null;
    private gainNode: GainNode | null = null;
    
    private masterGainNode: GainNode | null = null; // Optional: if further master control needed before destination

    private audioBuffer: AudioBuffer | null = null;
    private waveformPeaks: number[][] = [];

    private isAudioContextStarted: boolean = false;
    private currentFileUrl: string | null = null;
    
    // State properties (retained from original)
    private currentPitchSemitones: number = 0;
    private currentSpeedFactor: number = 1.0;
    private currentPan: number = 0;
    private currentVolume: number = 1.0; // Linear volume [0, 1]
    private internalCurrentTime: number = 0; // Updated by SoundTouchNode events
    private internalDuration: number = 0; // Updated by SoundTouchNode events or AudioBuffer
    private playState: 'stopped' | 'playing' | 'paused' = 'stopped';

    private isLoading: boolean = false;
    private isReadyForPlayback: boolean = false; // True when audio is loaded and STN is ready

    // Keep this for UI purposes if unlockAndInit is still relevant
    private readyPromise: Promise<boolean> | null = null; 

    // Default samples per pixel for peak generation (can be made configurable)
    private SAMPLES_PER_PEAK_PIXEL = 1024; 

    constructor() {
        super();
        console.log('AudioService: Constructor called.');
        // No limiter or other Tone.js specific setup here for now.
        // Initialization of nodes will happen during loadAudioFile.
    }

    public getAudioContext(): AudioContext | null {
        if (!this.audioContext) {
            try {
                const GlobalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (!GlobalAudioContext) {
                    console.error('AudioService: Web Audio API not supported.');
                    this.dispatchError('Web Audio API not supported.');
                    return null;
                }
                this.audioContext = new GlobalAudioContext();
                console.log('AudioService: AudioContext created. State:', this.audioContext.state);
                // Handle state changes if context is closed or interrupted externally
                this.audioContext.onstatechange = () => {
                    console.log('AudioService: AudioContext state changed to:', this.audioContext?.state);
                    this.isAudioContextStarted = this.audioContext?.state === 'running';
                    if(this.isAudioContextStarted){
                        this.dispatchEvent(new CustomEvent('audiocontextstarted'));
                    }
                };
            } catch (e) {
                console.error('AudioService: Error creating AudioContext:', e);
                this.dispatchError('Error creating AudioContext.', e);
                return null;
            }
        }
        return this.audioContext;
    }

    public async startAudioContext(): Promise<boolean> {
        if (this.isContextStarted()) {
            console.log('AudioService: AudioContext already started.');
            return true;
        }

        const context = this.getAudioContext();
        if (!context) {
            return false; // Error already dispatched by getAudioContext
        }

        // Explicitly define the possible states for clarity with the linter
        type AudioContextState = 'suspended' | 'running' | 'closed' | 'interrupted';

        if (context.state as AudioContextState === 'suspended') {
            console.log('AudioService: AudioContext is suspended, attempting to resume...');
            try {
                await context.resume();
                console.log('AudioService: AudioContext resumed successfully. State:', context.state);
                this.isAudioContextStarted = (context.state as AudioContextState) === 'running';
            } catch (e) {
                console.error('AudioService: Error resuming AudioContext:', e);
                this.dispatchError('Error resuming AudioContext.', e);
                this.isAudioContextStarted = false;
            }
        } else {
            this.isAudioContextStarted = (context.state as AudioContextState) === 'running';
        }
        
        if(this.isAudioContextStarted){
             this.dispatchEvent(new CustomEvent('audiocontextstarted'));
        }
        return this.isAudioContextStarted;
    }

    public isContextStarted(): boolean {
        // Explicitly define the possible states for clarity with the linter
        type AudioContextState = 'suspended' | 'running' | 'closed' | 'interrupted';
        return this.isAudioContextStarted && (this.audioContext?.state as AudioContextState) === 'running';
    }

    public async unlockAndInit(): Promise<boolean> {
        console.log('AudioService: unlockAndInit called.');
        if (this.readyPromise) {
            console.log('AudioService: Using existing initialization promise');
            return this.readyPromise;
        }

        this.readyPromise = (async () => {
            const contextStarted = await this.startAudioContext();
            if (!contextStarted) {
                console.warn('AudioService: unlockAndInit failed to start audio context.');
                // No SoundTouch worklet loading here directly.
                // SoundTouchNode.create() will handle its own module loading.
                this.isReadyForPlayback = false;
                return false;
            }
            // At this point, the context is started. The service is "ready" for file loading.
            console.log('AudioService: unlockAndInit completed. Context started.');
            this.isReadyForPlayback = true; // Or a more specific readiness flag
            return true;
        })();

        return this.readyPromise;
    }

    private dispatchError(message: string, error?: any) {
        this.dispatchEvent(new CustomEvent('error', { detail: { message, error } }));
    }

    /**
     * Fully clean up and dispose of all audio resources.
     * Call this when the component using AudioService is unmounted.
     */
    public async dispose() {
        console.log("AudioService: dispose called. Cleaning up resources.");
        this.stop(); // Stop playback first

        if (this.soundTouchNode) {
            this.soundTouchNode.removeEventListener('timeupdate', this.handleSoundTouchTimeUpdate as EventListener);
            this.soundTouchNode.removeEventListener('ended', this.handleSoundTouchEnded as EventListener);
            this.soundTouchNode.removeEventListener('error', this.handleSoundTouchError as EventListener);
            this.soundTouchNode.removeEventListener('loaded', this.handleSoundTouchLoaded as EventListener);
            this.soundTouchNode.removeEventListener('statechange', this.handleSoundTouchStateChange as EventListener);
            this.soundTouchNode.dispose();
            this.soundTouchNode = null;
        }

        this.pannerNode?.disconnect();
        this.pannerNode = null;

        this.gainNode?.disconnect();
        this.gainNode = null;
        
        // this.masterGainNode?.disconnect(); // If master gain is used
        // this.masterGainNode = null;

        this.audioBuffer = null;
        this.waveformPeaks = [];

        // Revoke Object URL if one was created for a File object
        if (this.currentFileUrl && this.currentFileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.currentFileUrl);
            console.log('AudioService: Revoked Object URL:', this.currentFileUrl);
        }
        this.currentFileUrl = null;

        this.internalCurrentTime = 0;
        this.internalDuration = 0;
        this.isLoading = false;
        this.isReadyForPlayback = false;
        this.playState = 'stopped';
        
        // Optional: Close AudioContext if AudioService exclusively owns it.
        // For a shared or persistent context, this might not be desired here.
        // if (this.audioContext && this.audioContext.state !== 'closed') {
        //     try {
        //         await this.audioContext.close();
        //         console.log("AudioService: AudioContext closed.");
        //         this.audioContext = null;
        //         this.isAudioContextStarted = false;
        //     } catch (e) {
        //         console.error("AudioService: Error closing AudioContext:", e);
        //     }
        // }

        console.log("AudioService: Resources disposed/reset.");
    }

    // Event handlers for SoundTouchNode - define these methods
    private handleSoundTouchTimeUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<{ currentTime: number }>;
        this.internalCurrentTime = customEvent.detail.currentTime;
        this.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime: this.internalCurrentTime }}));
    };

    private handleSoundTouchEnded = () => {
        this.playState = 'stopped';
        this.internalCurrentTime = this.internalDuration; // Or 0, depending on desired behavior for 'stop'
        this.dispatchEvent(new CustomEvent('ended'));
        this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: false, playState: this.playState }}));
        this.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime: this.internalCurrentTime }})); // Ensure UI updates time on end
    };

    private handleSoundTouchError = (event: Event) => {
        const customEvent = event as CustomEvent<{ message: string }>;
        console.error('AudioService: Error from SoundTouchNode ->', customEvent.detail.message);
        this.dispatchError('SoundTouchNode error: ' + customEvent.detail.message);
    };

    private handleSoundTouchLoaded = (event: Event) => {
        const customEvent = event as CustomEvent<{ duration: number }>;
        this.internalDuration = customEvent.detail.duration;
        this.isLoading = false;
        this.isReadyForPlayback = true;
        console.log('AudioService: SoundTouchNode reported loaded. Duration:', this.internalDuration);
        // Dispatch a service 'loaded' event after peaks are also ready in loadAudioFile
    };

    private handleSoundTouchStateChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ isPlaying: boolean }>;
        this.playState = customEvent.detail.isPlaying ? 'playing' : (this.internalCurrentTime > 0 && this.internalCurrentTime < this.internalDuration ? 'paused' : 'stopped');
        this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: customEvent.detail.isPlaying, playState: this.playState }}));
    };

    // --- Public API methods to be refactored or implemented ---

    public isWorkletAvailableAndLoaded(): boolean { // Legacy, STN handles its own loading
        return !!(this.soundTouchNode && this.soundTouchNode.isLoaded);
    }

    // getPlayerState, setPitch, setSpeed, setPan, setVolume, etc. will be here
    // getCurrentTime, getDuration, etc.

    // --- Original stubbed/legacy methods to be removed or refactored ---
    // MODIFIED: Simplified to perform minimal setup, no actual audio init (original comment)
    // public async unlockAndInit(): Promise<boolean> { (refactored above)
    
    // MODIFIED: Stubbed out (original comment)
    public async loadSoundTouchModule(): Promise<boolean> {
        console.warn('AudioService: loadSoundTouchModule is deprecated and non-functional.');
        return Promise.resolve(false);
    }

    // MODIFIED: Stubbed out (original comment)
    public createSoundTouchAudioNode(initialPitchSemitones: number = 0): boolean {
        console.warn('AudioService: createSoundTouchAudioNode is deprecated.');
        return false; // No longer relevant
    }

    // MODIFIED: Always null as nodes are not created (original comment)
    public getActivePitchNode(): AudioNode | null { // Refactor to return STN or null
        return this.soundTouchNode;
    }

    // MODIFIED: Remove all disconnection and cleanup logic for bridge nodes (original comment)
    private disconnectAndCleanupBridgeNodes(): void {
        console.warn('AudioService: disconnectAndCleanupBridgeNodes is deprecated.');
    }

    public async loadAudioFile(fileUrlOrBlob: string | File): Promise<boolean> {
        console.log('AudioService: Loading audio file:', fileUrlOrBlob);
        if (!this.audioContext || !this.isContextStarted()) {
            console.warn('AudioService: AudioContext not started. Attempting to start...');
            const contextStarted = await this.unlockAndInit();
            if (!contextStarted || !this.audioContext) {
                this.dispatchError('AudioContext could not be started. Cannot load audio file.');
                return false;
            }
        }
        // Ensure audioContext is available after unlockAndInit check
        if (!this.audioContext) {
             this.dispatchError('AudioContext is not available after initialization attempt.');
             return false;
        }

        this.isLoading = true;
        this.isReadyForPlayback = false;
        this.playState = 'stopped';
        this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: false, playState: this.playState }}));

        // 1. Full cleanup of previous audio graph elements
        this.stop(); // Stop any current playback
        this.soundTouchNode?.removeEventListener('timeupdate', this.handleSoundTouchTimeUpdate);
        this.soundTouchNode?.removeEventListener('ended', this.handleSoundTouchEnded);
        this.soundTouchNode?.removeEventListener('error', this.handleSoundTouchError);
        this.soundTouchNode?.removeEventListener('loaded', this.handleSoundTouchLoaded);
        this.soundTouchNode?.removeEventListener('statechange', this.handleSoundTouchStateChange);
        
        this.soundTouchNode?.dispose();
        this.pannerNode?.disconnect();
        this.gainNode?.disconnect();
        // this.masterGainNode?.disconnect(); // if used

        this.soundTouchNode = null;
        this.audioBuffer = null;
        this.waveformPeaks = [];
        this.internalCurrentTime = 0;
        this.internalDuration = 0;

        try {
            let arrayBuffer: ArrayBuffer;
            if (typeof fileUrlOrBlob === 'string') {
                this.currentFileUrl = fileUrlOrBlob;
                const response = await fetch(this.currentFileUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${this.currentFileUrl}`);
                }
                arrayBuffer = await response.arrayBuffer();
            } else { // instance of File
                this.currentFileUrl = URL.createObjectURL(fileUrlOrBlob); // Create a URL for display/reference
                arrayBuffer = await fileUrlOrBlob.arrayBuffer();
                // Note: If this.currentFileUrl (Object URL) is not used elsewhere for long,
                // it should be revoked with URL.revokeObjectURL() when no longer needed (e.g., in dispose or when new file loaded)
            }

            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('AudioService: Audio data decoded. Duration:', this.audioBuffer.duration);
            this.internalDuration = this.audioBuffer.duration; // Initial duration

            // 2. Generate Peaks
            this.waveformPeaks = getPeaks(this.audioBuffer, this.SAMPLES_PER_PEAK_PIXEL);
            console.log('AudioService: Waveform peaks generated.');

            // 3. Instantiate SoundTouchNode
            this.soundTouchNode = await SoundTouchNode.create(this.audioContext, this.audioBuffer);
            console.log('AudioService: SoundTouchNode created.');

            // 4. Create other nodes if they don't exist (or recreate)
            if (!this.pannerNode || this.pannerNode.context !== this.audioContext) {
                this.pannerNode = this.audioContext.createStereoPanner();
            }
            if (!this.gainNode || this.gainNode.context !== this.audioContext) {
                this.gainNode = this.audioContext.createGain();
            }
            // if (!this.masterGainNode) { this.masterGainNode = this.audioContext.createGain(); }

            // 5. Connect audio graph
            this.soundTouchNode.connect(this.pannerNode);
            this.pannerNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            // Or: this.gainNode.connect(this.masterGainNode);
            //     this.masterGainNode.connect(this.audioContext.destination);
            console.log('AudioService: Audio graph connected.');

            // 6. Apply initial settings
            this.setPan(this.currentPan);       // Apply current pan setting
            this.setVolume(this.currentVolume); // Apply current volume setting
            this.setPitch(this.currentPitchSemitones); // Apply current pitch (sends to STN)
            this.setSpeed(this.currentSpeedFactor); // Apply current speed (sends to STN)

            // 7. Setup event listeners for the new SoundTouchNode instance
            this.soundTouchNode.addEventListener('timeupdate', this.handleSoundTouchTimeUpdate as EventListener);
            this.soundTouchNode.addEventListener('ended', this.handleSoundTouchEnded as EventListener);
            this.soundTouchNode.addEventListener('error', this.handleSoundTouchError as EventListener);
            this.soundTouchNode.addEventListener('loaded', this.handleSoundTouchLoaded as EventListener);
            this.soundTouchNode.addEventListener('statechange', this.handleSoundTouchStateChange as EventListener);
            
            // The 'loaded' event from STN will set isReadyForPlayback and update duration again.
            // We dispatch the service 'loaded' event from the STN's 'loaded' handler (handleSoundTouchLoaded)
            // after it confirms its internal readiness and duration.
            // However, we have peaks and fileUrl now, so let's dispatch the main loaded event.
            this.isLoading = false; // STN will confirm its own loading via its 'loaded' event.
                                   // isReadyForPlayback will be set true by STN's 'loaded' handler.
            this.dispatchEvent(new CustomEvent('loaded', {
                detail: {
                    duration: this.internalDuration, 
                    peaks: this.waveformPeaks,
                    fileUrl: this.currentFileUrl
                }
            }));
            console.log('AudioService: File processing complete. Waiting for SoundTouchNode to confirm load.');
            return true;

        } catch (error: any) {
            console.error('AudioService: Error loading or processing audio file:', error);
            this.dispatchError(`Error loading audio file: ${error.message}`, error);
            this.isLoading = false;
            this.isReadyForPlayback = false;
            this.currentFileUrl = null; // Clear URL on error
            return false;
        }
    }

    public async play(): Promise<void> {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            console.warn('AudioService: AudioContext not available or closed. Cannot play.');
            this.dispatchError('AudioContext not available or closed.');
            return;
        }
        if (!this.soundTouchNode || !this.soundTouchNode.isLoaded || !this.isReadyForPlayback) {
            console.warn('AudioService: Not ready to play. SoundTouchNode not loaded or service not ready.');
            // Optionally, try to load if a file was previously selected but not fully loaded?
            // Or dispatch an error/warning.
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioService: AudioContext resumed for playback.');
            }
            this.soundTouchNode.play();
            // playState will be updated by the 'statechange' event from SoundTouchNode
        } catch (error: any) {
            console.error('AudioService: Error attempting to play:', error);
            this.dispatchError('Error during play initiation.', error);
        }
    }

    public pause(): void {
        if (!this.soundTouchNode || !this.soundTouchNode.isLoaded) {
            console.warn('AudioService: Not ready to pause. SoundTouchNode not loaded.');
            return;
        }
        this.soundTouchNode.pause();
        // playState will be updated by the 'statechange' event from SoundTouchNode
    }

    public stop(): void {
        if (!this.soundTouchNode) { // No need to check isLoaded, stop should work even if loading
            // console.warn('AudioService: SoundTouchNode not available to stop.');
            // If no STN, ensure local state is reset.
            this.internalCurrentTime = 0;
            this.playState = 'stopped';
            this.dispatchEvent(new CustomEvent('timeupdate', { detail: { currentTime: 0 }}));
            this.dispatchEvent(new CustomEvent('statechange', { detail: { isPlaying: false, playState: this.playState }}));
            return;
        }
        this.soundTouchNode.stop();
        // playState and currentTime will be updated by events from SoundTouchNode ('statechange' and 'timeupdate')
        // Specifically, STN's stop should set its time to 0 and trigger timeupdate.
    }

    public seek(seconds: number): void {
        if (!this.soundTouchNode || !this.soundTouchNode.isLoaded) {
            console.warn('AudioService: Not ready to seek. SoundTouchNode not loaded.');
            return;
        }
        if (this.audioBuffer) {
            const clampedSeconds = Math.max(0, Math.min(seconds, this.internalDuration));
            this.soundTouchNode.seek(clampedSeconds);
            // Optimistically update time, or wait for 'seeked' / 'timeupdate' event from STN
            // For now, STN 'seeked' event will handle the official update.
            // console.log(`AudioService: Seek requested to ${clampedSeconds}s.`);
        } else {
            console.warn('AudioService: No audio buffer loaded, cannot determine seek boundaries.');
        }
    }

    public getPlayerState(): string {
        return this.playState;
    }

    public setPitch(semitones: number, forceUpdate: boolean = false) {
        this.currentPitchSemitones = semitones;
        if (this.soundTouchNode) {
            this.soundTouchNode.setPitchSemitones(this.currentPitchSemitones);
            if (forceUpdate) {
                this.soundTouchNode.flush();
            }
            this.dispatchEvent(new CustomEvent('pitchchange', {detail: {pitch: this.currentPitchSemitones}}));
        } else {
            console.warn('AudioService: SoundTouchNode not available to set pitch.');
        }
    }

    public setSpeed(speedFactor: number, forceUpdate: boolean = false) {
        this.currentSpeedFactor = speedFactor;
        if (this.soundTouchNode) {
            this.soundTouchNode.setTempo(this.currentSpeedFactor); // SoundTouchNode uses setTempo
            if (forceUpdate) {
                this.soundTouchNode.flush();
            }
            this.dispatchEvent(new CustomEvent('speedchange', {detail: {speed: this.currentSpeedFactor}}));
        } else {
            console.warn('AudioService: SoundTouchNode not available to set speed.');
        }
    }
    
    public applyParamChange() {
        console.warn('AudioService: applyParamChange is deprecated. Consider calling flush() on SoundTouchNode if needed.');
        this.soundTouchNode?.flush(); 
    }

    public crossFadeNodes(pitch: number, tempo: number) {
        console.warn("AudioService: crossFadeNodes is deprecated.");
    }

    public getCurrentPitchSemitones(): number {
        return this.currentPitchSemitones;
    }

    public getCurrentSpeed(): number {
        return this.currentSpeedFactor;
    }

    public getCurrentVolume(): number {
        return this.currentVolume;
    }

    public getCurrentPan(): number {
        return this.currentPan;
    }

    public getIsSoundTouchActive(): boolean {
        return !!(this.soundTouchNode && this.soundTouchNode.isLoaded);
    }

    public isPlayerReady(): boolean {
        return this.isAudioContextStarted && this.isReadyForPlayback && !!(this.soundTouchNode && this.soundTouchNode.isLoaded);
    }

    public isAudioPlaying(): boolean {
        return this.playState === 'playing';
    }

    private debugAudioGraph(): void {
        console.log('AudioService: ---- Audio Graph Debug Info ----');
        console.log('AudioContext State:', this.audioContext?.state);
        console.log('SoundTouchNode exists:', !!this.soundTouchNode);
        console.log('SoundTouchNode isLoaded:', this.soundTouchNode?.isLoaded);
        console.log('SoundTouchNode isPlaying:', this.soundTouchNode?.isPlaying);
        console.log('PannerNode exists:', !!this.pannerNode);
        console.log('GainNode exists:', !!this.gainNode);
        console.log('Current File URL:', this.currentFileUrl);
        console.log('Current Time (internal):', this.internalCurrentTime);
        console.log('Duration (internal):', this.internalDuration);
        console.log('Waveform Peaks count:', this.waveformPeaks[0]?.length / 2 || 0);
        console.log('Current Pitch (semitones):', this.currentPitchSemitones);
        console.log('Current Speed Factor:', this.currentSpeedFactor);
        console.log('Current Pan:', this.currentPan);
        console.log('Current Volume:', this.currentVolume);
        console.log('Play State:', this.playState);
        console.log('isLoading:', this.isLoading);
        console.log('isReadyForPlayback:', this.isReadyForPlayback);
        console.log('AudioService: ---- End Debug Info ----');
    }

    public testPitchControl(): void {
        console.error('AudioService: testPitchControl is deprecated.');
    }

    public getCurrentTime(): number {
        return this.internalCurrentTime;
    }

    public getDuration(): number {
        return this.internalDuration;
    }

    public isReady(): boolean {
        return this.isAudioContextStarted && this.isReadyForPlayback;
    }

    public setPan(value: number) {
        // console.log(`AudioService: setPan received raw value: ${value.toFixed(3)}`);
        let newPanValue = Math.max(-1, Math.min(1, value));
        // console.log(`AudioService: Clamped newPanValue: ${newPanValue.toFixed(3)}`);

        const snapThreshold = 0.075; // Adjusted threshold from 0.15 for finer control if desired
        if (Math.abs(newPanValue) < snapThreshold) {
            newPanValue = 0;
        }
        this.currentPan = newPanValue;
        if (this.pannerNode) {
            this.pannerNode.pan.value = this.currentPan;
        }
        // console.log("AudioService: Final currentPan set to", this.currentPan.toFixed(3));
        this.dispatchEvent(new CustomEvent('panchange', {detail: {pan: this.currentPan}}));
    }

    public setVolume(value: number) {
        this.currentVolume = Math.max(0, Math.min(1, value)); // Linear volume [0,1]
        if (this.gainNode) {
            this.gainNode.gain.value = this.currentVolume;
        }
        // console.log("AudioService: volume set to", this.currentVolume);
        this.dispatchEvent(new CustomEvent('volumechange', {detail: {volume: this.currentVolume}}));
    }

    public resetAfterParamChange() {
        console.warn("AudioService: resetAfterParamChange is deprecated. Use applyParamChange or flush directly if needed.");
        this.applyParamChange(); 
    }

    private resetSoundTouch() {
        console.warn("AudioService: resetSoundTouch is deprecated.");
    }
    
    private createSTNode(pitchSt: number, tempo: number) {
        console.error("AudioService: createSTNode is deprecated.");
        return null;
    }
    
    private crossFade(newPitch: number, newTempo: number) {
        console.warn("AudioService: crossFade is deprecated.");
        return;
    }
}

// Export singleton instance
const audioServiceInstance = new AudioService();
export default audioServiceInstance; 