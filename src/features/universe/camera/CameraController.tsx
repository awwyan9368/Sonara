'use client';

import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControllerProps {
  targetPosition: [number, number, number] | null;
  targetLookAt: [number, number, number] | null;
  resetTrigger?: number;
  sensitivity?: number;
  reducedMotion?: boolean;
}

export function CameraController({
  targetPosition,
  targetLookAt,
  resetTrigger,
  sensitivity = 1.0,
  reducedMotion = false,
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const desiredPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 85, 145));
  const desiredLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef(false);

  // Update target when props change
  useEffect(() => {
    if (targetPosition) {
      desiredPos.current.set(targetPosition[0], targetPosition[1], targetPosition[2]);
      if (targetLookAt) {
        desiredLookAt.current.set(targetLookAt[0], targetLookAt[1], targetLookAt[2]);
      }
      isTransitioning.current = true;
    }
  }, [targetPosition, targetLookAt]);

  // Handle reset camera trigger
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      desiredPos.current.set(0, 85, 145);
      desiredLookAt.current.set(0, 0, 0);
      isTransitioning.current = true;
    }
  }, [resetTrigger]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (isTransitioning.current) {
      const lerpSpeed = reducedMotion ? 1.0 : Math.min(1.0, delta * 4.5);

      camera.position.lerp(desiredPos.current, lerpSpeed);
      controlsRef.current.target.lerp(desiredLookAt.current, lerpSpeed);
      camera.lookAt(controlsRef.current.target);

      const distPos = camera.position.distanceTo(desiredPos.current);
      const distTarget = controlsRef.current.target.distanceTo(desiredLookAt.current);

      if (distPos < 0.05 && distTarget < 0.05) {
        camera.position.copy(desiredPos.current);
        controlsRef.current.target.copy(desiredLookAt.current);
        controlsRef.current.update();
        isTransitioning.current = false;
      }
    } else {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6 * sensitivity}
      zoomSpeed={0.8 * sensitivity}
      panSpeed={0.7 * sensitivity}
      minDistance={1.2}
      maxDistance={350}
      makeDefault
    />
  );
}

