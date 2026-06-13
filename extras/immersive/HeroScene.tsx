"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vGlow;
  varying float vFade;

  // 2D pseudo-noise built from sines - cheap and stable
  float wave(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 0.55 + t * 0.6) * 0.5;
    h += sin(p.y * 0.4 - t * 0.4) * 0.45;
    h += sin((p.x + p.y) * 0.28 + t * 0.25) * 0.7;
    h += sin(length(p) * 0.5 - t * 0.7) * 0.25;
    return h;
  }

  void main() {
    vec3 pos = position;
    float t = uTime;
    float h = wave(pos.xz * 0.6, t);

    // mouse pushes a soft hill toward the pointer
    vec2 m = uMouse * 14.0;
    float d = distance(pos.xz, m);
    float bump = smoothstep(9.0, 0.0, d) * 1.7;

    pos.y += h * 0.9 + bump;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = clamp(1.0 - (-mv.z - 4.0) / 34.0, 0.0, 1.0);
    vFade = depth;
    vGlow = smoothstep(0.4, 1.6, h * 0.9 + bump) + bump * 0.35;

    gl_PointSize = (1.1 + depth * 2.4 + vGlow * 1.6) * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vGlow;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, r);

    vec3 ink = vec3(0.45, 0.44, 0.40);
    vec3 acid = vec3(0.718, 1.0, 0.165);
    vec3 cyan = vec3(0.415, 0.957, 1.0);
    vec3 col = mix(ink, acid, clamp(vGlow, 0.0, 1.0));
    col = mix(col, cyan, smoothstep(1.2, 2.0, vGlow) * 0.6);

    gl_FragColor = vec4(col, alpha * (0.12 + vFade * 0.75));
  }
`;

/**
 * WebGL particle terrain for the hero: a dot-matrix plane that swells
 * like a slow signal, leans with the pointer, and sinks away on scroll.
 *
 * three.js is loaded lazily (dynamic import inside the effect) so its
 * ~125KB of JS stays off the initial bundle and only downloads once this
 * decorative scene actually mounts on the client.
 */
export default function AxHeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    import("three").then((THREE) => {
      if (cancelled || !mount) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
      } catch {
        return;
      }
      const dpr = Math.min(window.devicePixelRatio, 1.75);
      renderer.setPixelRatio(dpr);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x070807, 10, 38);
      const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
      camera.position.set(0, 4.6, 13.5);
      camera.lookAt(0, 0.4, 0);

      const COLS = 220;
      const ROWS = 110;
      const W = 56;
      const D = 30;
      const count = COLS * ROWS;
      const positions = new Float32Array(count * 3);
      const rands = new Float32Array(count);
      let i = 0;
      for (let z = 0; z < ROWS; z++) {
        for (let x = 0; x < COLS; x++) {
          positions[i * 3] = (x / (COLS - 1) - 0.5) * W;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (z / (ROWS - 1) - 0.5) * D - 4;
          rands[i] = Math.random();
          i++;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: dpr },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onPointer = (e: PointerEvent) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      };
      window.addEventListener("pointermove", onPointer);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = mount;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      // Pause rendering when the hero is off screen
      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
      io.observe(mount);

      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const t = clock.getElapsedTime();
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;
        uniforms.uTime.value = t;
        uniforms.uMouse.value.set(mouse.x * 0.6, -0.55 + mouse.y * 0.25);

        const scroll = Math.min(window.scrollY / window.innerHeight, 1.2);
        camera.position.x = mouse.x * 1.1;
        camera.position.y = 4.6 + mouse.y * 0.5 + scroll * 2.4;
        camera.lookAt(0, 0.4 - scroll * 1.6, 0);
        points.position.y = -scroll * 1.8;

        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <div ref={mountRef} className="ax-hero-canvas" aria-hidden />;
}
