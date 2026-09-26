"use client";

import { Bounds, Center, ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

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
          <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
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
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!ready || !captureAngles || !onRenders || !controls.current) return;
    const renders: string[] = [];
    try {
      for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
        controls.current.setAzimuthalAngle(angle);
        controls.current.update();
        gl.render(scene, camera);
        renders.push(gl.domElement.toDataURL("image/png"));
      }
    } catch (error) {
      console.error("[ModelViewer] couldn't capture pitch render", error);
      onRenderError?.();
      return;
    }
    onRenders(renders);
  }, [camera, captureAngles, gl, onRenderError, onRenders, ready, scene]);

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: captureAngles }}
        camera={{ position: [160, 120, 200], fov: 35, near: 0.1, far: 20000 }}
        aria-label="3D view of the uploaded part. Drag to rotate, scroll to zoom."
      >
        {captureAngles && <color attach="background" args={["#f6f4ef"]} />}
        <hemisphereLight args={["#ffffff", "#8d8a84", 1.2]} />
        <directionalLight position={[300, 500, 200]} intensity={2.4} />
        <directionalLight position={[-300, 200, -250]} intensity={0.8} />
        {/* r3f runs its own reconciler, so Suspense must sit inside the Canvas. */}
        <Suspense fallback={null}>
          <Part url={url} onReady={markReady} />
        </Suspense>
        <OrbitControls ref={controls} makeDefault autoRotate={autoRotate} autoRotateSpeed={1.4} />
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
