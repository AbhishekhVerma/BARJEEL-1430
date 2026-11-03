import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2, Radio, Activity } from 'lucide-react';
import type { OrbitalTelemetryPacket } from '../../types/contracts';

interface OrbitalTwinPiPProps {
  telemetry: OrbitalTelemetryPacket | null;
}

export function OrbitalTwinPiP({ telemetry }: OrbitalTwinPiPProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [eulerDeg, setEulerDeg] = useState<{ roll: number; pitch: number; yaw: number }>({
    roll: 0,
    pitch: 0,
    yaw: 0,
  });

  const satGroupRef = useRef<THREE.Group | null>(null);
  const radiatorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);

  const targetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion(0, 0, 0, 1));
  const currentTempRef = useRef<number>(42.0);

  // Update target quaternion and temperature when telemetry changes
  useEffect(() => {
    if (!telemetry) return;

    const { q0, q1, q2, q3, temp_c } = telemetry.adcs;
    // THREE.Quaternion(x, y, z, w) where w is q0, x=q1, y=q2, z=q3
    targetQuatRef.current.set(q1, q2, q3, q0).normalize();

    if (temp_c !== undefined) {
      currentTempRef.current = temp_c;
    }
  }, [telemetry]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 288;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.04);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.2, 2.0, 4.5);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x475569, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(6, 4, 5);
    scene.add(sunLight);

    const nadirEarthLight = new THREE.DirectionalLight(0x0284c7, 1.2);
    nadirEarthLight.position.set(0, -6, 0);
    scene.add(nadirEarthLight);

    // Satellite Main Assembly
    const satGroup = new THREE.Group();
    satGroupRef.current = satGroup;
    scene.add(satGroup);

    // 3U CubeSat Chassis (1.0 x 3.0 x 1.0)
    const chassisGeo = new THREE.BoxGeometry(1.0, 3.0, 1.0);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.28,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    satGroup.add(chassis);

    // Chassis structural frame edges
    const frameEdges = new THREE.EdgesGeometry(chassisGeo);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const wireframe = new THREE.LineSegments(frameEdges, frameMat);
    chassis.add(wireframe);

    // Gold Kapton S-Band Patch Antenna (+Y top face)
    const patchGeo = new THREE.BoxGeometry(0.68, 0.06, 0.68);
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });
    const patchMesh = new THREE.Mesh(patchGeo, patchMat);
    patchMesh.position.set(0, 1.53, 0);
    satGroup.add(patchMesh);

    // EO Lens / Nadir Payload Aperture on bottom face (-Y)
    const opticsGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.12, 24);
    const opticsMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.1,
      emissive: new THREE.Color(0x06b6d4),
      emissiveIntensity: 0.3,
    });
    const optics = new THREE.Mesh(opticsGeo, opticsMat);
    optics.position.set(0, -1.54, 0);
    satGroup.add(optics);

    // Gold Aperture Reticle Ring
    const ringGeo = new THREE.TorusGeometry(0.32, 0.02, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.58, 0);
    satGroup.add(ring);

    // Deployable Solar Panel Wings (+X and -X)
    const wingGeo = new THREE.BoxGeometry(1.5, 2.6, 0.04);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0c1e38,
      metalness: 0.7,
      roughness: 0.35,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.3, 0, 0);
    const leftWingEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wingGeo),
      new THREE.LineBasicMaterial({ color: 0x0284c7 })
    );
    leftWing.add(leftWingEdges);
    satGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.3, 0, 0);
    const rightWingEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wingGeo),
      new THREE.LineBasicMaterial({ color: 0x0284c7 })
    );
    rightWing.add(rightWingEdges);
    satGroup.add(rightWing);

    // Rear Thermal Radiator Panel (+Z face)
    const radiatorGeo = new THREE.BoxGeometry(0.84, 2.7, 0.04);
    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.75,
      emissive: new THREE.Color(0x06b6d4),
      emissiveIntensity: 0.6,
    });
    radiatorMatRef.current = radiatorMat;

    const radiatorMesh = new THREE.Mesh(radiatorGeo, radiatorMat);
    radiatorMesh.position.set(0, 0, 0.52);
    satGroup.add(radiatorMesh);

    // Earth Nadir Sphere below
    const earthGeo = new THREE.SphereGeometry(6, 28, 20);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, -8.8, 0);
    earthRef.current = earth;
    scene.add(earth);

    // Nadir alignment cone / dashed beam pointing to Earth
    const nadirBeamGeo = new THREE.CylinderGeometry(0.04, 0.8, 4.0, 12, 1, true);
    const nadirBeamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const nadirBeam = new THREE.Mesh(nadirBeamGeo, nadirBeamMat);
    nadirBeam.position.set(0, -3.6, 0);
    satGroup.add(nadirBeam);

    // Animation Loop
    let animId: number;
    let frameCount = 0;
    const tempColor = new THREE.Color();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth SLERP towards target quaternion
      if (satGroupRef.current) {
        satGroupRef.current.quaternion.slerp(targetQuatRef.current, 0.12);

        // Update Roll/Pitch/Yaw every 6 frames for UI
        frameCount++;
        if (frameCount % 6 === 0) {
          const euler = new THREE.Euler().setFromQuaternion(satGroupRef.current.quaternion, 'YXZ');
          setEulerDeg({
            roll: Math.round(THREE.MathUtils.radToDeg(euler.z) * 10) / 10,
            pitch: Math.round(THREE.MathUtils.radToDeg(euler.x) * 10) / 10,
            yaw: Math.round(THREE.MathUtils.radToDeg(euler.y) * 10) / 10,
          });
        }
      }

      // Rotate Earth slowly for visual dynamism
      if (earthRef.current) {
        earthRef.current.rotation.y += 0.001;
      }

      // Dynamic Radiator Emissive Glow
      if (radiatorMatRef.current) {
        const temp = currentTempRef.current;
        if (temp < 38.0) {
          tempColor.set(0x06b6d4); // Cool Cyan
          radiatorMatRef.current.emissive.lerp(tempColor, 0.1);
          radiatorMatRef.current.emissiveIntensity = 0.45;
        } else if (temp < 44.0) {
          tempColor.set(0xf59e0b); // Warm Amber
          radiatorMatRef.current.emissive.lerp(tempColor, 0.1);
          radiatorMatRef.current.emissiveIntensity = 0.75;
        } else {
          tempColor.set(0xef4444); // Glowing Crimson Peak
          radiatorMatRef.current.emissive.lerp(tempColor, 0.15);
          radiatorMatRef.current.emissiveIntensity = 1.15;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      chassisGeo.dispose();
      chassisMat.dispose();
      frameEdges.dispose();
      frameMat.dispose();
      patchGeo.dispose();
      patchMat.dispose();
      opticsGeo.dispose();
      opticsMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      wingGeo.dispose();
      wingMat.dispose();
      radiatorGeo.dispose();
      radiatorMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      nadirBeamGeo.dispose();
      nadirBeamMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const tempVal = telemetry?.adcs.temp_c ?? 42.0;
  const nadirLocked = telemetry?.adcs.nadir_locked ?? true;
  const tempBadgeColor =
    tempVal < 38.0
      ? 'border-cyan-500/40 text-cyan-400 bg-cyan-950/60'
      : tempVal < 44.0
      ? 'border-amber-500/40 text-amber-400 bg-amber-950/60'
      : 'border-red-500/50 text-red-400 bg-red-950/70 animate-pulse';

  const formatMet = (ms?: number) => {
    if (ms === undefined) return 'MET 00:02:28';
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `MET ${hrs}:${mins}:${secs}`;
  };

  return (
    <div
      className={`pointer-events-auto relative flex flex-col rounded-xl border border-cyan-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md transition-all duration-300 ${
        isMinimized ? 'w-64 h-12 overflow-hidden' : 'w-72 sm:w-80 h-72'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 px-3 py-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-cyan-400">
          <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>3U CUBESAT // BARJEEL-1430</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 text-[9px] text-cyan-300">
            {telemetry?.flight_mode || 'THERMAL_PEAK_1430'}
          </span>
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
            title={isMinimized ? 'Expand PiP' : 'Minimize PiP'}
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="relative flex-1">
          {/* Three.js Canvas Mount */}
          <div ref={mountRef} className="h-full w-full" />

          {/* HUD Attitude & Thermal Overlays */}
          <div className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1 text-[10px] font-mono">
            <span className="rounded bg-slate-950/80 px-1.5 py-0.5 text-cyan-300 border border-cyan-500/30">
              {formatMet(telemetry?.met_ms)} · {telemetry?.solar_local_time || '14:30 GST'}
            </span>
            <div className="rounded bg-slate-950/80 px-1.5 py-0.5 text-slate-300 border border-slate-700/50">
              R:{eulerDeg.roll}° P:{eulerDeg.pitch}° Y:{eulerDeg.yaw}°
            </div>
            <div className="flex items-center gap-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 border border-slate-700/50">
              <span className="relative flex h-2 w-2">
                {nadirLocked && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    nadirLocked ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className={nadirLocked ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {nadirLocked ? 'NADIR: LOCKED' : 'NADIR: ACQUIRING'}
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-2 right-2 flex flex-col items-end gap-1 text-[10px] font-mono">
            <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 border ${tempBadgeColor}`}>
              <Activity className="h-3 w-3" />
              <span>RAD: {tempVal.toFixed(1)}°C</span>
            </div>
            <span className="rounded bg-slate-950/70 px-1.5 py-0.5 text-[9px] text-slate-400 border border-slate-800">
              Q[{telemetry?.adcs.q0?.toFixed(2) ?? '1.00'}, {telemetry?.adcs.q1?.toFixed(2) ?? '0.00'},{' '}
              {telemetry?.adcs.q2?.toFixed(2) ?? '0.00'}, {telemetry?.adcs.q3?.toFixed(2) ?? '0.00'}]
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
