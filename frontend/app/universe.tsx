"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { colors, type Evidence } from "./model";

export default function Universe({
  data,
  selected,
  pick,
  cameraAction,
  motion,
}: {
  data: Evidence;
  selected?: string;
  pick: (id: string) => void;
  cameraAction: { type: string; tick: number };
  motion: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef({ selected, pick, cameraAction, motion });
  const previousNodes = useRef(new Set<string>());
  useEffect(() => {
    actions.current = { selected, pick, cameraAction, motion };
  }, [selected, pick, cameraAction, motion]);

  useEffect(() => {
    const root = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      root.dataset.fallback = "true";
      return;
    }
    delete root.dataset.fallback;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.domElement.setAttribute("aria-hidden", "true");
    root.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 110);
    camera.position.set(0, 11, 26);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 65;

    const dots: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] =
      [];
    const positions = new Map<string, THREE.Vector3>();
    const groups = new Map<string, number>();
    const groupOffsets = new Map<string, number>();
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const oldNodes = previousNodes.current;
    const firstGraph = !oldNodes.size && data.nodes.length > 0;
    previousNodes.current = new Set(data.nodes.map((node) => node.id));
    data.nodes.forEach((node, index) => {
      const group = groups.get(node.department) ?? groups.size;
      groups.set(node.department, group);
      const occurrence = groupOffsets.get(node.department) ?? 0;
      groupOffsets.set(node.department, occurrence + 1);
      const angle = group * 2.399963;
      const radius = Math.min(11, 2 + Math.sqrt(group) * 1.65);
      const localAngle = occurrence * 2.399963;
      const localRadius = Math.sqrt(occurrence) * 0.37;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius + Math.cos(localAngle) * localRadius,
        Math.sin(index * 1.71) * 2.95,
        Math.sin(angle) * radius * 0.66 + Math.sin(localAngle) * localRadius,
      );
      positions.set(node.id, pos);
      const dot = new THREE.Mesh(
        sphere,
        new THREE.MeshBasicMaterial({ color: colors[node.kind] ?? "#d7d6ee" }),
      );
      dot.position.copy(pos);
      dot.userData = {
        id: node.id,
        size: node.kind === "department" ? 0.19 : 0.105,
      };
      scene.add(dot);
      dots.push(dot);
    });

    const active = data.edges.flatMap((edge) => {
      const from = positions.get(edge.source),
        to = positions.get(edge.target);
      return from && to ? [{ from, to, edge }] : [];
    });
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        active.flatMap(({ from, to }) => [from, to]),
      ),
      new THREE.LineBasicMaterial({
        color: data.levels ? "#a894fd" : "#6679b8",
        transparent: true,
        opacity: data.levels ? 0.48 : 0.19,
      }),
    );
    scene.add(lines);

    const moving = active
      .filter(({ edge }) =>
        ["depends_on", "can_read", "uses_model", "uses_tool"].includes(
          edge.kind,
        ),
      )
      .slice(0, 200);
    const particlePositions = new Float32Array(moving.length * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: "#9df5f0", size: 0.11 }),
    );
    particles.frustumCulled = false;
    scene.add(particles);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.32, 36),
      new THREE.MeshBasicMaterial({
        color: "#c5afff",
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    ring.visible = false;
    scene.add(ring);

    const resize = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = root;
      camera.aspect = clientWidth / Math.max(1, clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    });
    resize.observe(root);
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = new THREE.Vector2();
    const start = (event: PointerEvent) => {
      down = new THREE.Vector2(event.clientX, event.clientY);
    };
    const end = (event: PointerEvent) => {
      if (down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5)
        return;
      const box = renderer.domElement.getBoundingClientRect();
      pointer.set(
        (2 * (event.clientX - box.left)) / box.width - 1,
        1 - (2 * (event.clientY - box.top)) / box.height,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(dots)[0];
      if (hit) actions.current.pick(hit.object.userData.id);
    };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", end);

    let frame = 0,
      tick = actions.current.cameraAction.tick;
    let focus: THREE.Vector3 | undefined;
    let previousSelection: string | undefined;
    const point = new THREE.Vector3();
    const started = performance.now();
    const forward = new THREE.Vector3();
    const render = (time: number) => {
      const current = actions.current;
      const elapsed = (time - started) / 1000;
      if (
        firstGraph &&
        elapsed < 1.8 &&
        !data.levels &&
        current.motion &&
        !current.selected &&
        tick === 0
      ) {
        const angle = 0.4 * (1 - elapsed / 1.8) ** 2;
        camera.position.set(
          26 * Math.sin(angle),
          11 + angle * 6,
          26 * Math.cos(angle),
        );
      }
      if (previousSelection !== current.selected) {
        previousSelection = current.selected;
        focus = current.selected ? positions.get(current.selected) : undefined;
      }
      if (tick !== current.cameraAction.tick) {
        tick = current.cameraAction.tick;
        const { type } = current.cameraAction;
        if (type === "reset") {
          focus = undefined;
          camera.position.set(0, 11, 26);
          controls.target.set(0, 0, 0);
        } else {
          const distance = camera.position.distanceTo(controls.target);
          const next = THREE.MathUtils.clamp(
            distance + (type === "in" ? -3 : 3),
            2,
            65,
          );
          forward.subVectors(camera.position, controls.target).normalize();
          camera.position.copy(controls.target).addScaledVector(forward, next);
        }
      }
      if (focus) {
        point
          .subVectors(focus, controls.target)
          .multiplyScalar(current.motion ? 0.06 : 1);
        camera.position.add(point);
        controls.target.add(point);
        if (point.lengthSq() < 0.00001) focus = undefined;
      }
      for (const dot of dots) {
        const id = dot.userData.id;
        const level = data.levels?.[id];
        const visible =
          !current.motion || level === undefined || elapsed >= level * 0.38;
        const arrival =
          current.motion && level === undefined && !oldNodes.has(id)
            ? THREE.MathUtils.smoothstep(elapsed, 0, 0.6)
            : 1;
        dot.scale.setScalar(
          dot.userData.size *
            (id === current.selected ? 1.8 : 1) *
            (visible ? 1 : 0.32) *
            (0.28 + arrival * 0.72),
        );
      }
      const picked = current.selected && positions.get(current.selected);
      ring.visible = Boolean(picked);
      if (picked) {
        ring.position.copy(picked);
        ring.quaternion.copy(camera.quaternion);
      }
      particles.visible = current.motion;
      if (current.motion) {
        moving.forEach(({ from, to, edge }, index) => {
          const source = data.levels?.[edge.source],
            target = data.levels?.[edge.target];
          const reverse =
            source !== undefined && target !== undefined && source > target;
          const delay = Math.max(0, Math.min(source ?? 0, target ?? 0)) * 0.38;
          const progress = delay
            ? Math.max(0, (elapsed - delay) * 2.6) % 1
            : (elapsed * 0.36 + index * 0.173) % 1;
          point.lerpVectors(from, to, reverse ? 1 - progress : progress);
          point.toArray(particlePositions, index * 3);
        });
        particleGeometry.attributes.position.needsUpdate = true;
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", end);
      controls.dispose();
      sphere.dispose();
      dots.forEach((dot) => dot.material.dispose());
      lines.geometry.dispose();
      lines.material.dispose();
      particles.geometry.dispose();
      particles.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [data]);

  return (
    <div className="universe" ref={host}>
      <p className="fallback">
        3D rendering is unavailable. Use the entity list to explore
        relationships.
      </p>
      <div className="orbital" />
    </div>
  );
}
