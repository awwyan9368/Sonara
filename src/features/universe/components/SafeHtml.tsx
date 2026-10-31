'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  Vector3,
  DoubleSide,
  OrthographicCamera,
  PerspectiveCamera,
  Vector2,
  Matrix4,
  Object3D,
  Camera,
  Group,
  Mesh,
  ShaderMaterial,
  PlaneGeometry,
} from 'three';
import { useThree, useFrame, ThreeElements } from '@react-three/fiber';

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const v4 = new Vector2();

function defaultCalculatePosition(
  el: Object3D,
  camera: Camera,
  size: { width: number; height: number }
) {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  objectPos.project(camera);
  const widthHalf = size.width / 2;
  const heightHalf = size.height / 2;
  return [objectPos.x * widthHalf + widthHalf, -(objectPos.y * heightHalf) + heightHalf];
}

function isObjectBehindCamera(el: Object3D, camera: Camera) {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
  const deltaCamObj = objectPos.sub(cameraPos);
  const camDir = camera.getWorldDirection(v3);
  return deltaCamObj.angleTo(camDir) > Math.PI / 2;
}

function isObjectVisible(el: Object3D, camera: Camera, raycaster: any, occlude: any[]) {
  const elPos = v1.setFromMatrixPosition(el.matrixWorld);
  const screenPos = elPos.clone();
  screenPos.project(camera);
  v4.set(screenPos.x, screenPos.y);
  raycaster.setFromCamera(v4, camera);
  const intersects = raycaster.intersectObjects(occlude, true);
  if (intersects.length) {
    const intersectionDistance = intersects[0].distance;
    const pointDistance = elPos.distanceTo(raycaster.ray.origin);
    return pointDistance < intersectionDistance;
  }
  return true;
}

function objectScale(el: Object3D, camera: Camera) {
  if (camera instanceof OrthographicCamera) {
    return camera.zoom;
  } else if (camera instanceof PerspectiveCamera) {
    const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
    const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
    const vFOV = (camera.fov * Math.PI) / 180;
    const dist = objectPos.distanceTo(cameraPos);
    const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
    return 1 / scaleFOV;
  } else {
    return 1;
  }
}

function objectZIndex(el: Object3D, camera: Camera, zIndexRange: number[]) {
  if (camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera) {
    const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
    const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
    const dist = objectPos.distanceTo(cameraPos);
    const A = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
    const B = zIndexRange[1] - A * camera.far;
    return Math.round(A * dist + B);
  }
  return undefined;
}

const epsilon = (value: number) => (Math.abs(value) < 1e-10 ? 0 : value);

function getCSSMatrix(matrix: Matrix4, multipliers: number[], prepend = '') {
  let matrix3d = 'matrix3d(';
  for (let i = 0; i !== 16; i++) {
    matrix3d += epsilon(multipliers[i] * matrix.elements[i]) + (i !== 15 ? ',' : ')');
  }
  return prepend + matrix3d;
}

const getCameraCSSMatrix = ((multipliers: number[]) => {
  return (matrix: Matrix4) => getCSSMatrix(matrix, multipliers);
})([1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1]);

const getObjectCSSMatrix = ((scaleMultipliers: (f: number) => number[]) => {
  return (matrix: Matrix4, factor: number) =>
    getCSSMatrix(matrix, scaleMultipliers(factor), 'translate(-50%,-50%)');
})((f: number) => [
  1 / f,
  1 / f,
  1 / f,
  1,
  -1 / f,
  -1 / f,
  -1 / f,
  -1,
  1 / f,
  1 / f,
  1 / f,
  1,
  1,
  1,
  1,
  1,
]);

function isRefObject(ref: any): ref is React.RefObject<any> {
  return ref && typeof ref === 'object' && 'current' in ref;
}

export interface SafeHtmlProps extends Omit<ThreeElements['group'], 'ref'> {
  children?: React.ReactNode;
  eps?: number;
  style?: React.CSSProperties;
  className?: string;
  prepend?: boolean;
  center?: boolean;
  fullscreen?: boolean;
  portal?: React.RefObject<HTMLElement | null>;
  distanceFactor?: number;
  sprite?: boolean;
  transform?: boolean;
  occlude?: any;
  onOcclude?: (hidden: boolean) => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
  material?: any;
  geometry?: any;
  zIndexRange?: [number, number];
  calculatePosition?: (
    el: Object3D,
    camera: Camera,
    size: { width: number; height: number }
  ) => number[];
  as?: string;
  wrapperClass?: string;
  pointerEvents?:
    | 'auto'
    | 'none'
    | 'visiblePainted'
    | 'visibleFill'
    | 'visibleStroke'
    | 'visible'
    | 'painted'
    | 'fill'
    | 'stroke'
    | 'all'
    | 'inherit';
}

/**
 * SafeHtml: React 19 compatible Html overlay for Three.js.
 * Deferring root.unmount via setTimeout prevents the React 19 fatal error:
 * "Attempted to synchronously unmount a root while React was already rendering".
 */
export const SafeHtml = React.forwardRef<HTMLDivElement, SafeHtmlProps>(function SafeHtml(
  {
    children,
    eps = 0.001,
    style,
    className,
    prepend,
    center,
    fullscreen,
    portal,
    distanceFactor,
    sprite = false,
    transform = false,
    occlude,
    onOcclude,
    castShadow,
    receiveShadow,
    material,
    geometry,
    zIndexRange = [16777271, 0],
    calculatePosition = defaultCalculatePosition,
    as = 'div',
    wrapperClass,
    pointerEvents = 'auto',
    ...props
  },
  ref
) {
  const { gl, camera, scene, size, raycaster, events, viewport } = useThree();
  const [el] = React.useState(() =>
    typeof document !== 'undefined' ? document.createElement(as) : null
  );
  const root = React.useRef<ReactDOM.Root | null>(null);
  const group = React.useRef<Group | null>(null);
  const oldZoom = React.useRef(0);
  const oldPosition = React.useRef<number[]>([0, 0]);
  const transformOuterRef = React.useRef<HTMLDivElement | null>(null);
  const transformInnerRef = React.useRef<HTMLDivElement | null>(null);
  const occlusionMeshRef = React.useRef<Mesh | null>(null);
  const isMeshSizeSet = React.useRef(false);

  // Append to the connected element, which makes HTML work with views
  const target =
    (portal == null ? void 0 : portal.current) || events.connected || gl.domElement.parentNode;

  const isRayCastOcclusion = React.useMemo(() => {
    return (
      (occlude && occlude !== 'blending') ||
      (Array.isArray(occlude) && occlude.length && isRefObject(occlude[0]))
    );
  }, [occlude]);

  React.useLayoutEffect(() => {
    const canvasEl = gl.domElement;
    if (occlude && occlude === 'blending') {
      canvasEl.style.zIndex = `${Math.floor(zIndexRange[0] / 2)}`;
      canvasEl.style.position = 'absolute';
      canvasEl.style.pointerEvents = 'none';
    } else {
      canvasEl.style.zIndex = '';
      canvasEl.style.position = '';
      canvasEl.style.pointerEvents = '';
    }
  }, [occlude, gl.domElement, zIndexRange]);

  React.useLayoutEffect(() => {
    if (!el) return;
    if (group.current) {
      const currentRoot = (root.current = ReactDOM.createRoot(el));
      scene.updateMatrixWorld();
      if (transform) {
        el.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;`;
      } else {
        const vec = calculatePosition(group.current, camera, size);
        el.style.cssText = `position:absolute;top:0;left:0;transform:translate3d(${vec[0]}px,${vec[1]}px,0);transform-origin:0 0;`;
      }
      if (target) {
        if (prepend) target.prepend(el);
        else target.appendChild(el);
      }
      return () => {
        if (target) {
          try {
            target.removeChild(el);
          } catch {
            // Already removed or node missing
          }
        }
        // React 19 safety: Defers root.unmount() past current render cycle
        setTimeout(() => {
          try {
            currentRoot.unmount();
          } catch {
            // Safe cleanup
          }
        }, 0);
      };
    }
  }, [target, transform, el, scene, camera, size, calculatePosition, prepend]);

  React.useLayoutEffect(() => {
    if (el && wrapperClass) el.className = wrapperClass;
  }, [wrapperClass, el]);

  const styles = React.useMemo<React.CSSProperties>(() => {
    if (transform) {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: size.width,
        height: size.height,
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
      };
    } else {
      return {
        position: 'absolute',
        transform: center ? 'translate3d(-50%,-50%,0)' : 'none',
        ...(fullscreen && {
          top: -size.height / 2,
          left: -size.width / 2,
          width: size.width,
          height: size.height,
        }),
        ...style,
      };
    }
  }, [style, center, fullscreen, size, transform]);

  const transformInnerStyles = React.useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      pointerEvents,
    }),
    [pointerEvents]
  );

  React.useLayoutEffect(() => {
    if (!root.current) return;
    isMeshSizeSet.current = false;
    if (transform) {
      root.current.render(
        <div ref={transformOuterRef} style={styles}>
          <div ref={transformInnerRef} style={transformInnerStyles}>
            <div ref={ref} className={className} style={style}>
              {children}
            </div>
          </div>
        </div>
      );
    } else {
      root.current.render(
        <div ref={ref} style={styles} className={className}>
          {children}
        </div>
      );
    }
  });

  const visible = React.useRef(true);
  useFrame(() => {
    if (!el) return;
    if (group.current) {
      camera.updateMatrixWorld();
      group.current.updateWorldMatrix(true, false);
      const vec = transform
        ? oldPosition.current
        : calculatePosition(group.current, camera, size);
      if (
        transform ||
        Math.abs(oldZoom.current - camera.zoom) > eps ||
        Math.abs(oldPosition.current[0] - vec[0]) > eps ||
        Math.abs(oldPosition.current[1] - vec[1]) > eps
      ) {
        const isBehindCamera = isObjectBehindCamera(group.current, camera);
        let raytraceTarget: any = false;
        if (isRayCastOcclusion) {
          if (Array.isArray(occlude)) {
            raytraceTarget = occlude.map((item) => item.current);
          } else if (occlude !== 'blending') {
            raytraceTarget = [scene];
          }
        }
        const previouslyVisible = visible.current;
        if (raytraceTarget) {
          const isvisible = isObjectVisible(group.current, camera, raycaster, raytraceTarget);
          visible.current = isvisible && !isBehindCamera;
        } else {
          visible.current = !isBehindCamera;
        }
        if (previouslyVisible !== visible.current) {
          if (onOcclude) onOcclude(!visible.current);
          else el.style.display = visible.current ? 'block' : 'none';
        }
        const halfRange = Math.floor(zIndexRange[0] / 2);
        const zRange = occlude
          ? isRayCastOcclusion
            ? [zIndexRange[0], halfRange]
            : [halfRange - 1, 0]
          : zIndexRange;
        const zIdx = objectZIndex(group.current, camera, zRange);
        if (zIdx !== undefined) {
          el.style.zIndex = `${zIdx}`;
        }
        if (transform) {
          const [widthHalf, heightHalf] = [size.width / 2, size.height / 2];
          const fov = camera.projectionMatrix.elements[5] * heightHalf;
          const isOrthographicCamera = camera instanceof OrthographicCamera;
          const cameraMatrix = getCameraCSSMatrix(camera.matrixWorldInverse);
          const cameraTransform = isOrthographicCamera
            ? `scale(${fov})translate(${epsilon(
                -((camera as any).right + (camera as any).left) / 2
              )}px,${epsilon(-((camera as any).top + (camera as any).bottom) / 2)}px)`
            : `translateZ(${fov}px)`;
          let matrix = group.current.matrixWorld;
          if (sprite) {
            matrix = camera.matrixWorldInverse
              .clone()
              .transpose()
              .copyPosition(matrix)
              .scale(group.current.scale);
            matrix.elements[3] = matrix.elements[7] = matrix.elements[11] = 0;
            matrix.elements[15] = 1;
          }
          el.style.width = size.width + 'px';
          el.style.height = size.height + 'px';
          el.style.perspective = isOrthographicCamera ? '' : `${fov}px`;
          if (transformOuterRef.current && transformInnerRef.current) {
            transformOuterRef.current.style.transform = `${cameraTransform}${cameraMatrix}translate(${widthHalf}px,${heightHalf}px)`;
            transformInnerRef.current.style.transform = getObjectCSSMatrix(
              matrix,
              1 / ((distanceFactor || 10) / 400)
            );
          }
        } else {
          const scale =
            distanceFactor === undefined
              ? 1
              : objectScale(group.current, camera) * distanceFactor;
          el.style.transform = `translate3d(${vec[0]}px,${vec[1]}px,0) scale(${scale})`;
        }
        oldPosition.current = vec;
        oldZoom.current = camera.zoom;
      }
    }
    if (!isRayCastOcclusion && occlusionMeshRef.current && !isMeshSizeSet.current) {
      if (transform) {
        if (transformOuterRef.current) {
          const firstChild = transformOuterRef.current.children[0] as HTMLElement | undefined;
          if (firstChild?.clientWidth && firstChild?.clientHeight) {
            const isOrthographicCamera = camera instanceof OrthographicCamera;
            if (isOrthographicCamera || geometry) {
              if (props.scale) {
                if (!Array.isArray(props.scale)) {
                  occlusionMeshRef.current.scale.setScalar(1 / (props.scale as number));
                } else if (props.scale instanceof Vector3) {
                  occlusionMeshRef.current.scale.copy(props.scale.clone().divideScalar(1));
                } else {
                  occlusionMeshRef.current.scale.set(
                    1 / props.scale[0],
                    1 / props.scale[1],
                    1 / props.scale[2]
                  );
                }
              }
            } else {
              const ratio = (distanceFactor || 10) / 400;
              const w = firstChild.clientWidth * ratio;
              const h = firstChild.clientHeight * ratio;
              occlusionMeshRef.current.scale.set(w, h, 1);
            }
            isMeshSizeSet.current = true;
          }
        }
      } else {
        const firstChild = el.children[0] as HTMLElement | undefined;
        if (firstChild?.clientWidth && firstChild?.clientHeight) {
          const ratio = 1 / viewport.factor;
          const w = firstChild.clientWidth * ratio;
          const h = firstChild.clientHeight * ratio;
          occlusionMeshRef.current.scale.set(w, h, 1);
          isMeshSizeSet.current = true;
        }
        occlusionMeshRef.current.lookAt(camera.position);
      }
    }
  });

  const shaders = React.useMemo(
    () => ({
      vertexShader: !transform
        ? /* glsl */ `
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `
        : undefined,
      fragmentShader: /* glsl */ `
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `,
    }),
    [transform]
  );

  return (
    <group {...props} ref={group as any}>
      {occlude && !isRayCastOcclusion && (
        <mesh
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          ref={occlusionMeshRef}
          geometry={geometry || new PlaneGeometry()}
          material={
            material ||
            new ShaderMaterial({
              side: DoubleSide,
              vertexShader: shaders.vertexShader,
              fragmentShader: shaders.fragmentShader,
            })
          }
        />
      )}
    </group>
  );
});
