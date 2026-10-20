'use client';

import React, { Suspense, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CosmicPulse } from '../presets/CosmicPulse';
import { NebulaFlow } from '../presets/NebulaFlow';
import { StellarGeometry } from '../presets/StellarGeometry';
import { BlackHoleResonance } from '../presets/BlackHoleResonance';
import { AuroraDreamscape } from '../presets/AuroraDreamscape';
import { Starfield } from '@/features/universe/scene/Starfield';

export type SynesthesiaPresetType =
  | 'cosmic_pulse'
  | 'nebula_flow'
  | 'stellar_geometry'
  | 'black_hole_resonance'
  | 'aurora_dreamscape';

interface SynesthesiaCanvasProps {
  preset: SynesthesiaPresetType;
  sensitivity: number;
  particleDensity: number;
  reducedMotion: boolean;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const SynesthesiaCanvas = forwardRef<HTMLCanvasElement, SynesthesiaCanvasProps>(
  function SynesthesiaCanvas(
    { preset, sensitivity, particleDensity, reducedMotion, quality = 'high', onCanvasReady },
    ref
  ) {
    return (
      <div className="relative w-full h-full bg-[#05060A] overflow-hidden select-none">
        <Canvas
          ref={ref}
          camera={{ position: [0, 8, 44], fov: 52, near: 0.1, far: 500 }}
          gl={{
            preserveDrawingBuffer: true, // Needed for Canvas MediaRecorder capture
            antialias: quality !== 'performance',
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            if (onCanvasReady) {
              onCanvasReady(gl.domElement);
            }
          }}
        >
          <color attach="background" args={['#05060A']} />
          <ambientLight intensity={0.4} />
          <pointLight position={[20, 40, 20]} intensity={1.5} color="#64DFFF" />
          <pointLight position={[-20, -40, -20]} intensity={1.2} color="#8C6CFF" />

          <Suspense fallback={null}>
            <Starfield count={1200} quality={quality} reducedMotion={reducedMotion} />

            {preset === 'cosmic_pulse' && (
              <CosmicPulse
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {preset === 'nebula_flow' && (
              <NebulaFlow
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {preset === 'stellar_geometry' && (
              <StellarGeometry
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {preset === 'black_hole_resonance' && (
              <BlackHoleResonance
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {preset === 'aurora_dreamscape' && (
              <AuroraDreamscape
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              rotateSpeed={0.5}
              zoomSpeed={0.7}
              minDistance={10}
              maxDistance={140}
            />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);
