'use client';

import React, { Suspense, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CosmicPulse } from '../presets/CosmicPulse';
import { NebulaFlow } from '../presets/NebulaFlow';
import { StellarGeometry } from '../presets/StellarGeometry';
import { Starfield } from '@/features/universe/scene/Starfield';

interface SynesthesiaCanvasProps {
  preset: 'cosmic_pulse' | 'nebula_flow' | 'stellar_geometry';
  sensitivity: number;
  particleDensity: number;
  reducedMotion: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const SynesthesiaCanvas = forwardRef<HTMLCanvasElement, SynesthesiaCanvasProps>(
  function SynesthesiaCanvas(
    { preset, sensitivity, particleDensity, reducedMotion, onCanvasReady },
    ref
  ) {
    return (
      <div className="relative w-full h-full bg-[#05060A] overflow-hidden select-none">
        <Canvas
          ref={ref}
          camera={{ position: [0, 10, 42], fov: 55, near: 0.1, far: 500 }}
          gl={{
            preserveDrawingBuffer: true, // Crucial for clean canvas recording capture
            antialias: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            if (onCanvasReady) {
              onCanvasReady(gl.domElement);
            }
          }}
        >
          <color attach="background" args={['#05060A']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[20, 40, 20]} intensity={1.5} color="#64DFFF" />
          <pointLight position={[-20, -40, -20]} intensity={1.2} color="#8C6CFF" />

          <Suspense fallback={null}>
            <Starfield count={800} quality="medium" reducedMotion={reducedMotion} />

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

            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              rotateSpeed={0.5}
              zoomSpeed={0.7}
              minDistance={10}
              maxDistance={120}
            />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

