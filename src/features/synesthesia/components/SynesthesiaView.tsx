'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Video,
  Download,
  Sliders,
  Sparkles,
  Music,
  Compass,
  Radio,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AudioEngine, PlaybackState } from '../audio/audioEngine';
import { SynesthesiaCanvas, SynesthesiaPresetType } from '../visuals/SynesthesiaCanvas';
import { SynesthesiaRecorder } from '../recording/canvasRecorder';

interface SynesthesiaViewProps {
  onReturnToUniverse: () => void;
  reducedMotion?: boolean;
}

export function SynesthesiaView({ onReturnToUniverse, reducedMotion = false }: SynesthesiaViewProps) {
  const [preset, setPreset] = useState<SynesthesiaPresetType>('cosmic_pulse');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [sensitivity, setSensitivity] = useState(1.2);
  const [particleDensity, setParticleDensity] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Recording state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'finished'>('idle');
  const recorderRef = useRef<SynesthesiaRecorder>(new SynesthesiaRecorder());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const engine = AudioEngine.getInstance();
    const unsub = engine.subscribeState((st) => setPlaybackState(st));
    return () => unsub();
  }, []);

  const handleTogglePlay = async () => {
    const engine = AudioEngine.getInstance();
    if (playbackState === 'playing') {
      engine.pause();
    } else {
      await engine.play();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    AudioEngine.getInstance().setVolume(newVol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      AudioEngine.getInstance().setVolume(volume || 0.8);
    } else {
      setIsMuted(true);
      AudioEngine.getInstance().setVolume(0);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await AudioEngine.getInstance().loadLocalFile(file);
      setIsAudioLoaded(true);
      setLoadedFileName(file.name);
      await AudioEngine.getInstance().play();
    } catch (err) {
      console.error('Audio file loading failed:', err);
    }
  };

  const handleStartProceduralSynth = async () => {
    setIsAudioLoaded(true);
    setLoadedFileName('Procedural Cosmic Soundscape (Web Audio)');
    await AudioEngine.getInstance().startProceduralDemoAudio();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Recording controls
  const handleToggleRecord = async () => {
    if (!canvasRef.current) return;

    const recorder = recorderRef.current;
    if (recordingState === 'recording') {
      try {
        setRecordingState('processing');
        await recorder.stopRecording();
        setRecordingState('finished');
      } catch (e) {
        console.error('Recording stop error:', e);
        setRecordingState('idle');
      }
    } else {
      const engine = AudioEngine.getInstance();
      const started = recorder.startRecording({
        canvas: canvasRef.current,
        audioDestination: engine.getDestinationNode(),
        audioContext: engine.getAudioContext(),
        fps: 60,
      });

      if (started) {
        setRecordingState('recording');
      }
    }
  };

  const handleDownloadVideo = () => {
    recorderRef.current.downloadRecording(`sonara_${preset}_${Date.now()}.webm`);
  };

  const presetsList: Array<{ id: SynesthesiaPresetType; label: string }> = [
    { id: 'cosmic_pulse', label: 'Cosmic Pulse' },
    { id: 'nebula_flow', label: 'Nebula Flow' },
    { id: 'stellar_geometry', label: 'Stellar Geometry' },
    { id: 'black_hole_resonance', label: 'Black Hole' },
    { id: 'aurora_dreamscape', label: 'Aurora' },
  ];

  return (
    <div className="relative w-full h-full bg-[#05060A] overflow-hidden select-none">
      {/* 3D Generative Canvas */}
      <SynesthesiaCanvas
        preset={preset}
        sensitivity={sensitivity}
        particleDensity={particleDensity}
        reducedMotion={reducedMotion}
        onCanvasReady={(cvs) => {
          canvasRef.current = cvs;
        }}
      />

      {/* Zen Mode Toggle Button (Always visible in corner) */}
      <button
        type="button"
        onClick={() => setZenMode((prev) => !prev)}
        className="absolute top-5 right-5 z-40 p-2.5 rounded-full bg-surface/80 border border-border-subtle hover:border-accent-cyan text-text-secondary hover:text-text-primary backdrop-blur-md transition-all shadow-lg cursor-pointer"
        title={zenMode ? 'Exit Zen Mode (Show Controls)' : 'Enter Zen Mode (Hide Controls)'}
      >
        {zenMode ? <Eye className="w-4 h-4 text-accent-cyan" /> : <EyeOff className="w-4 h-4" />}
      </button>

      {/* Top Floating Bar (Hidden in Zen Mode) */}
      {!zenMode && (
        <div className="absolute top-5 left-5 right-20 flex items-center justify-between pointer-events-none z-30 animate-in fade-in">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              type="button"
              onClick={onReturnToUniverse}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/85 border border-border-subtle hover:border-accent-cyan text-text-secondary hover:text-text-primary backdrop-blur-md transition-all text-xs font-mono"
            >
              <Compass className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Return to SoundGalaxy</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/70 border border-border-subtle backdrop-blur-md text-[11px] font-mono text-text-muted">
              <Radio className="w-3 h-3 text-accent-violet animate-pulse" />
              <span className="truncate max-w-[220px]">
                {loadedFileName || 'No audio loaded (procedural visualizer)'}
              </span>
            </div>
          </div>

          {/* 5-Preset Selector Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-surface/85 border border-border-subtle backdrop-blur-md pointer-events-auto shadow-xl">
            {presetsList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  preset === p.id
                    ? 'bg-accent-violet text-white shadow-[0_0_15px_rgba(140,108,255,0.5)] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Control Dock (Hidden in Zen Mode) */}
      {!zenMode && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 pointer-events-auto animate-in slide-in-from-bottom-2">
          <div className="p-4 rounded-2xl bg-surface/90 backdrop-blur-xl border border-border-subtle shadow-2xl space-y-3">
            {/* Audio Transport Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="w-10 h-10 rounded-full bg-accent-cyan text-background flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(100,223,255,0.4)] cursor-pointer"
                  aria-label={playbackState === 'playing' ? 'Pause audio' : 'Play audio'}
                >
                  {playbackState === 'playing' ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="text-text-muted hover:text-text-primary"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-18 accent-accent-cyan h-1 bg-surface-raised rounded cursor-pointer"
                    aria-label="Audio volume"
                  />
                </div>
              </div>

              {/* Audio Sources: Upload file or Trigger Ambient Synth */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-text-primary transition-colors cursor-pointer"
                  title="Select a local MP3, WAV, or AAC file"
                >
                  <Upload className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Upload Audio</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartProceduralSynth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-text-primary transition-colors cursor-pointer"
                  title="Generate multi-layer ambient cosmic soundscape via Web Audio API"
                >
                  <Music className="w-3.5 h-3.5 text-accent-amber" />
                  <span>Cosmic Synth</span>
                </button>
              </div>

              {/* Fullscreen & Video Recording */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-2 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {recordingState === 'finished' ? (
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan text-background text-xs font-semibold hover:bg-accent-cyan/90 transition-all cursor-pointer shadow-[0_0_12px_rgba(100,223,255,0.3)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .webm</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleRecord}
                    disabled={recordingState === 'processing'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      recordingState === 'recording'
                        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                        : 'bg-surface-raised hover:bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{recordingState === 'recording' ? 'Stop Recording' : 'Record Visual'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Slider Tweaks: Sensitivity & Particle Density */}
            <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-xs font-mono text-text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px]">
                  <Sliders className="w-3 h-3 text-accent-violet" /> Sensitivity:
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="w-24 accent-accent-violet h-1 bg-surface-raised rounded cursor-pointer"
                />
                <span className="text-[10px] text-text-secondary">{sensitivity.toFixed(1)}x</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-accent-cyan" /> Particles:
                </span>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.2"
                  value={particleDensity}
                  onChange={(e) => setParticleDensity(Number(e.target.value))}
                  className="w-24 accent-accent-cyan h-1 bg-surface-raised rounded cursor-pointer"
                />
                <span className="text-[10px] text-text-secondary">{particleDensity.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
