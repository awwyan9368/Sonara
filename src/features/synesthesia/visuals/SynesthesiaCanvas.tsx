'use client';

import React, { Suspense, forwardRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EtherealNebula } from '../presets/EtherealNebula';
import { SpiralResonance } from '../presets/SpiralResonance';
import { CosmicLightflow } from '../presets/CosmicLightflow';
import { Singularity } from '../presets/Singularity';
import { StellarGeometry } from '../presets/StellarGeometry';
import { Starfield } from '@/features/universe/scene/Starfield';

export type SynesthesiaPresetType =
  | 'ethereal_nebula'
  | 'spiral_resonance'
  | 'cosmic_lightflow'
  | 'singularity'
  | 'stellar_geometry'
  | 'cosmic_pulse'
  | 'nebula_flow'
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
          camera={{ position: [0, 6, 42], fov: 50, near: 0.1, far: 500 }}
          gl={{
            preserveDrawingBuffer: true, // Needed for Canvas MediaRecorder capture
            antialias: quality !== 'performance',
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
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

            {(preset === 'ethereal_nebula' || preset === 'nebula_flow') && (
              <EtherealNebula
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {(preset === 'spiral_resonance' || preset === 'cosmic_pulse') && (
              <SpiralResonance
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {(preset === 'cosmic_lightflow' || preset === 'aurora_dreamscape') && (
              <CosmicLightflow
                sensitivity={sensitivity}
                particleDensity={particleDensity}
                reducedMotion={reducedMotion}
              />
            )}

            {(preset === 'singularity' || preset === 'black_hole_resonance') && (
              <Singularity
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
