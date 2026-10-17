"use client";

import type { VRM } from "@pixiv/three-vrm";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./model-viewer.module.css";

const MODEL_URL = "/assets/models/sovia.vrm";
const MODEL_SIZE_MB = 104;

type ViewerCopy = SharedCopy["pages"]["modelViewer"];
type Phase = "idle" | "loading" | "ready" | "error";

export function VrmViewer({ copy }: { copy: ViewerCopy }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadedMb, setLoadedMb] = useState(0);
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
        controls.enablePan = false;
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
        const gltf = await loader.loadAsync(MODEL_URL, (event) => {
          if (disposed) return;
          const nextMb = Math.round(event.loaded / 1_000_000);
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
        const verticalFieldOfView = three.MathUtils.degToRad(camera.fov);
        const horizontalFieldOfView =
          2 * Math.atan(Math.tan(verticalFieldOfView / 2) * camera.aspect);
        const distance =
          Math.max(
            size.y / (2 * Math.tan(verticalFieldOfView / 2)),
            size.x / (2 * Math.tan(horizontalFieldOfView / 2)),
          ) * 1.25;
        camera.position.set(center.x, center.y, center.z + distance);
        camera.lookAt(center);
        controls.target.copy(center);
        controls.minDistance = Math.max(size.y * 0.45, 0.3);
        controls.maxDistance = Math.max(size.y * 4, distance * 2);
        controls.update();

        const clock = new three.Clock();
        const render = () => {
          if (disposed || !renderer || !controls) return;
          frame = requestAnimationFrame(render);
          vrm.update(clock.getDelta());
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
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      controls?.dispose();
      disposeModel?.();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [active]);

  const start = () => {
    setLoadedMb(0);
    setPhase("loading");
  };

  return (
    <div className="space-y-3">
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
      <div className="meta flex flex-wrap justify-between gap-2">
        <span>{copy.controls}</span>
        <span>{copy.sizeNote}</span>
      </div>
    </div>
  );
}
