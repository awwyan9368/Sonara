export interface AudioEnergyMetrics {
  bass: number; // 0 to 1 (normalized low-frequency energy)
  mid: number; // 0 to 1 (normalized mid-frequency energy)
  treble: number; // 0 to 1 (normalized high-frequency energy)
  overallEnergy: number; // 0 to 1
  rawFrequencyData: Uint8Array;
  rawTimeDomainData: Uint8Array;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private synthOscillator: OscillatorNode | null = null;
  private synthInterval: number | null = null;

  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;

  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;
  private smoothedOverall = 0;

  private smoothingFactor = 0.85;

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
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.8;

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);

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

        audio.onerror = (e) => {
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
   * Generates rich ambient cosmic chords using Web Audio synthesis
   * Allows Synesthesia to work immediately out-of-the-box!
   */
  public async startProceduralDemoAudio(): Promise<void> {
    await this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.stopProceduralSynth();

    // Cosmic chord frequencies: F-sharp minor 9th (F#2, C#3, A3, E4, G#4)
    const baseFreqs = [92.5, 138.59, 220.0, 329.63, 415.3];
    const synthNodes: OscillatorNode[] = [];
    const chordGain = this.audioCtx.createGain();
    chordGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    baseFreqs.forEach((freq, idx) => {
      const osc = this.audioCtx!.createOscillator();
      const panner = this.audioCtx!.createStereoPanner?.() || null;
      const filter = this.audioCtx!.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : idx % 2 === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 250, this.audioCtx!.currentTime);

      if (panner) {
        panner.pan.setValueAtTime((idx / baseFreqs.length) * 1.6 - 0.8, this.audioCtx!.currentTime);
        osc.connect(filter);
        filter.connect(panner);
        panner.connect(chordGain);
      } else {
        osc.connect(filter);
        filter.connect(chordGain);
      }

      osc.start();
      synthNodes.push(osc);
    });

    chordGain.connect(this.analyser);

    // Evolve the chord gently over time
    this.synthInterval = window.setInterval(() => {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      synthNodes.forEach((osc, i) => {
        const drift = Math.sin(now * 0.4 + i) * 3;
        osc.frequency.setTargetAtTime(baseFreqs[i] + drift, now, 1.5);
      });
    }, 2000);

    this.setState('playing');
  }

  public stopProceduralSynth(): void {
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
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
   * High-performance frequency decomposition and energy calculation for visual frame
   */
  public getEnergyMetrics(sensitivity = 1.0): AudioEnergyMetrics {
    if (!this.analyser || !this.frequencyData || !this.timeDomainData) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        overallEnergy: 0,
        rawFrequencyData: new Uint8Array(0),
        rawTimeDomainData: new Uint8Array(0),
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as unknown as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as unknown as Uint8Array<ArrayBuffer>);

    const binCount = this.frequencyData.length;
    // Bins: 512 total
    // Bass: ~20Hz to 250Hz (approx bins 1 to 12)
    // Mid: ~250Hz to 4000Hz (approx bins 13 to 180)
    // Treble: ~4000Hz to 20000Hz (approx bins 181 to 511)

    const bassEnd = Math.min(14, binCount);
    const midEnd = Math.min(180, binCount);

    let bassSum = 0;
    for (let i = 1; i < bassEnd; i++) {
      bassSum += this.frequencyData[i];
    }
    const rawBass = (bassSum / (bassEnd - 1) / 255) * sensitivity;

    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.frequencyData[i];
    }
    const rawMid = (midSum / (midEnd - bassEnd) / 255) * sensitivity;

    let trebleSum = 0;
    for (let i = midEnd; i < binCount; i++) {
      trebleSum += this.frequencyData[i];
    }
    const rawTreble = (trebleSum / (binCount - midEnd) / 255) * sensitivity;

    const rawOverall = (rawBass * 0.45 + rawMid * 0.35 + rawTreble * 0.2);

    // Apply asymmetric attack/release smoothing to avoid visual jitter
    this.smoothedBass = this.smoothedBass * this.smoothingFactor + rawBass * (1 - this.smoothingFactor);
    this.smoothedMid = this.smoothedMid * this.smoothingFactor + rawMid * (1 - this.smoothingFactor);
    this.smoothedTreble = this.smoothedTreble * this.smoothingFactor + rawTreble * (1 - this.smoothingFactor);
    this.smoothedOverall = this.smoothedOverall * this.smoothingFactor + rawOverall * (1 - this.smoothingFactor);

    return {
      bass: Math.min(1, Math.max(0, this.smoothedBass)),
      mid: Math.min(1, Math.max(0, this.smoothedMid)),
      treble: Math.min(1, Math.max(0, this.smoothedTreble)),
      overallEnergy: Math.min(1, Math.max(0, this.smoothedOverall)),
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
