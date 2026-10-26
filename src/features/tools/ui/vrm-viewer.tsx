"use client";

import type { VRM } from "@pixiv/three-vrm";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import model from "../data/vrm-preview.json";
import styles from "./model-viewer.module.css";

const MODEL_SIZE_MB = Number((model.bytes / 1_000_000).toFixed(1));

type ViewerCopy = SharedCopy["pages"]["modelViewer"];
type Focus = "full" | "face" | "body";
type InteractionMode = "rotate" | "pan";
type Phase = "idle" | "loading" | "ready" | "error";

export function VrmViewer({ copy }: { copy: ViewerCopy }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadedMb, setLoadedMb] = useState(0);
  const [mode, setMode] = useState<InteractionMode>("rotate");
  const modeRef = useRef<InteractionMode>("rotate");
  const focusRef = useRef<(focus: Focus) => void>(() => {});
  const interactionRef = useRef<(mode: InteractionMode) => void>(() => {});
  const active = phase === "loading" || phase === "ready";

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let renderer: import("three").WebGLRenderer | undefined;
    let controls:
      | import("three/addons/controls/OrbitControls.js").OrbitControls
      | undefined;
    let disposeModel: (() => void) | undefined;
    let disconnectPointer: (() => void) | undefined;

    async function initialize() {
      try {
        const [
          three,
          { GLTFLoader },
          { OrbitControls },
          { VRMLoaderPlugin, VRMUtils },
        ] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js"),
          import("three/addons/controls/OrbitControls.js"),
          import("@pixiv/three-vrm"),
        ]);
        if (disposed || !hostRef.current) return;

        const host = hostRef.current;
        const scene = new three.Scene();
        const camera = new three.PerspectiveCamera(35, 1, 0.05, 100);
        renderer = new three.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.outputColorSpace = three.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        host.appendChild(renderer.domElement);

        scene.add(new three.AmbientLight(0xffffff, 2));
        const keyLight = new three.DirectionalLight(0xffffff, 2.5);
        keyLight.position.set(2, 4, 4);
        scene.add(keyLight);
        const fillLight = new three.DirectionalLight(0xffffff, 1);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = true;
        controls.screenSpacePanning = true;
        controls.zoomToCursor = true;
        controls.touches.TWO = three.TOUCH.DOLLY_PAN;
        interactionRef.current = (nextMode) => {
          if (!controls) return;
          controls.mouseButtons.LEFT =
            nextMode === "pan" ? three.MOUSE.PAN : three.MOUSE.ROTATE;
          controls.touches.ONE =
            nextMode === "pan" ? three.TOUCH.PAN : three.TOUCH.ROTATE;
        };
        interactionRef.current(modeRef.current);
        controls.maxPolarAngle = Math.PI * 0.8;
        controls.minPolarAngle = Math.PI * 0.15;

        const resize = () => {
          if (!renderer || !hostRef.current) return;
          const width = Math.max(1, hostRef.current.clientWidth);
          const height = Math.max(1, hostRef.current.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        const gltf = await loader.loadAsync(model.url, (event) => {
          if (disposed) return;
          const nextMb = Number((event.loaded / 1_000_000).toFixed(1));
          setLoadedMb((previous) => (previous === nextMb ? previous : nextMb));
        });
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) throw new Error("The file contains no VRM avatar.");
        if (disposed) {
          VRMUtils.deepDispose(vrm.scene);
          return;
        }

        scene.add(vrm.scene);
        disposeModel = () => VRMUtils.deepDispose(vrm.scene);

        const bounds = new three.Box3().setFromObject(vrm.scene);
        const center = bounds.getCenter(new three.Vector3());
        const size = bounds.getSize(new three.Vector3());
        vrm.scene.updateMatrixWorld(true);
        controls.minDistance = Math.max(size.y * 0.04, 0.05);
        controls.maxDistance = Math.max(size.y * 6, 10);
        focusRef.current = (focus) => {
          if (!controls) return;
          const target = center.clone();
          let height = size.y;
          let width = size.x;
          const bone =
            focus === "face"
              ? vrm.humanoid.getRawBoneNode("head")
              : focus === "body"
                ? vrm.humanoid.getRawBoneNode("hips")
                : null;
          if (bone) bone.getWorldPosition(target);
          if (focus === "face") {
            if (!bone) target.y = bounds.max.y - size.y * 0.12;
            target.y += size.y * 0.025;
            height = size.y * 0.26;
            width = size.y * 0.24;
          } else if (focus === "body") {
            height = size.y * 0.75;
            width = size.x * 0.8;
          }
          const verticalFov = three.MathUtils.degToRad(camera.fov);
          const horizontalFov =
            2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          const distance =
            Math.max(
              height / (2 * Math.tan(verticalFov / 2)),
              width / (2 * Math.tan(horizontalFov / 2)),
            ) *
              1.2 +
            size.z / 2;
          // Flush pending damping before jumping to the selected view.
          controls.enableDamping = false;
          controls.update();
          controls.target.copy(target);
          camera.position.set(target.x, target.y, target.z + distance);
          camera.lookAt(target);
          controls.update();
          controls.enableDamping = true;
        };
        focusRef.current("full");

        const restPosition = vrm.scene.position.clone();
        const restRotation = vrm.scene.quaternion.clone();
        const swayRotation = new three.Quaternion();
        const swayEuler = new three.Euler();
        const swayOffset = new three.Vector2();
        const swayVelocity = new three.Vector2();
        const cameraRight = new three.Vector3();
        const cameraUp = new three.Vector3();
        const motionScale = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? 0.25
          : 1;
        let previousPointer: { x: number; y: number } | undefined;
        const onPointerDown = (event: PointerEvent) => {
          if (event.isPrimary)
            previousPointer = { x: event.clientX, y: event.clientY };
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!event.isPrimary) return;
          if (event.buttons === 0) {
            previousPointer = undefined;
            return;
          }
          if (previousPointer) {
            const dx = three.MathUtils.clamp(
              (event.clientX - previousPointer.x) /
                Math.max(host.clientWidth, 1),
              -0.08,
              0.08,
            );
            const dy = three.MathUtils.clamp(
              (previousPointer.y - event.clientY) /
                Math.max(host.clientHeight, 1),
              -0.08,
              0.08,
            );
            const maxVelocity = size.y * 0.5 * motionScale;
            swayVelocity.x = three.MathUtils.clamp(
              swayVelocity.x + dx * size.y * 10 * motionScale,
              -maxVelocity,
              maxVelocity,
            );
            swayVelocity.y = three.MathUtils.clamp(
              swayVelocity.y + dy * size.y * 5 * motionScale,
              -maxVelocity,
              maxVelocity,
            );
          }
          previousPointer = { x: event.clientX, y: event.clientY };
        };
        const resetPointer = () => {
          previousPointer = undefined;
        };
        const canvas = renderer.domElement;
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", resetPointer);
        canvas.addEventListener("lostpointercapture", resetPointer);
        canvas.addEventListener("pointerleave", resetPointer);
        canvas.addEventListener("pointercancel", resetPointer);
        disconnectPointer = () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", resetPointer);
          canvas.removeEventListener("lostpointercapture", resetPointer);
          canvas.removeEventListener("pointerleave", resetPointer);
          canvas.removeEventListener("pointercancel", resetPointer);
        };
        const step = 1 / 60;
        let accumulator = 0;
        const clock = new three.Clock();
        const render = () => {
          if (disposed || !renderer || !controls) return;
          frame = requestAnimationFrame(render);
          // Small physics steps avoid unstable hair after a slow frame or tab switch.
          accumulator += Math.min(clock.getDelta(), 0.1);
          while (accumulator >= step) {
            // Dragging supplies impulses; damping returns the model to rest after release.
            swayVelocity.x += (-90 * swayOffset.x - 16 * swayVelocity.x) * step;
            swayVelocity.y += (-90 * swayOffset.y - 16 * swayVelocity.y) * step;
            swayOffset.addScaledVector(swayVelocity, step);
            const maxOffset = size.y * 0.03 * motionScale;
            swayOffset.clampScalar(-maxOffset, maxOffset);
            if (swayOffset.lengthSq() + swayVelocity.lengthSq() < 1e-10) {
              swayOffset.set(0, 0);
              swayVelocity.set(0, 0);
            }
            cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
            cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
            vrm.scene.position
              .copy(restPosition)
              .addScaledVector(cameraRight, swayOffset.x)
              .addScaledVector(cameraUp, swayOffset.y);
            swayEuler.set(
              (swayOffset.y / size.y) * 0.2,
              (swayOffset.x / size.y) * 0.5,
              (-swayOffset.x / size.y) * 0.35,
            );
            swayRotation.setFromEuler(swayEuler);
            vrm.scene.quaternion.copy(restRotation).multiply(swayRotation);
            vrm.scene.updateMatrixWorld(true);
            // VRM spring bones respond to the model motion and settle afterward.
            vrm.update(step);
            accumulator -= step;
          }
          controls.update();
          renderer.render(scene, camera);
        };
        render();
        setPhase("ready");
      } catch {
        if (!disposed) setPhase("error");
      }
    }

    void initialize();

    return () => {
      disposed = true;
      focusRef.current = () => {};
      interactionRef.current = () => {};
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      disconnectPointer?.();
      controls?.dispose();
      disposeModel?.();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [active]);

  const changeMode = (nextMode: InteractionMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    interactionRef.current(nextMode);
  };

  const start = () => {
    setLoadedMb(0);
    setPhase("loading");
  };

  return (
    <div className="space-y-3">
      {phase === "ready" && (
        <div className={styles.toolbar}>
          <fieldset className={styles.controlGroup}>
            <legend className="sr-only">{copy.viewLabel}</legend>
            <button type="button" onClick={() => focusRef.current("full")}>
              {copy.fullView}
            </button>
            <button type="button" onClick={() => focusRef.current("face")}>
              {copy.faceView}
            </button>
            <button type="button" onClick={() => focusRef.current("body")}>
              {copy.bodyView}
            </button>
          </fieldset>
          <fieldset className={styles.controlGroup}>
            <legend className="sr-only">{copy.dragLabel}</legend>
            <button
              type="button"
              aria-pressed={mode === "rotate"}
              onClick={() => changeMode("rotate")}
            >
              {copy.rotateMode}
            </button>
            <button
              type="button"
              aria-pressed={mode === "pan"}
              onClick={() => changeMode("pan")}
            >
              {copy.panMode}
            </button>
          </fieldset>
        </div>
      )}
      <div className={styles.stage}>
        <div ref={hostRef} className={styles.canvas} />
        {phase !== "ready" && (
          <div className={styles.overlay}>
            <Image
              src="/assets/characters/sovia_hero.png"
              alt=""
              fill
              sizes="(min-width: 900px) 80vw, 100vw"
              className={styles.poster}
            />
            <output className={styles.panel} aria-live="polite">
              <p className="meta">VRM / SOVIA</p>
              {phase === "loading" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-xl font-black">
                    {loadedMb > 0
                      ? `${copy.loading} · ${loadedMb} / ${MODEL_SIZE_MB} MB`
                      : copy.preparing}
                  </p>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label={copy.loading}
                    aria-valuemin={0}
                    aria-valuemax={MODEL_SIZE_MB}
                    aria-valuenow={Math.min(loadedMb, MODEL_SIZE_MB)}
                  >
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.min((loadedMb / MODEL_SIZE_MB) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-5">
                  <p className="text-xl font-black">
                    {phase === "error" ? copy.error : copy.description}
                  </p>
                  <button type="button" className="btn-primary" onClick={start}>
                    {phase === "error" ? copy.retry : copy.load}
                  </button>
                </div>
              )}
            </output>
          </div>
        )}
      </div>
      {phase === "ready" && (
        <p className="text-sm leading-relaxed">{copy.physicsNote}</p>
      )}
      <div className="meta flex flex-wrap justify-between gap-2">
        <span>{copy.controls}</span>
        <span>{copy.sizeNote.replace("{size}", String(MODEL_SIZE_MB))}</span>
      </div>
    </div>
  );
}
