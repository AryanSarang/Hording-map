"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeHeroBanner() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020617, 5, 22);

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 6.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    keyLight.position.set(2.8, 3.5, 4.5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x34d399, 1.15, 16);
    rimLight.position.set(-2.8, -0.8, 2.8);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0x2563eb, 0.7, 18);
    fillLight.position.set(0, -3, 1.5);
    scene.add(fillLight);

    // Recreates the favicon's network mark in 3D:
    // 7 nodes + links with slight depth and gentle idle motion.
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    const nodePoints = [
      new THREE.Vector3(-1.55, 0.85, 0.25), // top-left
      new THREE.Vector3(-0.15, 1.2, 0.55), // top-mid
      new THREE.Vector3(1.15, 0.7, 0.35), // top-right
      new THREE.Vector3(-1.85, -0.25, 0.15), // mid-left
      new THREE.Vector3(0.15, -0.15, 0.5), // center
      new THREE.Vector3(1.05, -0.95, 0.3), // bottom-right
      new THREE.Vector3(-0.55, -1.2, 0.2), // bottom-mid
    ];

    const edges = [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 6],
      [6, 4],
      [4, 5],
      [4, 2],
      [0, 4],
    ];

    const nodeColors = [
      0x22d3ee, // cyan
      0x38bdf8, // sky
      0x2dd4bf, // teal
      0x3b82f6, // blue
      0x2dd4bf, // teal
      0x4ade80, // green
      0x2dd4bf, // teal
    ];

    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4cc4de,
      emissive: 0x0c4a6e,
      metalness: 0.2,
      roughness: 0.28,
      transparent: true,
      opacity: 0.94,
    });
    const nodeGeom = new THREE.SphereGeometry(0.24, 32, 32);
    const nodes = [];
    const links = [];

    nodePoints.forEach((pos, i) => {
      const node = new THREE.Mesh(
        nodeGeom,
        new THREE.MeshPhysicalMaterial({
          color: nodeColors[i],
          emissive: i === 4 ? 0x115e59 : 0x0e7490,
          emissiveIntensity: i === 4 ? 0.38 : 0.24,
          metalness: 0.18,
          roughness: 0.18,
          clearcoat: 0.7,
          clearcoatRoughness: 0.25,
        })
      );
      node.position.copy(pos);
      node.userData.basePos = pos.clone();
      nodes.push(node);
      networkGroup.add(node);
    });

    edges.forEach(([a, b], idx) => {
      const from = nodePoints[a];
      const to = nodePoints[b];
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const link = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, len, 16),
        edgeMaterial.clone()
      );
      link.position.copy(mid);
      link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      if (idx % 2 === 0) {
        link.material.color.setHex(0x4fbfd8);
      }
      networkGroup.add(link);
      links.push({ mesh: link, a, b });
    });

    networkGroup.scale.setScalar(1.05);
    networkGroup.rotation.set(-0.16, 0.24, -0.18);

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
    const pointerTarget = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onPointerLeave = () => {
      pointerTarget.x = 0;
      pointerTarget.y = 0;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("mouseout", onPointerLeave);

    const clock = new THREE.Clock();
    let frameId = null;
    const animate = () => {
      const t = clock.getElapsedTime();
      pointer.x += (pointerTarget.x - pointer.x) * 0.08;
      pointer.y += (pointerTarget.y - pointer.y) * 0.08;

      networkGroup.rotation.y += ((0.24 + pointer.x * 0.24) - networkGroup.rotation.y) * 0.045;
      networkGroup.rotation.x += ((-0.16 + pointer.y * 0.18) - networkGroup.rotation.x) * 0.045;
      networkGroup.rotation.z = -0.18 + Math.sin(t * 0.55) * 0.02;
      networkGroup.position.x += (pointer.x * 0.34 - networkGroup.position.x) * 0.04;
      networkGroup.position.y += (pointer.y * 0.26 - networkGroup.position.y) * 0.04;
      networkGroup.scale.x = 1.05 + Math.abs(pointer.x) * 0.035 + Math.sin(t * 0.9) * 0.008;
      networkGroup.scale.y = 1.05 + Math.abs(pointer.y) * 0.03 + Math.cos(t * 0.8) * 0.008;
      networkGroup.scale.z = 1.05 + (Math.abs(pointer.x) + Math.abs(pointer.y)) * 0.02;

      camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.04;
      camera.position.y += (pointer.y * 0.22 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      nodes.forEach((node, i) => {
        const base = node.userData.basePos;
        const dx = base.x - pointer.x * 1.35;
        const dy = base.y - pointer.y * 1.35;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 2.1);
        node.position.x = base.x + Math.sin(t * 1.2 + i * 0.35) * 0.012 + pointer.x * influence * 0.1;
        node.position.y = base.y + Math.cos(t * 1.05 + i * 0.42) * 0.014 + pointer.y * influence * 0.08;
        node.position.z = base.z + Math.sin(t * 1.4 + i * 0.4) * 0.012 + influence * 0.05;
        const scaleBoost = 1 + influence * 0.16 + Math.sin(t * 1.8 + i * 0.25) * 0.02;
        node.scale.setScalar(scaleBoost);
      });

      links.forEach(({ mesh, a, b }, idx) => {
        const from = nodes[a].position;
        const to = nodes[b].position;
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = dir.length();
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        mesh.position.copy(mid);
        mesh.scale.y = len / mesh.geometry.parameters.height;
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        mesh.material.emissiveIntensity = 0.45 + Math.sin(t * 1.1 + idx * 0.4) * 0.08 + Math.abs(pointer.x) * 0.06;
      });

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
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mouseout", onPointerLeave);
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
