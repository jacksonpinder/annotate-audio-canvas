var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/soundtouchjs/dist/soundtouch.js
var FifoSampleBuffer = class {
  constructor() {
    this._vector = new Float32Array();
    this._position = 0;
    this._frameCount = 0;
  }
  get vector() {
    return this._vector;
  }
  get position() {
    return this._position;
  }
  get startIndex() {
    return this._position * 2;
  }
  get frameCount() {
    return this._frameCount;
  }
  get endIndex() {
    return (this._position + this._frameCount) * 2;
  }
  clear() {
    this.receive(this._frameCount);
    this.rewind();
  }
  put(numFrames) {
    this._frameCount += numFrames;
  }
  putSamples(samples, position, numFrames = 0) {
    position = position || 0;
    const sourceOffset = position * 2;
    if (!(numFrames >= 0)) {
      numFrames = (samples.length - sourceOffset) / 2;
    }
    const numSamples = numFrames * 2;
    this.ensureCapacity(numFrames + this._frameCount);
    const destOffset = this.endIndex;
    this.vector.set(samples.subarray(sourceOffset, sourceOffset + numSamples), destOffset);
    this._frameCount += numFrames;
  }
  putBuffer(buffer, position, numFrames = 0) {
    position = position || 0;
    if (!(numFrames >= 0)) {
      numFrames = buffer.frameCount - position;
    }
    this.putSamples(buffer.vector, buffer.position + position, numFrames);
  }
  receive(numFrames) {
    if (!(numFrames >= 0) || numFrames > this._frameCount) {
      numFrames = this.frameCount;
    }
    this._frameCount -= numFrames;
    this._position += numFrames;
  }
  receiveSamples(output, numFrames = 0) {
    const numSamples = numFrames * 2;
    const sourceOffset = this.startIndex;
    output.set(this._vector.subarray(sourceOffset, sourceOffset + numSamples));
    this.receive(numFrames);
  }
  extract(output, position = 0, numFrames = 0) {
    const sourceOffset = this.startIndex + position * 2;
    const numSamples = numFrames * 2;
    output.set(this._vector.subarray(sourceOffset, sourceOffset + numSamples));
  }
  ensureCapacity(numFrames = 0) {
    const minLength = parseInt(numFrames * 2);
    if (this._vector.length < minLength) {
      const newVector = new Float32Array(minLength);
      newVector.set(this._vector.subarray(this.startIndex, this.endIndex));
      this._vector = newVector;
      this._position = 0;
    } else {
      this.rewind();
    }
  }
  ensureAdditionalCapacity(numFrames = 0) {
    this.ensureCapacity(this._frameCount + numFrames);
  }
  rewind() {
    if (this._position > 0) {
      this._vector.set(this._vector.subarray(this.startIndex, this.endIndex));
      this._position = 0;
    }
  }
};
var AbstractFifoSamplePipe = class {
  constructor(createBuffers) {
    if (createBuffers) {
      this._inputBuffer = new FifoSampleBuffer();
      this._outputBuffer = new FifoSampleBuffer();
    } else {
      this._inputBuffer = this._outputBuffer = null;
    }
  }
  get inputBuffer() {
    return this._inputBuffer;
  }
  set inputBuffer(inputBuffer) {
    this._inputBuffer = inputBuffer;
  }
  get outputBuffer() {
    return this._outputBuffer;
  }
  set outputBuffer(outputBuffer) {
    this._outputBuffer = outputBuffer;
  }
  clear() {
    this._inputBuffer.clear();
    this._outputBuffer.clear();
  }
};
var RateTransposer = class extends AbstractFifoSamplePipe {
  constructor(createBuffers) {
    super(createBuffers);
    this.reset();
    this._rate = 1;
  }
  set rate(rate) {
    this._rate = rate;
  }
  reset() {
    this.slopeCount = 0;
    this.prevSampleL = 0;
    this.prevSampleR = 0;
  }
  clone() {
    const result = new RateTransposer();
    result.rate = this._rate;
    return result;
  }
  process() {
    const numFrames = this._inputBuffer.frameCount;
    this._outputBuffer.ensureAdditionalCapacity(numFrames / this._rate + 1);
    const numFramesOutput = this.transpose(numFrames);
    this._inputBuffer.receive();
    this._outputBuffer.put(numFramesOutput);
  }
  transpose(numFrames = 0) {
    if (numFrames === 0) {
      return 0;
    }
    const src = this._inputBuffer.vector;
    const srcOffset = this._inputBuffer.startIndex;
    const dest = this._outputBuffer.vector;
    const destOffset = this._outputBuffer.endIndex;
    let used = 0;
    let i = 0;
    while (this.slopeCount < 1) {
      dest[destOffset + 2 * i] = (1 - this.slopeCount) * this.prevSampleL + this.slopeCount * src[srcOffset];
      dest[destOffset + 2 * i + 1] = (1 - this.slopeCount) * this.prevSampleR + this.slopeCount * src[srcOffset + 1];
      i = i + 1;
      this.slopeCount += this._rate;
    }
    this.slopeCount -= 1;
    if (numFrames !== 1) {
      out:
        while (true) {
          while (this.slopeCount > 1) {
            this.slopeCount -= 1;
            used = used + 1;
            if (used >= numFrames - 1) {
              break out;
            }
          }
          const srcIndex = srcOffset + 2 * used;
          dest[destOffset + 2 * i] = (1 - this.slopeCount) * src[srcIndex] + this.slopeCount * src[srcIndex + 2];
          dest[destOffset + 2 * i + 1] = (1 - this.slopeCount) * src[srcIndex + 1] + this.slopeCount * src[srcIndex + 3];
          i = i + 1;
          this.slopeCount += this._rate;
        }
    }
    this.prevSampleL = src[srcOffset + 2 * numFrames - 2];
    this.prevSampleR = src[srcOffset + 2 * numFrames - 1];
    return i;
  }
};
var FilterSupport = class {
  constructor(pipe) {
    this._pipe = pipe;
  }
  get pipe() {
    return this._pipe;
  }
  get inputBuffer() {
    return this._pipe.inputBuffer;
  }
  get outputBuffer() {
    return this._pipe.outputBuffer;
  }
  fillInputBuffer() {
    throw new Error("fillInputBuffer() not overridden");
  }
  fillOutputBuffer(numFrames = 0) {
    while (this.outputBuffer.frameCount < numFrames) {
      const numInputFrames = 8192 * 2 - this.inputBuffer.frameCount;
      this.fillInputBuffer(numInputFrames);
      if (this.inputBuffer.frameCount < 8192 * 2) {
        break;
      }
      this._pipe.process();
    }
  }
  clear() {
    this._pipe.clear();
  }
};
var noop = function() {
  return;
};
var SimpleFilter = class extends FilterSupport {
  constructor(sourceSound, pipe, callback = noop) {
    super(pipe);
    this.callback = callback;
    this.sourceSound = sourceSound;
    this.historyBufferSize = 22050;
    this._sourcePosition = 0;
    this.outputBufferPosition = 0;
    this._position = 0;
  }
  get position() {
    return this._position;
  }
  set position(position) {
    if (position > this._position) {
      throw new RangeError("New position may not be greater than current position");
    }
    const newOutputBufferPosition = this.outputBufferPosition - (this._position - position);
    if (newOutputBufferPosition < 0) {
      throw new RangeError("New position falls outside of history buffer");
    }
    this.outputBufferPosition = newOutputBufferPosition;
    this._position = position;
  }
  get sourcePosition() {
    return this._sourcePosition;
  }
  set sourcePosition(sourcePosition) {
    this.clear();
    this._sourcePosition = sourcePosition;
  }
  onEnd() {
    this.callback();
  }
  fillInputBuffer(numFrames = 0) {
    const samples = new Float32Array(numFrames * 2);
    const numFramesExtracted = this.sourceSound.extract(samples, numFrames, this._sourcePosition);
    this._sourcePosition += numFramesExtracted;
    this.inputBuffer.putSamples(samples, 0, numFramesExtracted);
  }
  extract(target, numFrames = 0) {
    this.fillOutputBuffer(this.outputBufferPosition + numFrames);
    const numFramesExtracted = Math.min(numFrames, this.outputBuffer.frameCount - this.outputBufferPosition);
    this.outputBuffer.extract(target, this.outputBufferPosition, numFramesExtracted);
    const currentFrames = this.outputBufferPosition + numFramesExtracted;
    this.outputBufferPosition = Math.min(this.historyBufferSize, currentFrames);
    this.outputBuffer.receive(Math.max(currentFrames - this.historyBufferSize, 0));
    this._position += numFramesExtracted;
    return numFramesExtracted;
  }
  handleSampleData(event) {
    this.extract(event.data, 4096);
  }
  clear() {
    super.clear();
    this.outputBufferPosition = 0;
  }
};
var USE_AUTO_SEQUENCE_LEN = 0;
var DEFAULT_SEQUENCE_MS = USE_AUTO_SEQUENCE_LEN;
var USE_AUTO_SEEKWINDOW_LEN = 0;
var DEFAULT_SEEKWINDOW_MS = USE_AUTO_SEEKWINDOW_LEN;
var DEFAULT_OVERLAP_MS = 8;
var _SCAN_OFFSETS = [[124, 186, 248, 310, 372, 434, 496, 558, 620, 682, 744, 806, 868, 930, 992, 1054, 1116, 1178, 1240, 1302, 1364, 1426, 1488, 0], [-100, -75, -50, -25, 25, 50, 75, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [-20, -15, -10, -5, 5, 10, 15, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [-4, -3, -2, -1, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
var AUTOSEQ_TEMPO_LOW = 0.5;
var AUTOSEQ_TEMPO_TOP = 2;
var AUTOSEQ_AT_MIN = 125;
var AUTOSEQ_AT_MAX = 50;
var AUTOSEQ_K = (AUTOSEQ_AT_MAX - AUTOSEQ_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW);
var AUTOSEQ_C = AUTOSEQ_AT_MIN - AUTOSEQ_K * AUTOSEQ_TEMPO_LOW;
var AUTOSEEK_AT_MIN = 25;
var AUTOSEEK_AT_MAX = 15;
var AUTOSEEK_K = (AUTOSEEK_AT_MAX - AUTOSEEK_AT_MIN) / (AUTOSEQ_TEMPO_TOP - AUTOSEQ_TEMPO_LOW);
var AUTOSEEK_C = AUTOSEEK_AT_MIN - AUTOSEEK_K * AUTOSEQ_TEMPO_LOW;
var Stretch = class extends AbstractFifoSamplePipe {
  constructor(createBuffers) {
    super(createBuffers);
    this._quickSeek = true;
    this.midBufferDirty = false;
    this.midBuffer = null;
    this.overlapLength = 0;
    this.autoSeqSetting = true;
    this.autoSeekSetting = true;
    this._tempo = 1;
    this.setParameters(44100, DEFAULT_SEQUENCE_MS, DEFAULT_SEEKWINDOW_MS, DEFAULT_OVERLAP_MS);
  }
  clear() {
    super.clear();
    this.clearMidBuffer();
  }
  clearMidBuffer() {
    if (this.midBufferDirty) {
      this.midBufferDirty = false;
      this.midBuffer = null;
    }
  }
  setParameters(sampleRate, sequenceMs, seekWindowMs, overlapMs) {
    if (sampleRate > 0) {
      this.sampleRate = sampleRate;
    }
    if (overlapMs > 0) {
      this.overlapMs = overlapMs;
    }
    if (sequenceMs > 0) {
      this.sequenceMs = sequenceMs;
      this.autoSeqSetting = false;
    } else {
      this.autoSeqSetting = true;
    }
    if (seekWindowMs > 0) {
      this.seekWindowMs = seekWindowMs;
      this.autoSeekSetting = false;
    } else {
      this.autoSeekSetting = true;
    }
    this.calculateSequenceParameters();
    this.calculateOverlapLength(this.overlapMs);
    this.tempo = this._tempo;
  }
  set tempo(newTempo) {
    let intskip;
    this._tempo = newTempo;
    this.calculateSequenceParameters();
    this.nominalSkip = this._tempo * (this.seekWindowLength - this.overlapLength);
    this.skipFract = 0;
    intskip = Math.floor(this.nominalSkip + 0.5);
    this.sampleReq = Math.max(intskip + this.overlapLength, this.seekWindowLength) + this.seekLength;
  }
  get tempo() {
    return this._tempo;
  }
  get inputChunkSize() {
    return this.sampleReq;
  }
  get outputChunkSize() {
    return this.overlapLength + Math.max(0, this.seekWindowLength - 2 * this.overlapLength);
  }
  calculateOverlapLength(overlapInMsec = 0) {
    let newOvl;
    newOvl = this.sampleRate * overlapInMsec / 1e3;
    newOvl = newOvl < 16 ? 16 : newOvl;
    newOvl -= newOvl % 8;
    this.overlapLength = newOvl;
    this.refMidBuffer = new Float32Array(this.overlapLength * 2);
    this.midBuffer = new Float32Array(this.overlapLength * 2);
  }
  checkLimits(x, mi, ma) {
    return x < mi ? mi : x > ma ? ma : x;
  }
  calculateSequenceParameters() {
    let seq;
    let seek;
    if (this.autoSeqSetting) {
      seq = AUTOSEQ_C + AUTOSEQ_K * this._tempo;
      seq = this.checkLimits(seq, AUTOSEQ_AT_MAX, AUTOSEQ_AT_MIN);
      this.sequenceMs = Math.floor(seq + 0.5);
    }
    if (this.autoSeekSetting) {
      seek = AUTOSEEK_C + AUTOSEEK_K * this._tempo;
      seek = this.checkLimits(seek, AUTOSEEK_AT_MAX, AUTOSEEK_AT_MIN);
      this.seekWindowMs = Math.floor(seek + 0.5);
    }
    this.seekWindowLength = Math.floor(this.sampleRate * this.sequenceMs / 1e3);
    this.seekLength = Math.floor(this.sampleRate * this.seekWindowMs / 1e3);
  }
  set quickSeek(enable) {
    this._quickSeek = enable;
  }
  clone() {
    const result = new Stretch();
    result.tempo = this._tempo;
    result.setParameters(this.sampleRate, this.sequenceMs, this.seekWindowMs, this.overlapMs);
    return result;
  }
  seekBestOverlapPosition() {
    return this._quickSeek ? this.seekBestOverlapPositionStereoQuick() : this.seekBestOverlapPositionStereo();
  }
  seekBestOverlapPositionStereo() {
    let bestOffset;
    let bestCorrelation;
    let correlation;
    let i = 0;
    this.preCalculateCorrelationReferenceStereo();
    bestOffset = 0;
    bestCorrelation = Number.MIN_VALUE;
    for (; i < this.seekLength; i = i + 1) {
      correlation = this.calculateCrossCorrelationStereo(2 * i, this.refMidBuffer);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = i;
      }
    }
    return bestOffset;
  }
  seekBestOverlapPositionStereoQuick() {
    let bestOffset;
    let bestCorrelation;
    let correlation;
    let scanCount = 0;
    let correlationOffset;
    let tempOffset;
    this.preCalculateCorrelationReferenceStereo();
    bestCorrelation = Number.MIN_VALUE;
    bestOffset = 0;
    correlationOffset = 0;
    tempOffset = 0;
    for (; scanCount < 4; scanCount = scanCount + 1) {
      let j = 0;
      while (_SCAN_OFFSETS[scanCount][j]) {
        tempOffset = correlationOffset + _SCAN_OFFSETS[scanCount][j];
        if (tempOffset >= this.seekLength) {
          break;
        }
        correlation = this.calculateCrossCorrelationStereo(2 * tempOffset, this.refMidBuffer);
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = tempOffset;
        }
        j = j + 1;
      }
      correlationOffset = bestOffset;
    }
    return bestOffset;
  }
  preCalculateCorrelationReferenceStereo() {
    let i = 0;
    let context;
    let temp;
    for (; i < this.overlapLength; i = i + 1) {
      temp = i * (this.overlapLength - i);
      context = i * 2;
      this.refMidBuffer[context] = this.midBuffer[context] * temp;
      this.refMidBuffer[context + 1] = this.midBuffer[context + 1] * temp;
    }
  }
  calculateCrossCorrelationStereo(mixingPosition, compare) {
    const mixing = this._inputBuffer.vector;
    mixingPosition += this._inputBuffer.startIndex;
    let correlation = 0;
    let i = 2;
    const calcLength = 2 * this.overlapLength;
    let mixingOffset;
    for (; i < calcLength; i = i + 2) {
      mixingOffset = i + mixingPosition;
      correlation += mixing[mixingOffset] * compare[i] + mixing[mixingOffset + 1] * compare[i + 1];
    }
    return correlation;
  }
  overlap(overlapPosition) {
    this.overlapStereo(2 * overlapPosition);
  }
  overlapStereo(inputPosition) {
    const input = this._inputBuffer.vector;
    inputPosition += this._inputBuffer.startIndex;
    const output = this._outputBuffer.vector;
    const outputPosition = this._outputBuffer.endIndex;
    let i = 0;
    let context;
    let tempFrame;
    const frameScale = 1 / this.overlapLength;
    let fi;
    let inputOffset;
    let outputOffset;
    for (; i < this.overlapLength; i = i + 1) {
      tempFrame = (this.overlapLength - i) * frameScale;
      fi = i * frameScale;
      context = 2 * i;
      inputOffset = context + inputPosition;
      outputOffset = context + outputPosition;
      output[outputOffset + 0] = input[inputOffset + 0] * fi + this.midBuffer[context + 0] * tempFrame;
      output[outputOffset + 1] = input[inputOffset + 1] * fi + this.midBuffer[context + 1] * tempFrame;
    }
  }
  process() {
    let offset;
    let temp;
    let overlapSkip;
    if (this.midBuffer === null) {
      if (this._inputBuffer.frameCount < this.overlapLength) {
        return;
      }
      this.midBuffer = new Float32Array(this.overlapLength * 2);
      this._inputBuffer.receiveSamples(this.midBuffer, this.overlapLength);
    }
    while (this._inputBuffer.frameCount >= this.sampleReq) {
      offset = this.seekBestOverlapPosition();
      this._outputBuffer.ensureAdditionalCapacity(this.overlapLength);
      this.overlap(Math.floor(offset));
      this._outputBuffer.put(this.overlapLength);
      temp = this.seekWindowLength - 2 * this.overlapLength;
      if (temp > 0) {
        this._outputBuffer.putBuffer(this._inputBuffer, offset + this.overlapLength, temp);
      }
      const start = this._inputBuffer.startIndex + 2 * (offset + this.seekWindowLength - this.overlapLength);
      this.midBuffer.set(this._inputBuffer.vector.subarray(start, start + 2 * this.overlapLength));
      this.skipFract += this.nominalSkip;
      overlapSkip = Math.floor(this.skipFract);
      this.skipFract -= overlapSkip;
      this._inputBuffer.receive(overlapSkip);
    }
  }
};
var testFloatEqual = function(a, b) {
  return (a > b ? a - b : b - a) > 1e-10;
};
var SoundTouch = class {
  constructor() {
    this.transposer = new RateTransposer(false);
    this.stretch = new Stretch(false);
    this._inputBuffer = new FifoSampleBuffer();
    this._intermediateBuffer = new FifoSampleBuffer();
    this._outputBuffer = new FifoSampleBuffer();
    this._rate = 0;
    this._tempo = 0;
    this.virtualPitch = 1;
    this.virtualRate = 1;
    this.virtualTempo = 1;
    this.calculateEffectiveRateAndTempo();
  }
  clear() {
    this.transposer.clear();
    this.stretch.clear();
  }
  clone() {
    const result = new SoundTouch();
    result.rate = this.rate;
    result.tempo = this.tempo;
    return result;
  }
  get rate() {
    return this._rate;
  }
  set rate(rate) {
    this.virtualRate = rate;
    this.calculateEffectiveRateAndTempo();
  }
  set rateChange(rateChange) {
    this._rate = 1 + 0.01 * rateChange;
  }
  get tempo() {
    return this._tempo;
  }
  set tempo(tempo) {
    this.virtualTempo = tempo;
    this.calculateEffectiveRateAndTempo();
  }
  set tempoChange(tempoChange) {
    this.tempo = 1 + 0.01 * tempoChange;
  }
  set pitch(pitch) {
    this.virtualPitch = pitch;
    this.calculateEffectiveRateAndTempo();
  }
  set pitchOctaves(pitchOctaves) {
    this.pitch = Math.exp(0.69314718056 * pitchOctaves);
    this.calculateEffectiveRateAndTempo();
  }
  set pitchSemitones(pitchSemitones) {
    this.pitchOctaves = pitchSemitones / 12;
  }
  get inputBuffer() {
    return this._inputBuffer;
  }
  get outputBuffer() {
    return this._outputBuffer;
  }
  calculateEffectiveRateAndTempo() {
    const previousTempo = this._tempo;
    const previousRate = this._rate;
    this._tempo = this.virtualTempo / this.virtualPitch;
    this._rate = this.virtualRate * this.virtualPitch;
    if (testFloatEqual(this._tempo, previousTempo)) {
      this.stretch.tempo = this._tempo;
    }
    if (testFloatEqual(this._rate, previousRate)) {
      this.transposer.rate = this._rate;
    }
    if (this._rate > 1) {
      if (this._outputBuffer != this.transposer.outputBuffer) {
        this.stretch.inputBuffer = this._inputBuffer;
        this.stretch.outputBuffer = this._intermediateBuffer;
        this.transposer.inputBuffer = this._intermediateBuffer;
        this.transposer.outputBuffer = this._outputBuffer;
      }
    } else {
      if (this._outputBuffer != this.stretch.outputBuffer) {
        this.transposer.inputBuffer = this._inputBuffer;
        this.transposer.outputBuffer = this._intermediateBuffer;
        this.stretch.inputBuffer = this._intermediateBuffer;
        this.stretch.outputBuffer = this._outputBuffer;
      }
    }
  }
  process() {
    if (this._rate > 1) {
      this.stretch.process();
      this.transposer.process();
    } else {
      this.transposer.process();
      this.stretch.process();
    }
  }
};
var WebAudioBufferSource = class {
  constructor(buffer) {
    this.buffer = buffer;
    this._position = 0;
  }
  get dualChannel() {
    return this.buffer.numberOfChannels > 1;
  }
  get position() {
    return this._position;
  }
  set position(value) {
    this._position = value;
  }
  extract(target, numFrames = 0, position = 0) {
    this.position = position;
    let left = this.buffer.getChannelData(0);
    let right = this.dualChannel ? this.buffer.getChannelData(1) : this.buffer.getChannelData(0);
    let i = 0;
    for (; i < numFrames; i++) {
      target[i * 2] = left[i + position];
      target[i * 2 + 1] = right[i + position];
    }
    return Math.min(numFrames, left.length - position);
  }
};

// src/audio/SoundTouchProcessor.ts
var SoundTouchProcessor = class extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    __publicField(this, "soundtouch");
    __publicField(this, "processorSampleRate");
    __publicField(this, "source");
    __publicField(this, "filter");
    __publicField(this, "isPlaying");
    __publicField(this, "isSourceSet");
    __publicField(this, "eofReached");
    __publicField(this, "totalFramesProcessed");
    __publicField(this, "soundtouchOutputBuffer");
    this.soundtouch = new SoundTouch();
    this.soundtouch.useIdealFFT = true;
    this.soundtouch.fftFrameSize = 2048;
    this.soundtouch.sequenceMs = 50;
    this.soundtouch.seekWindowMs = 25;
    this.soundtouch.formant = true;
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
          case "loadData": {
            const { channelData, sampleRate: newSampleRate } = data;
            if (!channelData || channelData.length !== 2 || !channelData[0] || !channelData[1]) {
              this.port.postMessage({ type: "error", message: "loadData: Invalid channelData provided." });
              return;
            }
            this.processorSampleRate = newSampleRate;
            const buffer = {
              numberOfChannels: 2,
              sampleRate: this.processorSampleRate,
              getChannelData: (channel) => {
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
            console.log("SoundTouchProcessor: Data loaded, sampleRate:", this.processorSampleRate, "channels:", 2, "length:", channelData[0].length);
            this.port.postMessage({ type: "loaded", duration: channelData[0].length / this.processorSampleRate });
            break;
          }
          case "setPitch": {
            const { semitones, startTime, timeConstant } = data;
            this.soundtouch.pitchSemitones = semitones;
            console.log("SoundTouchProcessor: Pitch set to", semitones, "with glide:", timeConstant, "ms");
            break;
          }
          case "setTempo": {
            const { tempo } = data;
            this.soundtouch.tempo = tempo;
            console.log("SoundTouchProcessor: Tempo set to", tempo);
            break;
          }
          case "seek": {
            const { positionFrames } = data;
            if (this.source && this.filter) {
              this.filter.clear();
              this.totalFramesProcessed = Math.max(0, Math.floor(positionFrames));
              this.eofReached = false;
              console.log("SoundTouchProcessor: Seek to frame", this.totalFramesProcessed);
              this.port.postMessage({ type: "seeked", newPositionFrames: this.totalFramesProcessed });
            } else {
              this.port.postMessage({ type: "error", message: "seek: Source not set." });
            }
            break;
          }
          case "play":
            this.isPlaying = true;
            console.log("SoundTouchProcessor: Play");
            this.port.postMessage({ type: "stateChange", isPlaying: this.isPlaying });
            break;
          case "pause":
            this.isPlaying = false;
            console.log("SoundTouchProcessor: Pause");
            this.port.postMessage({ type: "stateChange", isPlaying: this.isPlaying });
            break;
          case "stop":
            this.isPlaying = false;
            if (this.source && this.filter) {
              this.filter.clear();
              this.totalFramesProcessed = 0;
              this.eofReached = false;
            }
            console.log("SoundTouchProcessor: Stop");
            this.port.postMessage({ type: "stateChange", isPlaying: this.isPlaying, currentTime: 0 });
            this.port.postMessage({ type: "timeupdate", currentTime: 0 });
            break;
          case "flush":
            if (this.soundtouch) {
              this.soundtouch.flush();
            }
            if (this.filter) {
              this.filter.clear();
            }
            console.log("SoundTouchProcessor: Flushed");
            break;
          default:
            console.warn("SoundTouchProcessor: Unknown message type received:", type);
            this.port.postMessage({ type: "error", message: `Unknown message type: ${type}` });
        }
      } catch (e) {
        console.error("SoundTouchProcessor: Error in onmessage:", e);
        this.port.postMessage({ type: "error", message: `onmessage error: ${e instanceof Error ? e.message : String(e)}` });
      }
    };
  }
  process(inputs, outputs, parameters) {
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
        this.port.postMessage({ type: "ended" });
        this.port.postMessage({ type: "stateChange", isPlaying: this.isPlaying });
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
        type: "timeupdate",
        currentTime: this.totalFramesProcessed / this.processorSampleRate
      });
    } catch (e) {
      console.error("SoundTouchProcessor: Error in process method:", e);
      this.port.postMessage({ type: "error", message: `Process error: ${e instanceof Error ? e.message : String(e)}` });
      outputChannelLeft.fill(0);
      outputChannelRight.fill(0);
      return true;
    }
    return true;
  }
};
registerProcessor("soundtouch-processor", SoundTouchProcessor);
