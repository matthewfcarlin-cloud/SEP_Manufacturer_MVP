"use client";

import { Bounds, Center, ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type ModelViewerProps = {
  url: string;
  autoRotate?: boolean;
  className?: string;
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

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ModelViewer] failed to render model", error);
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
function Scene({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const [ready, setReady] = useState(false);
  const markReady = useMemo(() => () => setReady(true), []);

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [160, 120, 200], fov: 35, near: 0.1, far: 20000 }}
        aria-label="3D view of the uploaded part. Drag to rotate, scroll to zoom."
      >
        <hemisphereLight args={["#ffffff", "#8d8a84", 1.2]} />
        <directionalLight position={[300, 500, 200]} intensity={2.4} />
        <directionalLight position={[-300, 200, -250]} intensity={0.8} />
        {/* r3f runs its own reconciler, so Suspense must sit inside the Canvas. */}
        <Suspense fallback={null}>
          <Part url={url} onReady={markReady} />
        </Suspense>
        <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.4} />
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
          Loading model…
        </div>
      )}
    </>
  );
}

export default function ModelViewer({ url, autoRotate = true, className = "" }: ModelViewerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface to-bg ${className}`}
    >
      <ViewerErrorBoundary key={url}>
        <Scene url={url} autoRotate={autoRotate} />
      </ViewerErrorBoundary>
    </div>
  );
}
