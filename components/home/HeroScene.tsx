"use client";

import { Center, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Suspense, useMemo, useRef } from "react";
import type { Group } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

// The landing hero: the real demo part in anodized aluminum, turning slowly
// and leaning toward the pointer. Reflections come from Lightformer panels
// (a procedural studio), so nothing is downloaded at runtime.

const MODEL_URL = "/models/pedal-enclosure.stl";
const SPIN_RAD_PER_S = 0.18;
const TILT = 0.25;
const BASE_TILT_X = 0.55;

function Part({ reduceMotion }: { reduceMotion: boolean }) {
  const geometry = useLoader(STLLoader, MODEL_URL);
  const group = useRef<Group>(null);

  useMemo(() => {
    geometry.computeVertexNormals();
  }, [geometry]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    if (!reduceMotion) g.rotation.y += delta * SPIN_RAD_PER_S;
    // Ease toward the pointer for a little parallax.
    // Base tilt shows the top face (footswitch and knob holes) to the camera.
    const targetX = BASE_TILT_X - state.pointer.y * TILT * 0.5;
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 3);
  });

  return (
    <group ref={group} position={[1.0, -0.45, 0]} rotation={[BASE_TILT_X, 0.6, 0]}>
      <Center>
        {/* STL is Z-up; three.js is Y-up. */}
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} scale={0.017}>
          {/* Brushed anodized aluminum. */}
          <meshStandardMaterial color="#c3c7cc" metalness={0.9} roughness={0.36} envMapIntensity={1.35} />
        </mesh>
      </Center>
    </group>
  );
}

function Studio() {
  return (
    <Environment resolution={256}>
      {/* Big overhead softbox: gives the top face (the one with the holes) something to reflect. */}
      <Lightformer form="rect" intensity={2.4} position={[0, 7, 1]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 1.5, 1]} rotation-x={Math.PI / 2.5} />
      <Lightformer form="rect" intensity={2} position={[-5, 1, 1]} scale={[1, 6, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.2} color="#ffb48a" position={[5, 0.5, -1]} scale={[1, 5, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={0.8} position={[0, 0, -6]} scale={4} />
    </Environment>
  );
}

export default function HeroScene() {
  const reduceMotion = Boolean(useReducedMotion());
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.6, 7], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <Suspense fallback={null}>
        <Part reduceMotion={reduceMotion} />
        <Studio />
        <ContactShadows position={[0, -1.1, 0]} scale={9} far={3} blur={2.8} opacity={0.55} color="#000000" />
      </Suspense>
    </Canvas>
  );
}
