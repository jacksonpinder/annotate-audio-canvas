import * as Tone from 'tone';
import { SoundTouchNode, type SoundTouchNodeMessage } from "@soundtouchjs/audio-worklet";
import { throttle } from 'lodash';

// Add interface for webkitAudioContext
interface Window {
    webkitAudioContext: typeof AudioContext;
}

console.log('AudioService.ts: Module loaded. Tone version:', Tone.version);

/**
 * Converts semitones to a pitch ratio.
 * @param semitones - The number of semitones.
 * @returns The pitch ratio.
 */
function semitonesToRatio(semitones: number): number {
    return Math.pow(2, semitones / 12);
}

class AudioService {
    // Tone.Context is automatically created when Tone.js objects are used,
    // or can be accessed via Tone.context.
    // We don't need to explicitly create a new AudioContext() if using Tone.js throughout.
    public soundTouchNode: AudioWorkletNode | null = null; // Will be used later
    public player: Tone.Player | null = null; // Will be used later
    private isWorkletLoaded: boolean = false; // Will be used later
    private isAudioContextStarted: boolean = false;
    private limiter: Tone.Compressor | null; // MODIFIED: Made nullable
    public pitchShiftNode: Tone.PitchShift | null = null; // For fallback

    // Dedicated context for the SoundTouch worklet if Tone.context is incompatible
    private workletContext: AudioContext | null = null;

    // For bridging contexts
    private playerToWorkletStreamDest: MediaStreamAudioDestinationNode | null = null;
    private workletToPlayerStreamDest: MediaStreamAudioDestinationNode | null = null;
    private workletSourceForPlayerOutput: MediaStreamAudioSourceNode | null = null;
    private playerSourceForWorkletOutput: MediaStreamAudioSourceNode | null = null;

    // State properties
    private currentPitchSemitones: number = 0;
    private isSoundTouchActive: boolean = false;
    private currentFileUrl: string | null = null;
    private audioBuffer: AudioBuffer | null = null; // Or Tone.ToneAudioBuffer if preferred
    private stNodes: { node: AudioWorkletNode; gain: GainNode }[] = [];
    private activeIndex = 0;   // 0 or 1
    private adapterGain: GainNode | null = null;

    // Add a duration property
    private duration: number = 0;

    private workletModuleLoaded = false;
    private readyPromise: Promise<boolean> | null = null;

    private panNode: Tone.Panner | null = null;
    private currentPan = 0;
    private currentVolume = 1.0;
    private currentSpeedFactor: number = 1.0;

    constructor() {
        console.log('AudioService: Constructor called. Tone.context state:', Tone.context.state);
        // Initialize limiter and connect it directly to Tone's main destination
        this.limiter = null;
        console.log('AudioService: Limiter is no longer created in constructor.');
    }
    public getToneContext(): Tone.Context {
        return Tone.context as any as Tone.Context; // Cast to satisfy specific Tone.Context type
    }

    public async startAudioContext(): Promise<boolean> {
        // Check if context is already running or if start has been successfully called before
        console.log('AudioService: startAudioContext called (stubbed).');
        this.isAudioContextStarted = false; // Or true if we want to mock success
        return Promise.resolve(this.isAudioContextStarted);
    }

    public isContextStarted(): boolean {
        // More robust check: context must be 'running'
        return this.isAudioContextStarted && Tone.context.state === 'running';
    }

    public async unlockAndInit(): Promise<boolean> {
        if (this.readyPromise) {
            console.log('AudioService: Using existing initialization promise');
            return this.readyPromise;
        }

        this.readyPromise = (async () => {
            // MODIFIED: Simplified to perform minimal setup, no actual audio init
            console.log('AudioService: unlockAndInit called (stubbed).');
            // Start the audio context (stubbed)
            if (!this.isContextStarted()) {
                await this.startAudioContext();
            }

            // No SoundTouch worklet loading or node creation
            this.isWorkletLoaded = false;
            this.soundTouchNode = null;
            
            console.log('AudioService: unlockAndInit completed (stubbed).');
            return true; // Indicate "success" for UI purposes
        })();

        return this.readyPromise;
    }

    public async loadSoundTouchModule(): Promise<boolean> {
        // MODIFIED: Stubbed out
        console.log('AudioService: loadSoundTouchModule called (stubbed).');
        this.isWorkletLoaded = false;
        this.workletModuleLoaded = false;
        this.workletContext = null; // Ensure no context is active
        return Promise.resolve(false);
    }

    public isWorkletAvailableAndLoaded(): boolean {
        // This now refers to loading into the workletContext strategy
        // MODIFIED: Always false as worklet isn't loaded
        return false;
    }

    public createSoundTouchAudioNode(initialPitchSemitones: number = 0): boolean {
        // MODIFIED: Stubbed out
        console.log('AudioService: createSoundTouchAudioNode called (stubbed).');
        this.soundTouchNode = null;
        return false;
    }

    private createFallbackPitchShiftNode(initialPitch: number): boolean {
        // MODIFIED: Stubbed out
        console.log('AudioService: createFallbackPitchShiftNode called (stubbed).');
        this.pitchShiftNode = null;
        return false;
    }

    public getActivePitchNode(): Tone.ToneAudioNode | AudioWorkletNode | null {
        // MODIFIED: Always null as nodes are not created
        return null;
    }

    private disconnectAndCleanupBridgeNodes(): void {
        console.log('AudioService: disconnectAndCleanupBridgeNodes called (stubbed).');
        // MODIFIED: Remove all disconnection and cleanup logic for bridge nodes
        // this.player?.disconnect(this.playerToWorkletStreamDest); 
        if (this.playerToWorkletStreamDest) {
            // this.playerToWorkletStreamDest.stream.getTracks().forEach(track => track.stop());
            this.playerToWorkletStreamDest = null;
            console.log('AudioService: Cleaned up playerToWorkletStreamDest reference (stubbed).');
        }
        if (this.workletSourceForPlayerOutput) {
            // this.workletSourceForPlayerOutput.disconnect(); 
            this.workletSourceForPlayerOutput = null;
            console.log('AudioService: Cleaned up workletSourceForPlayerOutput reference (stubbed).');
        }

        // Clean up SoundTouch nodes array (already stubbed, but ensure it's minimal)
        for (let i = 0; i < this.stNodes.length; i++) {
            if (this.stNodes[i]) {
                // this.stNodes[i].node.disconnect();
                // this.stNodes[i].gain.disconnect();
                console.log(`AudioService: Cleaned up SoundTouch node ${i} references (stubbed)`);
            }
        }
        this.stNodes = [];
        this.activeIndex = 0;
        
        if (this.adapterGain) {
            // this.adapterGain.disconnect();
            this.adapterGain = null;
            console.log('AudioService: Cleaned up adapterGain reference (stubbed)');
        }

        // this.soundTouchNode?.disconnect(); 
        if (this.workletToPlayerStreamDest) {
            // this.workletToPlayerStreamDest.stream.getTracks().forEach(track => track.stop());
            this.workletToPlayerStreamDest = null;
            console.log('AudioService: Cleaned up workletToPlayerStreamDest reference (stubbed).');
        }
        if (this.playerSourceForWorkletOutput) {
            // this.playerSourceForWorkletOutput.disconnect(); 
            this.playerSourceForWorkletOutput = null;
            console.log('AudioService: Cleaned up playerSourceForWorkletOutput reference (stubbed).');
        }

        // Fallback path disconnections (stubbed)
        // this.player?.disconnect(this.pitchShiftNode);
        // this.pitchShiftNode?.disconnect(this.limiter);
        // this.player?.disconnect(this.limiter);

        this.soundTouchNode = null; // Ensure this is nulled if not already

        console.log('AudioService: Bridge nodes and fallback paths cleanup logic removed (stubbed).');
    }

    public async loadAudioFile(fileUrlOrBlob: string | File): Promise<boolean> {
        if (!this.isContextStarted()) {
            console.warn('AudioService: Tone AudioContext not started. Cannot load audio file.');
            // MODIFIED: Still check this, but startAudioContext is stubbed
            // If we want to allow "loading" in UI-only mode, we might need to adjust startAudioContext mock
            await this.startAudioContext(); // Attempt to "start" it (stubbed)
            if(!this.isContextStarted()){
                // If stubbed startAudioContext returns false and we strictly check, then return false here.
                // For UI-only, perhaps we assume it's "started" or bypass this check.
                // For now, let's allow it to proceed to demonstrate UI-only file "load"
                 console.warn('AudioService: AudioContext not "started" (stubbed), proceeding with UI-only load.');
            }
        }
        console.log('AudioService: loadAudioFile called (stubbed).');

        // 1. Full cleanup of previous audio graph elements (stubbed or removed)
        this.stop(); // Stop playback first (will be stubbed)
        this.disconnectAndCleanupBridgeNodes(); // Clean up bridge nodes specifically (will be stubbed)

        // MODIFIED: Player is not created
        if (this.player) {
            console.log('AudioService: Disposing previous Tone.Player (if any).');
            // this.player.dispose(); // Actual disposal removed
            this.player = null;
        }
        this.player = null; 

        this.isSoundTouchActive = false; // Default to false

        // MODIFIED: No new player creation or audio graph setup
        console.log('AudioService: Skipping Tone.Player creation and audio graph setup.');

        // MODIFIED: PanNode is not created
        this.panNode = null;


        // Apply all current control values (these will be stubbed setters)
        this.setPan(this.currentPan);
        this.setVolume(this.currentVolume);

        // 5. "Load" audio (non-audio parts)
        try {
            if (fileUrlOrBlob instanceof File) {
                this.currentFileUrl = URL.createObjectURL(fileUrlOrBlob); // Store URL for potential display
                // URL.revokeObjectURL(this.currentFileUrl) // Should be revoked when no longer needed
            } else {
                this.currentFileUrl = fileUrlOrBlob;
            }
            console.log('AudioService: Audio "loaded" (file URL stored):', this.currentFileUrl);
            
            // Store the duration (dummy value)
            this.duration = 0; // Or some other placeholder
            console.log('AudioService: Buffer "loaded", duration set to:', this.duration);
            
            // If we stored a created object URL, and aren't using it, revoke it.
            // For now, currentFileUrl might be used by UI, so leave it.

            return true;
        } catch (e) {
            console.error('AudioService: Error "loading" audio (file URL handling):', e);
            this.player = null; // Ensure player is null
            return false;
        }
    }

    public async play(): Promise<void> { // Added async for potential resume
        // MODIFIED: Stubbed out
        if (this.player && this.player.loaded) { // This condition will likely be false
            console.warn('AudioService: Play called, but player should not be loaded in UI-only mode.');
        } else {
            console.log('AudioService: Play called (stubbed). Player not available or not loaded.');
        }
        // No actual playback start
    }

    public stop(): void {
        console.log('AudioService: stop() called (stubbed).');
        // MODIFIED: No actual player stop
        if (this.player) {
            // this.player.stop(); 
            console.log('AudioService: Player stop skipped (stubbed).');
        }
    }

    public getPlayerState(): string {
        // MODIFIED: Always stopped
        return 'stopped';
    }

    public setPitch(semitones: number, forceUpdate: boolean = false) {
        this.currentPitchSemitones = semitones;
        console.log('AudioService: setPitch called with ' + semitones + ' semitones (stubbed). SoundTouch active: ' + this.isSoundTouchActive);
        // MODIFIED: Removed all audio node interactions
    }

    public setSpeed(speedFactor: number, forceUpdate: boolean = false) {
        this.currentSpeedFactor = speedFactor;
        console.log('AudioService: setSpeed called with ' + speedFactor + ' (stubbed). SoundTouch active: ' + this.isSoundTouchActive);
        // MODIFIED: Removed all audio node interactions
    }

    // Public method to apply changes with crossfade
    public applyParamChange() {
        // MODIFIED: Stubbed out
        console.log('AudioService: applyParamChange called (stubbed).');
        // if (this.isSoundTouchActive) {
        //     this.crossFade(this.currentPitchSemitones, this.currentSpeedFactor);
        // }
    }

    // Public interface to the crossFade method with proper guards
    public crossFadeNodes(pitch: number, tempo: number) {
        // MODIFIED: Stubbed out
        console.warn("AudioService: Cannot crossfade - SoundTouch is not active (stubbed).");
        return;
        // this.crossFade(pitch, tempo);
    }

    /**
     * Fully clean up and dispose of all audio resources.
     * Call this when the component using AudioService is unmounted.
     */
    public async dispose() {
        console.log("AudioService: dispose called. Cleaning up non-audio resources.");
        this.stop(); // Ensure everything is stopped first (stubbed)

        // MODIFIED: Removed player and limiter disposal
        this.player = null;
        this.limiter = null;

        // MODIFIED: Removed bridge component cleanup
        this.playerToWorkletStreamDest = null;
        this.workletSourceForPlayerOutput = null;
        this.workletToPlayerStreamDest = null;
        this.playerSourceForWorkletOutput = null;

        // MODIFIED: Removed SoundTouchNode cleanup
        this.soundTouchNode = null;

        // MODIFIED: Removed workletContext cleanup
        if (this.workletContext) {
            console.log("AudioService: workletContext reference cleared (no actual closing as it's not created).");
        }
        this.workletContext = null;


        this.isAudioContextStarted = false;
        this.isWorkletLoaded = false;
        this.isSoundTouchActive = false;
        this.currentPitchSemitones = 0;
        // this.currentFileUrl = null; // Keep if UI might need it after dispose, otherwise nullify
        this.audioBuffer = null;
        this.panNode = null; // Ensure panNode is also cleared

        console.log("AudioService: Non-audio resources disposed/reset.");
    }

    // Method to get the current pitch in semitones
    public getCurrentPitchSemitones(): number {
        return this.currentPitchSemitones;
    }

    // Method to get the current speed factor
    public getCurrentSpeed(): number {
        return this.currentSpeedFactor;
    }

    // Method to get the current volume
    public getCurrentVolume(): number {
        return this.currentVolume;
    }

    // Method to get the current pan value
    public getCurrentPan(): number {
        return this.currentPan;
    }

    // Method to check if SoundTouch is active
    public getIsSoundTouchActive(): boolean {
        return this.isSoundTouchActive;
    }

    public isPlayerReady(): boolean {
        // MODIFIED: Player is never ready in UI-only mode
        return false;
    }

    public isAudioPlaying(): boolean {
        // MODIFIED: Audio is never playing
        return false;
    }

    // Helper method to debug the audio graph state
    private debugAudioGraph(): void {
        // MODIFIED: Stubbed out or provide UI-only state
        console.log('AudioService: ---- Audio Graph Debug Info (UI-Only Mode) ----');
        console.log('Dual SoundTouch system active:', this.isSoundTouchActive); // Should be false
        console.log('Active node index:', this.activeIndex);
        console.log('SoundTouch nodes count:', this.stNodes.length); // Should be 0
        console.log('Adapter gain exists:', !!this.adapterGain); // Should be false
        console.log('Legacy soundTouchNode reference:', !!this.soundTouchNode); // Should be null
        console.log('Current pitch (semitones):', this.currentPitchSemitones);
        console.log('Current speed factor:', this.currentSpeedFactor);
        console.log('isSoundTouchActive:', this.isSoundTouchActive);
        console.log('AudioService: ---- End Debug Info (UI-Only Mode) ----');
    }

    /**
     * Test method to try different approaches to pitch control
     * Call this after audio is loaded to test different methods
     */
    public testPitchControl(): void {
        // MODIFIED: Stubbed out
        console.error('AudioService: Cannot test pitch control - SoundTouchNode not active (stubbed).');
        return;
    }

    // Add methods for transport control
    public seek(seconds: number): void {
        // MODIFIED: Stubbed out
        console.log(`AudioService: Seeking to ${seconds}s (stubbed).`);
        // No player interaction
    }

    public getCurrentTime(): number {
        // MODIFIED: Always 0
        return 0;
    }

    public getDuration(): number {
        // MODIFIED: Returns stored (dummy) duration
        return this.duration;
    }

    public isReady(): boolean {
        // MODIFIED: Simplified readiness for UI-only mode
        // Returns true if "file is loaded" (URL stored) and "context started" (mocked)
        // For a pure UI-only mode, this could simply be true after init.
        // Let's make it depend on currentFileUrl being set, and context "started"
        // return !!this.currentFileUrl && this.isAudioContextStarted;
        // Or simply:
        console.log('AudioService: isReady called (stubbed check).');
        return true; // Assume always ready for UI interaction after unlockAndInit
    }

    public setPan(value: number) {
        console.log(`AudioService: setPan received raw value: ${value.toFixed(3)}`);

        let newPanValue = Math.max(-1, Math.min(1, value));  // Clamp to [-1, 1]
        console.log(`AudioService: Clamped newPanValue: ${newPanValue.toFixed(3)}`);

        const snapThreshold = 0.15; 
        const isWithinThreshold = Math.abs(newPanValue) < snapThreshold;

        console.log(`AudioService: snapThreshold: ${snapThreshold}, Math.abs(newPanValue): ${Math.abs(newPanValue).toFixed(3)}, isWithinThreshold: ${isWithinThreshold}`);

        if (isWithinThreshold) {
            newPanValue = 0;
            console.log(`AudioService: Pan value ${value.toFixed(3)} (clamped: ${this.currentPan.toFixed(3)}) IS within threshold ${snapThreshold}. Snapped to center (0).`);
        } else {
            console.log(`AudioService: Pan value ${value.toFixed(3)} (clamped: ${newPanValue.toFixed(3)}) IS NOT within threshold ${snapThreshold}. No snap.`);
        }

        this.currentPan = newPanValue;
        console.log("AudioService: Final currentPan set to", this.currentPan.toFixed(3), "(stubbed - no audio effect)");
    }

    public setVolume(value: number) {
        this.currentVolume = Math.max(0, Math.min(1, value));  // safety
        // MODIFIED: Removed player interaction
        // if (this.player) {
        //     const dbValue = this.currentVolume === 0 ? -Infinity : 20 * Math.log10(this.currentVolume);
        //     this.player.volume.value = dbValue;
        // }
        console.log("AudioService: volume set to", this.currentVolume, "(stubbed - no audio effect)");
    }

    // Legacy method to maintain backward compatibility
    public resetAfterParamChange() {
        console.log("AudioService: resetAfterParamChange called (stubbed) - using applyParamChange (stubbed)");
        this.applyParamChange(); // applyParamChange is also stubbed
    }

    // Legacy method - no longer needed with crossfade approach
    private resetSoundTouch() {
        console.log("AudioService: resetSoundTouch is deprecated (stubbed).");
        // Do nothing
    }
    
    private createSTNode(pitchSt: number, tempo: number) {
        // MODIFIED: Stubbed out
        console.error("AudioService: Cannot create ST node - workletContext is null (stubbed).");
        return null;
    }
    
    private crossFade(newPitch: number, newTempo: number) {
        // MODIFIED: Stubbed out
        console.warn("AudioService: Cannot crossfade - SoundTouch not active (stubbed).");
        return;
    }
}

// Export singleton instance
const audioServiceInstance = new AudioService();
export default audioServiceInstance; 