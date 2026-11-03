import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ChevronDown,
  ChevronUp,
  Radio,
  Compass,
  Thermometer,
  ShieldAlert,
  Orbit,
} from 'lucide-react';
import type { OrbitalTelemetryPacket } from '../../types/contracts';

interface OrbitalTwinPiPProps {
  telemetry: OrbitalTelemetryPacket | null;
}

export const OrbitalTwinPiP: React.FC<OrbitalTwinPiPProps> = ({ telemetry }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeSatGroupRef = useRef<THREE.Group | null>(null);
  const radiatorMeshRef = useRef<THREE.Mesh | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Aerospace Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(4, 5, 3);
    scene.add(sunLight);

    const earthAlbedoLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    earthAlbedoLight.position.set(-3, -3, -2);
    scene.add(earthAlbedoLight);

    // Rotating Wireframe Earth Backdrop
    const earthGeo = new THREE.SphereGeometry(3.2, 22, 22);
    const earthMat = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x0284c7,
      transparent: true,
      opacity: 0.18,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, -3.8, -2.5);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 3U CubeSat Root Group
    const satGroup = new THREE.Group();
    scene.add(satGroup);
    cubeSatGroupRef.current = satGroup;

    // 1. Aluminum Chassis (3U Body ~ 10cm x 10cm x 30cm => 0.8 x 2.4 x 0.8 in 3D units)
    const chassisGeo = new THREE.BoxGeometry(0.8, 2.4, 0.8);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.88,
      roughness: 0.22,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    satGroup.add(chassisMesh);

    // Black frame rails on 3U edges
    const railsGeo = new THREE.BoxGeometry(0.82, 2.42, 0.82);
    const railsMat = new THREE.MeshBasicMaterial({
      color: 0x18181b,
      wireframe: true,
    });
    const railsMesh = new THREE.Mesh(railsGeo, railsMat);
    satGroup.add(railsMesh);

    // 2. Solar Panel Wings (Deployable Left & Right)
    const wingGeo = new THREE.BoxGeometry(1.5, 2.1, 0.04);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x091e3a,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0x041324,
      emissiveIntensity: 0.4,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.18, 0, 0);
    satGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.18, 0, 0);
    satGroup.add(rightWing);

    // Gold Kapton foil patch antenna on nadir face
    const patchGeo = new THREE.BoxGeometry(0.45, 0.45, 0.05);
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.1,
    });
    const patchMesh = new THREE.Mesh(patchGeo, patchMat);
    patchMesh.position.set(0, -1.22, 0);
    satGroup.add(patchMesh);

    // 3. Thermal Radiator Mesh (Dynamic Blue -> Amber -> Crimson)
    const radiatorGeo = new THREE.BoxGeometry(0.65, 1.4, 0.04);
    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    const radiatorMesh = new THREE.Mesh(radiatorGeo, radiatorMat);
    radiatorMesh.position.set(0, 0.2, 0.42);
    satGroup.add(radiatorMesh);
    radiatorMeshRef.current = radiatorMesh;

    // Render loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Rotate Earth backdrop
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.0015;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      chassisGeo.dispose();
      chassisMat.dispose();
      railsGeo.dispose();
      railsMat.dispose();
      wingGeo.dispose();
      wingMat.dispose();
      radiatorGeo.dispose();
      radiatorMat.dispose();
      patchGeo.dispose();
      patchMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Attitude Quaternion & Thermal Color from Telemetry
  useEffect(() => {
    if (!telemetry) return;

    // Update Attitude
    if (cubeSatGroupRef.current && telemetry.adcs) {
      const { q0, q1, q2, q3 } = telemetry.adcs;
      const q = new THREE.Quaternion(q1, q2, q3, q0);
      cubeSatGroupRef.current.setRotationFromQuaternion(q);
    }

    // Update Thermal Radiator Color based on temperature
    if (radiatorMeshRef.current && radiatorMeshRef.current.material) {
      const mat = radiatorMeshRef.current.material as THREE.MeshStandardMaterial;
      const tempC = telemetry.adcs?.temp_c ?? 42.0;

      if (tempC < 42.0) {
        // Nominal: Cool Cyan/Blue
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x0284c7);
        mat.emissiveIntensity = 0.3;
      } else if (tempC < 45.0) {
        // Warning: Amber
        mat.color.setHex(0xf59e0b);
        mat.emissive.setHex(0xd97706);
        mat.emissiveIntensity = 0.5;
      } else {
        // 14:30 Peak Stress: Crimson
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0xb91c1c);
        mat.emissiveIntensity = 0.8;
      }
    }
  }, [telemetry]);

  const adcs = telemetry?.adcs;
  const tempC = adcs?.temp_c ?? 42.8;

  const tempColorClass =
    tempC >= 45.0 ? 'text-rose-400' : tempC >= 42.0 ? 'text-amber-400' : 'text-cyan-400';

  return (
    <div className="pointer-events-auto select-none overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/85 shadow-2xl backdrop-blur-xl transition-all duration-300 w-80 md:w-96">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                adcs?.nadir_locked ? 'bg-cyan-400' : 'bg-amber-400'
              } opacity-75`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                adcs?.nadir_locked ? 'bg-cyan-500' : 'bg-amber-500'
              }`}
            />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">
            RUYA 3U CUBESAT // DIGITAL TWIN
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded bg-cyan-950/70 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-800/50">
            {telemetry?.flight_mode === 'THERMAL_PEAK_1430'
              ? '14:30 PEAK'
              : telemetry?.flight_mode || 'LEO 3U'}
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            title={collapsed ? 'Expand PiP' : 'Collapse PiP'}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas Container */}
      {!collapsed && (
        <div className="relative">
          <div ref={mountRef} className="h-48 w-full bg-slate-950/90" />

          {/* Attitude / ADCS Stats Overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/75 px-2.5 py-1.5 text-[11px] font-mono backdrop-blur-md">
            <div className="flex items-center gap-1 text-slate-300">
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>
                Q: [{adcs?.q0?.toFixed(2) ?? '1.00'}, {adcs?.q1?.toFixed(2) ?? '0.00'},{' '}
                {adcs?.q2?.toFixed(2) ?? '0.00'}, {adcs?.q3?.toFixed(2) ?? '0.00'}]
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Thermometer className={`h-3.5 w-3.5 ${tempColorClass}`} />
              <span className={`font-semibold ${tempColorClass}`}>{tempC.toFixed(1)}°C</span>
            </div>
          </div>

          {/* Nadir Lock Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono uppercase ${
                adcs?.nadir_locked
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
              }`}
            >
              <Orbit className="h-3 w-3" />
              {adcs?.nadir_locked ? 'NADIR LOCKED' : 'SEARCHING NADIR'}
            </span>
          </div>

          {/* 14:30 GST badge */}
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/40">
              <Radio className="h-3 w-3 animate-pulse" />
              {telemetry?.solar_local_time || '14:30 GST'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
