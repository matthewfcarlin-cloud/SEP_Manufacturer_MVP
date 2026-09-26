"use client";

import { Bounds, Center, ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box3, PerspectiveCamera, Sphere, Spherical, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RENDER_ANGLES, STUDIO_BACKDROP } from "./renderAngles";

export type ModelViewerProps = {
  url: string;
  autoRotate?: boolean;
  className?: string;
  captureAngles?: boolean;
  onRenders?: (renders: string[]) => void;
  onRenderError?: () => void;
};

function Part({ url, onReady }: { url: string; onReady: () => void }) {
  const geometry = useLoader(STLLoader, url);
  useEffect(() => {
    onReady();
  }, [onReady]);

  const size = useMemo(() => {
    // Some exporters write zero normals; recompute so shading is always right.
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
  }, [geometry]);

  return (
    <>
      <Bounds fit clip observe margin={1.4}>
        <Center top>
          {/* STL is Z-up; three.js is Y-up. */}
          <mesh name={PART_NAME} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#b9bec6" metalness={0.25} roughness={0.42} />
          </mesh>
        </Center>
      </Bounds>
      <ContactShadows position={[0, 0, 0]} scale={size * 3} far={size} blur={2.4} opacity={0.45} />
    </>
  );
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; onRenderError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ModelViewer] failed to render model", error);
    this.props.onRenderError?.();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          Couldn&apos;t display this model. The file may be corrupt; try re-exporting it as STL.
        </div>
      );
    }
    return this.props.children;
  }
}

const PART_NAME = "idlefit-part";
/** Extra room around the part's bounding sphere in pitch renders. */
const RENDER_MARGIN = 1.1;
/** Lets a visible tab draw a few frames (contact shadow) before capture. */
const CAPTURE_DELAY_MS = 400;

/**
 * Lives inside the Canvas (r3f hooks throw anywhere else). Once the part has
 * loaded, frames the camera on the part's bounding sphere for each studio
 * angle, renders synchronously, and hands back PNG data URLs. It does not
 * depend on animation frames, so it also works in a background tab, where
 * requestAnimationFrame is paused and <Bounds> never finishes fitting.
 */
function RenderCapture({
  ready,
  onRenders,
  onError,
}: {
  ready: boolean;
  onRenders: (renders: string[]) => void;
  onError?: () => void;
}) {
  const { gl, scene, camera } = useThree();
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    const timer = setTimeout(() => {
      const part = scene.getObjectByName(PART_NAME);
      if (!part || !(camera instanceof PerspectiveCamera)) return;
      done.current = true;

      const sphere = new Box3().setFromObject(part).getBoundingSphere(new Sphere());
      const halfFov = (camera.fov * Math.PI) / 360;
      const distance = (sphere.radius / Math.sin(halfFov)) * RENDER_MARGIN;
      const home = { position: camera.position.clone(), target: controls?.target.clone() };

      try {
        const renders = RENDER_ANGLES.map(({ azimuth, polar }) => {
          const offset = new Vector3().setFromSpherical(new Spherical(distance, polar, azimuth));
          camera.position.copy(sphere.center).add(offset);
          camera.lookAt(sphere.center);
          camera.updateMatrixWorld();
          gl.render(scene, camera);
          return gl.domElement.toDataURL("image/png");
        });
        onRenders(renders);
      } catch (error) {
        console.error("[ModelViewer] couldn't capture pitch renders", error);
        onError?.();
      } finally {
        camera.position.copy(home.position);
        if (controls && home.target) {
          controls.target.copy(home.target);
          controls.update();
        }
      }
    }, CAPTURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, gl, scene, camera, controls, onRenders, onError]);

  return null;
}

// drei's <Html> can't be the Suspense fallback here: it mounts its own React
// root, which React 19 refuses to unmount mid-render. A DOM overlay it is.
function Scene({
  url,
  autoRotate,
  captureAngles,
  onRenders,
  onRenderError,
}: {
  url: string;
  autoRotate: boolean;
  captureAngles: boolean;
  onRenders?: (renders: string[]) => void;
  onRenderError?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const markReady = useMemo(() => () => setReady(true), []);

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        // Needed so toDataURL() can read back what was drawn.
        gl={{ preserveDrawingBuffer: captureAngles }}
        camera={{ position: [160, 120, 200], fov: 35, near: 0.1, far: 20000 }}
        aria-label="3D view of the uploaded part. Drag to rotate, scroll to zoom."
      >
        {captureAngles && <color attach="background" args={[STUDIO_BACKDROP]} />}
        <hemisphereLight args={["#ffffff", "#8d8a84", 1.2]} />
        <directionalLight position={[300, 500, 200]} intensity={2.4} />
        <directionalLight position={[-300, 200, -250]} intensity={0.8} />
        {/* r3f runs its own reconciler, so Suspense must sit inside the Canvas. */}
        <Suspense fallback={null}>
          <Part url={url} onReady={markReady} />
        </Suspense>
        <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.4} />
        {captureAngles && onRenders && (
          <RenderCapture ready={ready} onRenders={onRenders} onError={onRenderError} />
        )}
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
          Loading model…
        </div>
      )}
    </>
  );
}

export default function ModelViewer({
  url,
  autoRotate = true,
  className = "",
  captureAngles = false,
  onRenders,
  onRenderError,
}: ModelViewerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface to-bg ${className}`}
    >
      <ViewerErrorBoundary key={url} onRenderError={onRenderError}>
        <Scene
          url={url}
          autoRotate={autoRotate}
          captureAngles={captureAngles}
          onRenders={onRenders}
          onRenderError={onRenderError}
        />
      </ViewerErrorBoundary>
    </div>
  );
}
