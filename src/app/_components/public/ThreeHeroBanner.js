"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeHeroBanner() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 5, 24);

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0x60a5fa, 1.1);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x22d3ee, 1.2, 20);
    rimLight.position.set(-3, -1, 3);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const torus = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.05, 0.28, 260, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e40af,
        metalness: 0.72,
        roughness: 0.25,
        transmission: 0.08,
        transparent: true,
        opacity: 0.95,
      })
    );
    group.add(torus);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0c4a6e,
        metalness: 0.35,
        roughness: 0.4,
      })
    );
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.06, 24, 240),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x082f49,
        metalness: 0.6,
        roughness: 0.35,
      })
    );
    ring.rotation.x = 1.25;
    group.add(ring);

    const billboardGroup = new THREE.Group();
    scene.add(billboardGroup);
    const boardGeom = new THREE.BoxGeometry(0.9, 0.58, 0.06);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0f172a,
      metalness: 0.2,
      roughness: 0.3,
    });
    const boardCount = 9;
    for (let i = 0; i < boardCount; i++) {
      const board = new THREE.Mesh(boardGeom, boardMat.clone());
      const angle = (i / boardCount) * Math.PI * 2;
      const radius = 3.05 + (i % 2) * 0.25;
      board.position.set(Math.cos(angle) * radius, (i % 3 - 1) * 0.6, Math.sin(angle) * radius);
      board.lookAt(0, 0, 0);
      board.rotation.z += (i % 2 ? 1 : -1) * 0.09;
      board.material.color.setHSL(0.56 + i * 0.015, 0.72, 0.58);
      billboardGroup.add(board);
    }

    const particlesCount = 1800;
    const particlesGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 22;
    }
    particlesGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeom,
      new THREE.PointsMaterial({
        size: 0.025,
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.85,
      })
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    mount.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let frameId = null;
    const animate = () => {
      const t = clock.getElapsedTime();
      torus.rotation.x = t * 0.22 + pointer.y * 0.25;
      torus.rotation.y = t * 0.35 + pointer.x * 0.35;
      core.rotation.x = t * 0.18;
      core.rotation.y = t * 0.24;
      ring.rotation.z = t * 0.12;
      group.position.x += (pointer.x * 0.7 - group.position.x) * 0.04;
      group.position.y += (pointer.y * 0.45 - group.position.y) * 0.04;
      billboardGroup.rotation.y = -t * 0.11;
      billboardGroup.position.x += (pointer.x * 0.35 - billboardGroup.position.x) * 0.03;
      billboardGroup.position.y += (pointer.y * 0.2 - billboardGroup.position.y) * 0.03;
      particles.rotation.y = t * 0.03;
      particles.rotation.x = t * 0.01;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointermove", onPointerMove);
      if (frameId) cancelAnimationFrame(frameId);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="hero-three-canvas h-full w-full" />;
}
