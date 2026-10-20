export interface AudioEnergyMetrics {
  subBass: number; // 20 - 60 Hz (deep sub rumble)
  bass: number; // 60 - 250 Hz (kick, punchy bass)
  lowMid: number; // 250 - 500 Hz (warmth, low melody)
  mid: number; // 500 - 2000 Hz (vocals, leads, synths)
  highMid: number; // 2000 - 4000 Hz (harmonics, snare bite)
  treble: number; // 4000 - 8000 Hz (shimmer, hi-hats)
  presence: number; // 8000 - 20000 Hz (air, sparkle, cymbals)
  overallEnergy: number; // 0 to 1 composite energy
  transient: number; // 0 to 1 sudden beat/transient spike detection
  rms: number; // Root Mean Square amplitude
  peak: number; // Maximum instantaneous peak
  rawFrequencyData: Uint8Array<ArrayBuffer>;
  rawTimeDomainData: Uint8Array<ArrayBuffer>;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private synthNodes: OscillatorNode[] = [];
  private synthInterval: number | null = null;

  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;

  // Smoothed band energies
  private smoothedSubBass = 0;
  private smoothedBass = 0;
  private smoothedLowMid = 0;
  private smoothedMid = 0;
  private smoothedHighMid = 0;
  private smoothedTreble = 0;
  private smoothedPresence = 0;
  private smoothedOverall = 0;
  private smoothedRMS = 0;

  // Transient / onset detection
  private previousBassEnergy = 0;
  private transientLevel = 0;

  private smoothingFactor = 0.82; // Faster response, smoother release

  private listeners: Set<(state: PlaybackState) => void> = new Set();
  private state: PlaybackState = 'idle';

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async initContext(): Promise<void> {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.75;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.8;

      // Allocate buffer with ArrayBuffer backing
      this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.timeDomainData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));

      this.gainNode.connect(this.audioCtx.destination);
      this.analyser.connect(this.gainNode);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  public getDestinationNode(): GainNode | null {
    return this.gainNode;
  }

  public loadLocalFile(file: File): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.initContext();
        this.stopProceduralSynth();

        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.src = '';
        }

        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = objectUrl;

        audio.oncanplay = () => {
          if (!this.sourceNode && this.analyser) {
            this.sourceNode = this.audioCtx!.createMediaElementSource(audio);
            this.sourceNode.connect(this.analyser);
          }
          this.audioElement = audio;
          this.setState('idle');
          resolve();
        };

        audio.onerror = () => {
          this.setState('error');
          reject(new Error('Failed to decode local audio file.'));
        };

        this.setState('loading');
      } catch (err) {
        this.setState('error');
        reject(err);
      }
    });
  }

  /**
   * Generates a multi-layered cinematic cosmic soundscape:
   * - Deep sub-bass pulse (40-65Hz)
   * - Ethereal ambient chords (F# minor 9th with slow chorus detune)
   * - High crystalline celestial harmonics
   * - Subtle LFO filter sweeps
   */
  public async startProceduralDemoAudio(): Promise<void> {
    await this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.stopProceduralSynth();
    this.synthNodes = [];

    const now = this.audioCtx.currentTime;
    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);

    // 1. Sub-bass pulse oscillator
    const subOsc = this.audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(46.25, now); // F#1 deep sub
    const subGain = this.audioCtx.createGain();
    subGain.gain.setValueAtTime(0.4, now);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start();
    this.synthNodes.push(subOsc);

    // 2. Cosmic Chord Frequencies: F#2, C#3, A3, E4, G#4, C#5
    const chordFrequencies = [92.5, 138.59, 220.0, 329.63, 415.3, 554.37];

    chordFrequencies.forEach((freq, idx) => {
      const osc = this.audioCtx!.createOscillator();
      const filter = this.audioCtx!.createBiquadFilter();
      const gain = this.audioCtx!.createGain();
      const panner = this.audioCtx!.createStereoPanner?.() || null;

      osc.type = idx === 0 ? 'triangle' : idx % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900 + idx * 300, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.18 / (idx * 0.4 + 1), now);

      if (panner) {
        panner.pan.setValueAtTime((idx / chordFrequencies.length) * 1.6 - 0.8, now);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain);
      } else {
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
      }

      osc.start();
      this.synthNodes.push(osc);
    });

    masterGain.connect(this.analyser);

    // Slowly modulate frequencies and filter cutoff to generate living pulse
    let step = 0;
    this.synthInterval = window.setInterval(() => {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      step++;

      this.synthNodes.forEach((osc, i) => {
        if (i === 0) {
          // Sub-bass rhythmic pump
          const pump = (step % 4 === 0) ? 55.0 : 46.25;
          osc.frequency.setTargetAtTime(pump, t, 0.4);
        } else {
          const base = chordFrequencies[i - 1];
          const lfo = Math.sin(t * 0.5 + i) * 3.5;
          osc.frequency.setTargetAtTime(base + lfo, t, 1.2);
        }
      });
    }, 1800);

    this.setState('playing');
  }

  public stopProceduralSynth(): void {
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.synthNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Already stopped
      }
    });
    this.synthNodes = [];
  }

  public async play(): Promise<void> {
    await this.initContext();
    if (this.audioElement) {
      await this.audioElement.play();
      this.setState('playing');
    } else {
      await this.startProceduralDemoAudio();
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.setState('paused');
    } else {
      this.stopProceduralSynth();
      this.setState('paused');
    }
  }

  public seek(seconds: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration || 0));
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioCtx?.currentTime || 0);
    }
  }

  public getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public subscribeState(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: PlaybackState): void {
    this.state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  /**
   * High-Performance 7-Band Frequency Decomposition & Transient Analysis
   */
  public getEnergyMetrics(sensitivity = 1.0): AudioEnergyMetrics {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData) {
      const emptyBuffer = new Uint8Array(new ArrayBuffer(0));
      return {
        subBass: 0,
        bass: 0,
        lowMid: 0,
        mid: 0,
        highMid: 0,
        treble: 0,
        presence: 0,
        overallEnergy: 0,
        transient: 0,
        rms: 0,
        peak: 0,
        rawFrequencyData: emptyBuffer,
        rawTimeDomainData: emptyBuffer,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const binCount = this.frequencyData.length; // 512 bins (each ~43Hz at 44.1kHz sample rate)

    // Boundaries in bins:
    // Sub-Bass: 20-60 Hz (bins 1 to 2)
    // Bass: 60-250 Hz (bins 2 to 6)
    // Low-Mid: 250-500 Hz (bins 6 to 12)
    // Mid: 500-2000 Hz (bins 12 to 46)
    // High-Mid: 2000-4000 Hz (bins 46 to 93)
    // Treble: 4000-8000 Hz (bins 93 to 186)
    // Presence: 8000-20000 Hz (bins 186 to 465)

    const sumBins = (start: number, end: number): number => {
      let sum = 0;
      const actualEnd = Math.min(end, binCount);
      for (let i = start; i < actualEnd; i++) {
        sum += this.frequencyData![i];
      }
      const count = Math.max(1, actualEnd - start);
      return (sum / count / 255) * sensitivity;
    };

    const rawSubBass = sumBins(1, 3);
    const rawBass = sumBins(2, 7);
    const rawLowMid = sumBins(7, 13);
    const rawMid = sumBins(13, 47);
    const rawHighMid = sumBins(47, 94);
    const rawTreble = sumBins(94, 187);
    const rawPresence = sumBins(187, 465);

    // RMS calculation from time domain
    let sumSquares = 0;
    let peakVal = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const normalized = (this.timeDomainData[i] - 128) / 128;
      sumSquares += normalized * normalized;
      const absVal = Math.abs(normalized);
      if (absVal > peakVal) peakVal = absVal;
    }
    const rawRMS = Math.sqrt(sumSquares / this.timeDomainData.length) * sensitivity;

    // Transient Detection: positive acceleration in low-end energy
    const currentLowEnergy = rawSubBass * 0.6 + rawBass * 0.4;
    const diff = currentLowEnergy - this.previousBassEnergy;
    if (diff > 0.08) {
      this.transientLevel = Math.min(1.0, this.transientLevel + diff * 2.2);
    } else {
      this.transientLevel *= 0.88; // fast decay
    }
    this.previousBassEnergy = currentLowEnergy;

    // Overall energy composite
    const rawOverall =
      rawSubBass * 0.25 +
      rawBass * 0.25 +
      rawLowMid * 0.15 +
      rawMid * 0.15 +
      rawHighMid * 0.1 +
      rawTreble * 0.05 +
      rawPresence * 0.05;

    // Asymmetric Attack / Release smoothing
    const smooth = (current: number, raw: number) => {
      const factor = raw > current ? 0.45 : this.smoothingFactor; // fast attack, gentle release
      return current * factor + raw * (1 - factor);
    };

    this.smoothedSubBass = smooth(this.smoothedSubBass, rawSubBass);
    this.smoothedBass = smooth(this.smoothedBass, rawBass);
    this.smoothedLowMid = smooth(this.smoothedLowMid, rawLowMid);
    this.smoothedMid = smooth(this.smoothedMid, rawMid);
    this.smoothedHighMid = smooth(this.smoothedHighMid, rawHighMid);
    this.smoothedTreble = smooth(this.smoothedTreble, rawTreble);
    this.smoothedPresence = smooth(this.smoothedPresence, rawPresence);
    this.smoothedOverall = smooth(this.smoothedOverall, rawOverall);
    this.smoothedRMS = smooth(this.smoothedRMS, rawRMS);

    const clamp = (v: number) => Math.min(1, Math.max(0, v));

    return {
      subBass: clamp(this.smoothedSubBass),
      bass: clamp(this.smoothedBass),
      lowMid: clamp(this.smoothedLowMid),
      mid: clamp(this.smoothedMid),
      highMid: clamp(this.smoothedHighMid),
      treble: clamp(this.smoothedTreble),
      presence: clamp(this.smoothedPresence),
      overallEnergy: clamp(this.smoothedOverall),
      transient: clamp(this.transientLevel),
      rms: clamp(this.smoothedRMS),
      peak: clamp(peakVal * sensitivity),
      rawFrequencyData: this.frequencyData,
      rawTimeDomainData: this.timeDomainData,
    };
  }

  public dispose(): void {
    this.stopProceduralSynth();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.setState('idle');
  }
}
