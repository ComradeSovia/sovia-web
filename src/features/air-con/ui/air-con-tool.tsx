"use client";

import type { SharedCopy } from "@sovia/shared/i18n/copy";
import {
  Fan,
  Minus,
  Plus,
  Power,
  Snowflake,
  Thermometer,
  Wind,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "cool" | "dry" | "fan" | "auto";

type AudioRig = {
  loops: [HTMLAudioElement, HTMLAudioElement];
  activeLoopIndex: 0 | 1;
  start: HTMLAudioElement;
  beep: HTMLAudioElement;
  targetVolume: number;
  fadeFrame: number | null;
  fanFadeFrame: number | null;
  fanChangeTimeout: number | null;
  crossfadeFrame: number | null;
  stitchFrame: number | null;
  startupFrame: number | null;
  isStopping: boolean;
};

const modes: Mode[] = ["cool", "dry", "fan", "auto"];
const AIRCON_LOOP_SRC = "/assets/aircon/aircon-loop.mp3";
const AIRCON_START_SRC = "/assets/aircon/aircon-start.mp3";
const AIRCON_BEEP_SRC = "/assets/aircon/beep.mp3";
const LOOP_STITCH_SECONDS = 1.8;
const LOOP_STITCH_MS = LOOP_STITCH_SECONDS * 1000;
const START_BRIDGE_SECONDS = 1.45;
const START_BRIDGE_MS = START_BRIDGE_SECONDS * 1000;
const FAN_RESPONSE_DELAY_MS = 520;
const FAN_VOLUME_FADE_MS = 1800;
const POWER_OFF_FADE_MS = 2400;
const AIRCON_STANDBY_BANNER_SRC = "/img/aircon/banner.jpg";
const airConBanners = [
  { min: 16, max: 19, src: "/img/aircon/banner16-19.jpg" },
  { min: 20, max: 21, src: "/img/aircon/banner20-21.jpg" },
  { min: 22, max: 26, src: "/img/aircon/banner22-26.jpg" },
  { min: 27, max: 28, src: "/img/aircon/banner27-28.jpg" },
  { min: 29, max: 30, src: "/img/aircon/banner29-30.jpg" },
] as const;

function applyFanSound(rig: AudioRig, fanSpeed: number) {
  const nextVolume = getLoopVolume(fanSpeed);

  cancelFrame(rig.fanFadeFrame);
  cancelTimeout(rig.fanChangeTimeout);
  rig.fanFadeFrame = null;
  rig.fanChangeTimeout = null;

  if (!getActiveLoop(rig).paused) {
    rig.fanChangeTimeout = window.setTimeout(() => {
      rig.fanChangeTimeout = null;
      fadeFanVolume(rig, nextVolume, FAN_VOLUME_FADE_MS);
    }, FAN_RESPONSE_DELAY_MS);
    return;
  }

  rig.targetVolume = nextVolume;
  getActiveLoop(rig).volume = clampVolume(nextVolume);
}

function getLoopVolume(fanSpeed: number) {
  return 0.24 + fanSpeed * 0.08;
}

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume));
}

function createAudio(src: string, loop = false) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.preload = "auto";
  return audio;
}

function playBeep(rig: AudioRig) {
  rig.beep.currentTime = 0;
  void rig.beep.play();
}

function getActiveLoop(rig: AudioRig) {
  return rig.loops[rig.activeLoopIndex];
}

function getStandbyLoop(rig: AudioRig) {
  return rig.loops[rig.activeLoopIndex === 0 ? 1 : 0];
}

function cancelFrame(frame: number | null) {
  if (frame !== null) {
    cancelAnimationFrame(frame);
  }
}

function cancelTimeout(timeout: number | null) {
  if (timeout !== null) {
    window.clearTimeout(timeout);
  }
}

function fadeFanVolume(rig: AudioRig, targetVolume: number, duration: number) {
  cancelFrame(rig.fanFadeFrame);

  const activeRig = rig;
  const startVolume = activeRig.targetVolume;
  const endVolume = clampVolume(targetVolume);
  const startedAt = performance.now();

  function fade(timestamp: number) {
    if (activeRig.isStopping) {
      activeRig.fanFadeFrame = null;
      return;
    }

    const progress = Math.min(1, (timestamp - startedAt) / duration);
    activeRig.targetVolume = clampVolume(
      startVolume + (endVolume - startVolume) * progress,
    );

    if (activeRig.crossfadeFrame === null) {
      const activeLoop = getActiveLoop(activeRig);

      if (!activeLoop.paused) {
        activeLoop.volume = activeRig.targetVolume;
      }
    }

    if (progress < 1) {
      activeRig.fanFadeFrame = requestAnimationFrame(fade);
      return;
    }

    activeRig.targetVolume = endVolume;
    activeRig.fanFadeFrame = null;
  }

  activeRig.fanFadeFrame = requestAnimationFrame(fade);
}

function beginLoopStitching(rig: AudioRig) {
  cancelFrame(rig.stitchFrame);

  function tick() {
    if (rig.isStopping) {
      rig.stitchFrame = null;
      return;
    }

    const activeLoop = getActiveLoop(rig);
    const shouldStitch =
      !activeLoop.paused &&
      rig.crossfadeFrame === null &&
      Number.isFinite(activeLoop.duration) &&
      activeLoop.duration > LOOP_STITCH_SECONDS &&
      activeLoop.duration - activeLoop.currentTime <= LOOP_STITCH_SECONDS;

    if (shouldStitch) {
      stitchToNextLoop(rig);
    }

    rig.stitchFrame = requestAnimationFrame(tick);
  }

  rig.stitchFrame = requestAnimationFrame(tick);
}

function stitchToNextLoop(rig: AudioRig) {
  cancelFrame(rig.fadeFrame);

  const fromLoop = getActiveLoop(rig);
  const toLoop = getStandbyLoop(rig);
  const startedAt = performance.now();

  toLoop.pause();
  toLoop.currentTime = 0;
  toLoop.volume = 0;
  void toLoop.play();

  function crossfade(timestamp: number) {
    if (rig.isStopping) {
      rig.crossfadeFrame = null;
      return;
    }

    const progress = Math.min(1, (timestamp - startedAt) / LOOP_STITCH_MS);
    const volume = clampVolume(rig.targetVolume);
    fromLoop.volume = clampVolume(volume * (1 - progress));
    toLoop.volume = clampVolume(volume * progress);

    if (progress < 1) {
      rig.crossfadeFrame = requestAnimationFrame(crossfade);
      return;
    }

    fromLoop.pause();
    fromLoop.currentTime = 0;
    fromLoop.volume = 0;
    toLoop.volume = volume;
    rig.activeLoopIndex = rig.activeLoopIndex === 0 ? 1 : 0;
    rig.crossfadeFrame = null;
  }

  rig.crossfadeFrame = requestAnimationFrame(crossfade);
}

function startLoopPlayback(rig: AudioRig, fadeDuration = 0) {
  if (rig.isStopping) {
    return;
  }

  cancelFrame(rig.fadeFrame);
  cancelFrame(rig.crossfadeFrame);
  cancelFrame(rig.startupFrame);
  cancelFrame(rig.fanFadeFrame);
  cancelTimeout(rig.fanChangeTimeout);
  rig.fadeFrame = null;
  rig.crossfadeFrame = null;
  rig.startupFrame = null;
  rig.fanFadeFrame = null;
  rig.fanChangeTimeout = null;
  rig.activeLoopIndex = 0;

  for (const loop of rig.loops) {
    loop.pause();
    loop.currentTime = 0;
    loop.volume = 0;
  }

  const activeLoop = getActiveLoop(rig);
  activeLoop.volume = fadeDuration > 0 ? 0 : clampVolume(rig.targetVolume);
  void activeLoop.play();
  beginLoopStitching(rig);

  if (fadeDuration <= 0) {
    return;
  }

  const startedAt = performance.now();
  const startVolume = rig.start.volume;

  function bridge(timestamp: number) {
    if (rig.isStopping) {
      rig.fadeFrame = null;
      return;
    }

    const progress = Math.min(1, (timestamp - startedAt) / fadeDuration);
    activeLoop.volume = clampVolume(rig.targetVolume * progress);
    rig.start.volume = clampVolume(startVolume * (1 - progress));

    if (progress < 1) {
      rig.fadeFrame = requestAnimationFrame(bridge);
      return;
    }

    rig.start.pause();
    rig.start.currentTime = 0;
    rig.start.volume = clampVolume(0.9);
    activeLoop.volume = clampVolume(rig.targetVolume);
    rig.fadeFrame = null;
  }

  rig.fadeFrame = requestAnimationFrame(bridge);
}

function bridgeStartToLoop(rig: AudioRig) {
  cancelFrame(rig.startupFrame);

  function tick() {
    if (rig.isStopping) {
      rig.startupFrame = null;
      return;
    }

    const start = rig.start;
    const hasDuration = Number.isFinite(start.duration) && start.duration > 0;

    if (!hasDuration) {
      rig.startupFrame = requestAnimationFrame(tick);
      return;
    }

    const bridgeSeconds = Math.min(START_BRIDGE_SECONDS, start.duration * 0.75);
    const bridgeAt = Math.max(0, start.duration - bridgeSeconds);

    if (start.currentTime >= bridgeAt || start.ended) {
      rig.startupFrame = null;
      start.onended = null;
      startLoopPlayback(rig, bridgeSeconds * 1000);
      return;
    }

    rig.startupFrame = requestAnimationFrame(tick);
  }

  rig.startupFrame = requestAnimationFrame(tick);
}

function fadeAllLoopsToSilence(
  rig: AudioRig,
  duration: number,
  onComplete?: () => void,
) {
  cancelFrame(rig.fadeFrame);
  cancelFrame(rig.crossfadeFrame);
  cancelFrame(rig.stitchFrame);
  cancelFrame(rig.startupFrame);
  cancelFrame(rig.fanFadeFrame);
  cancelTimeout(rig.fanChangeTimeout);
  rig.crossfadeFrame = null;
  rig.stitchFrame = null;
  rig.startupFrame = null;
  rig.fanFadeFrame = null;
  rig.fanChangeTimeout = null;

  const startedAt = performance.now();
  const startVolumes = rig.loops.map((loop) => loop.volume);

  function fade(timestamp: number) {
    const progress = Math.min(1, (timestamp - startedAt) / duration);

    for (const [index, loop] of rig.loops.entries()) {
      loop.volume = clampVolume(startVolumes[index] * (1 - progress));
    }

    if (progress < 1) {
      rig.fadeFrame = requestAnimationFrame(fade);
      return;
    }

    for (const loop of rig.loops) {
      loop.pause();
      loop.currentTime = 0;
      loop.volume = 0;
    }

    rig.fadeFrame = null;
    onComplete?.();
  }

  rig.fadeFrame = requestAnimationFrame(fade);
}

function buildAirLoop(fanSpeed: number): AudioRig {
  const rig = {
    loops: [createAudio(AIRCON_LOOP_SRC), createAudio(AIRCON_LOOP_SRC)] as [
      HTMLAudioElement,
      HTMLAudioElement,
    ],
    activeLoopIndex: 0 as const,
    start: createAudio(AIRCON_START_SRC),
    beep: createAudio(AIRCON_BEEP_SRC),
    targetVolume: getLoopVolume(fanSpeed),
    fadeFrame: null,
    fanFadeFrame: null,
    fanChangeTimeout: null,
    crossfadeFrame: null,
    stitchFrame: null,
    startupFrame: null,
    isStopping: false,
  };

  for (const loop of rig.loops) {
    loop.volume = 0;
    loop.playbackRate = 1;
  }

  rig.start.volume = clampVolume(0.9);
  rig.beep.volume = clampVolume(0.8);

  return rig;
}

export function AirConTool({ copy }: { copy: SharedCopy }) {
  const [isOn, setIsOn] = useState(false);
  const [temperature, setTemperature] = useState(24);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [mode, setMode] = useState<Mode>("cool");
  const audioRigRef = useRef<AudioRig | null>(null);

  const stopAirLoop = useCallback(() => {
    const rig = audioRigRef.current;

    if (!rig) {
      return;
    }

    rig.isStopping = true;
    rig.start.onended = null;
    rig.start.pause();
    rig.start.currentTime = 0;

    fadeAllLoopsToSilence(rig, POWER_OFF_FADE_MS, () => {
      audioRigRef.current = null;
    });
  }, []);

  useEffect(() => {
    const rig = audioRigRef.current;

    if (!rig) {
      return;
    }

    applyFanSound(rig, fanSpeed);
  }, [fanSpeed]);

  useEffect(() => {
    return () => {
      stopAirLoop();
    };
  }, [stopAirLoop]);

  useEffect(() => {
    const root = document.documentElement;
    const resetAirConTone = () => {
      delete root.dataset.airCon;
      root.style.removeProperty("--air-con-tint");
      root.style.removeProperty("--air-con-tint-opacity");
      root.style.removeProperty("--air-con-saturation");
      root.style.removeProperty("--air-con-brightness");
      root.style.removeProperty("--air-con-contrast");
    };

    if (!isOn || mode === "fan" || temperature === 26) {
      resetAirConTone();
      return resetAirConTone;
    }

    const distance = Math.min(Math.abs(temperature - 26), 10);
    const intensity = distance / 10;

    root.dataset.airCon = temperature < 26 ? "cool" : "warm";
    root.style.setProperty(
      "--air-con-tint",
      temperature < 26 ? "105 171 255" : "255 186 92",
    );
    root.style.setProperty(
      "--air-con-tint-opacity",
      String(0.06 + intensity * 0.12),
    );
    root.style.setProperty(
      "--air-con-saturation",
      String(1 - intensity * 0.24),
    );
    root.style.setProperty(
      "--air-con-brightness",
      String(temperature < 26 ? 1 - intensity * 0.025 : 1 + intensity * 0.025),
    );
    root.style.setProperty("--air-con-contrast", String(1 - intensity * 0.04));

    return () => {
      resetAirConTone();
    };
  }, [isOn, mode, temperature]);

  function ensureContext() {
    if (!audioRigRef.current) {
      audioRigRef.current = buildAirLoop(fanSpeed);
    }

    return audioRigRef.current;
  }

  function pressButton(action: () => void) {
    const rig = ensureContext();

    playBeep(rig);
    action();
  }

  function cycleMode() {
    const currentIndex = modes.indexOf(mode);
    setMode(modes[(currentIndex + 1) % modes.length]);
  }

  function cycleFanSpeed() {
    setFanSpeed((current) => (current >= 5 ? 1 : current + 1));
  }

  function cycleTemperature() {
    setTemperature((current) => (current >= 30 ? 16 : current + 1));
  }

  function togglePower() {
    if (isOn) {
      const rig = audioRigRef.current;

      if (rig) {
        playBeep(rig);
      }

      stopAirLoop();
      setIsOn(false);
      return;
    }

    const rig = ensureContext();

    cancelFrame(rig.fadeFrame);
    cancelFrame(rig.crossfadeFrame);
    cancelFrame(rig.stitchFrame);
    cancelFrame(rig.startupFrame);
    cancelFrame(rig.fanFadeFrame);
    cancelTimeout(rig.fanChangeTimeout);
    rig.fadeFrame = null;
    rig.crossfadeFrame = null;
    rig.stitchFrame = null;
    rig.startupFrame = null;
    rig.fanFadeFrame = null;
    rig.fanChangeTimeout = null;
    rig.isStopping = false;
    rig.targetVolume = getLoopVolume(fanSpeed);

    playBeep(rig);
    rig.start.volume = clampVolume(0.9);
    rig.start.currentTime = 0;
    rig.start.onended = () => startLoopPlayback(rig, START_BRIDGE_MS);

    for (const loop of rig.loops) {
      loop.pause();
      loop.currentTime = 0;
      loop.volume = 0;
    }

    void rig.start
      .play()
      .then(() => bridgeStartToLoop(rig))
      .catch(() => startLoopPlayback(rig, START_BRIDGE_MS));
    setIsOn(true);
  }

  const modeLabel = copy.pages.airCon[mode];

  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <div className="meta flex items-center gap-2">
          <Snowflake className="h-4 w-4" aria-hidden="true" />
          {copy.pages.airCon.eyebrow}
        </div>
        <h1 className="max-w-4xl text-balance">{copy.pages.airCon.title}</h1>
        <p className="max-w-2xl text-lg">{copy.pages.airCon.subtitle}</p>
      </div>

      <AirConBanner
        alt={`${copy.pages.airCon.title} ${temperature}°C`}
        isOn={isOn}
        mode={mode}
        temperature={temperature}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
          <div className="relative overflow-hidden border-[3px] border-ink bg-[rgb(198_174_124)] p-3 shadow-[12px_12px_0_rgb(var(--shadow))] sm:p-5">
            <div className="relative mx-auto max-w-4xl border-[3px] border-[rgb(42_29_18)] bg-[rgb(226_202_150)] p-2 shadow-[inset_0_0_0_4px_rgb(120_86_52),inset_0_0_18px_rgb(73_45_25)]">
              <div className="grid min-h-[20rem] gap-2 bg-[rgb(42_29_18)] p-2 sm:grid-cols-[7.5rem_1fr]">
                <div className="grid gap-2 border-[2px] border-[rgb(74_52_32)] bg-[rgb(223_201_153)] p-3 shadow-[inset_0_0_14px_rgb(134_102_62)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-black leading-none tracking-[0] text-[rgb(63_44_25)]">
                      SOVIA
                    </div>
                    <span
                      className={`mt-1 h-3 w-3 border-2 border-[rgb(42_29_18)] transition duration-700 ${
                        isOn
                          ? "bg-[rgb(239_35_35)] shadow-[0_0_12px_3px_rgba(239,35,35,0.8),0_0_28px_8px_rgba(185,28,28,0.35)]"
                          : "bg-[rgb(82_14_14)] shadow-[inset_0_0_4px_rgb(31_8_8)]"
                      }`}
                    />
                  </div>

                  <SovietDial
                    label="РЕЖИМ"
                    value={modeLabel}
                    rotation={modes.indexOf(mode) * 70 - 105}
                    onClick={() => pressButton(cycleMode)}
                  />
                  <SovietDial
                    label="ВЕНТИЛЯЦИЯ"
                    value={`${fanSpeed}`}
                    rotation={-135 + fanSpeed * 54}
                    onClick={() => pressButton(cycleFanSpeed)}
                  />
                  <SovietDial
                    label="ТЕМПЕРАТУРА"
                    value={`${temperature}°`}
                    rotation={-135 + ((temperature - 16) / 14) * 270}
                    onClick={() => pressButton(cycleTemperature)}
                  />
                  <SovietDial
                    label="ПИТАНИЕ"
                    value={isOn ? "ВКЛ" : "ВЫКЛ"}
                    rotation={isOn ? 85 : -125}
                    onClick={togglePower}
                  />

                  <div className="mt-auto border-[3px] border-[rgb(42_29_18)] bg-[rgb(38_38_31)] p-1 text-center text-lg font-black leading-none text-[rgb(232_219_177)] shadow-[inset_0_0_0_2px_rgb(150_132_89)]">
                    БК-25700
                  </div>
                </div>

                <div className="grid grid-rows-[4.25rem_1fr] gap-2 border-[2px] border-[rgb(74_52_32)] bg-[rgb(37_23_16)] p-2">
                  <div className="grid grid-cols-4 gap-1 overflow-hidden border-[2px] border-[rgb(80_55_33)] bg-[rgb(10_8_7)] p-1">
                    {Array.from({ length: 4 }).map((_, sectionIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: Static decorative upper vent sections.
                        key={sectionIndex}
                        className="relative overflow-hidden border-x border-[rgb(98_68_42)]"
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: Static decorative horizontal louvers.
                            key={index}
                            className="absolute left-0 right-0 h-[3px] bg-[rgb(104_70_42)] shadow-[0_2px_0_rgb(12_8_6)]"
                            style={{ top: `${index * 20 + 6}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="relative overflow-hidden border-[2px] border-[rgb(96_65_38)] bg-[rgb(34_23_16)]">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(128_86_50)_0_3px,transparent_3px_10px),linear-gradient(0deg,rgb(75_49_30)_0_2px,transparent_2px_14px)] opacity-95" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0_5px,rgba(188,139,79,0.45)_5px_7px,transparent_7px_13px)]" />
                    <div className="absolute inset-x-0 top-0 h-3 bg-[rgb(80_53_32)] shadow-[0_12px_0_rgba(80,53,32,0.55),0_24px_0_rgba(80,53,32,0.32)]" />
                    <div className="absolute inset-2 grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[3px]">
                      {Array.from({ length: 26 }).map((_, index) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: Static decorative lower grille bars.
                          key={index}
                          className="h-full bg-[rgb(116_78_47)] shadow-[1px_0_0_rgb(32_20_13),-1px_0_0_rgba(202,158,96,0.25)]"
                        />
                      ))}
                    </div>
                    <div className="absolute inset-x-2 inset-y-4 grid grid-rows-[repeat(8,minmax(0,1fr))] gap-[0.45rem]">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: Static decorative lower grille rails.
                          key={index}
                          className="h-[2px] bg-[rgb(80_52_31)] shadow-[0_1px_0_rgba(201,150,87,0.35)]"
                        />
                      ))}
                    </div>
                    <div
                      className={`absolute inset-4 border-y border-[rgb(108_72_42)] transition-opacity duration-700 ${
                        isOn ? "opacity-75" : "opacity-25"
                      }`}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(245,196,0,0.12),transparent)] transition duration-700 ${
                        isOn
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-1/2 opacity-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5 border-[3px] border-ink bg-yellow p-5 text-block shadow-[8px_8px_0_rgb(var(--shadow))]">
          <div className="meta text-block">{copy.routes.airCon}</div>

          <div className="border-[3px] border-ink bg-paper p-4 shadow-[5px_5px_0_rgb(var(--shadow))]">
            <div className="mb-4 border-[3px] border-ink bg-block p-3 text-relief">
              <div className="text-4xl font-black leading-none">
                {temperature}°
              </div>
              <div className="text-xs font-black uppercase tracking-[0.12em]">
                {modeLabel} / {fanSpeed}
              </div>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => pressButton(cycleMode)}
                className="flex min-h-14 cursor-pointer items-center justify-center gap-2 border-[3px] border-ink bg-paper font-black uppercase tracking-[0.08em] text-ink shadow-[4px_4px_0_rgb(var(--shadow))] transition hover:bg-yellow"
              >
                <Wind className="h-5 w-5" aria-hidden="true" />
                {copy.pages.airCon.mode}
              </button>

              <ControlGroup
                disabled={false}
                icon={<Fan className="h-5 w-5" aria-hidden="true" />}
                label={copy.pages.airCon.fanSpeed}
                value={`${fanSpeed} / 5`}
                onDecrease={() =>
                  pressButton(() =>
                    setFanSpeed((current) => Math.max(1, current - 1)),
                  )
                }
                onIncrease={() =>
                  pressButton(() =>
                    setFanSpeed((current) => Math.min(5, current + 1)),
                  )
                }
              />

              <ControlGroup
                disabled={false}
                icon={<Thermometer className="h-5 w-5" aria-hidden="true" />}
                label={copy.pages.airCon.temperature}
                value={`${temperature}°C`}
                onDecrease={() =>
                  pressButton(() =>
                    setTemperature((current) => Math.max(16, current - 1)),
                  )
                }
                onIncrease={() =>
                  pressButton(() =>
                    setTemperature((current) => Math.min(30, current + 1)),
                  )
                }
              />

              <button
                type="button"
                onClick={togglePower}
                className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 border-[3px] border-ink font-black uppercase tracking-[0.08em] shadow-[4px_4px_0_rgb(var(--shadow))] transition ${
                  isOn
                    ? "bg-red text-relief"
                    : "bg-yellow text-block hover:bg-red hover:text-relief"
                }`}
              >
                <Power className="h-5 w-5" aria-hidden="true" />
                {isOn ? copy.pages.airCon.powerOff : copy.pages.airCon.powerOn}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function AirConBanner({
  alt,
  isOn,
  mode,
  temperature,
}: {
  alt: string;
  isOn: boolean;
  mode: Mode;
  temperature: number;
}) {
  const activeBanner =
    (isOn && mode !== "fan"
      ? airConBanners.find(
          (banner) => temperature >= banner.min && temperature <= banner.max,
        )?.src
      : AIRCON_STANDBY_BANNER_SRC) ?? airConBanners[2].src;
  const bannerSources = [
    AIRCON_STANDBY_BANNER_SRC,
    ...airConBanners.map((banner) => banner.src),
  ];

  return (
    <div className="relative overflow-hidden border-[3px] border-ink bg-block shadow-[10px_10px_0_rgb(var(--shadow))]">
      <div className="relative aspect-[16/7] min-h-48">
        {bannerSources.map((src) => {
          const isActive = src === activeBanner;

          return (
            <Image
              alt={isActive ? alt : ""}
              aria-hidden={isActive ? undefined : true}
              className={`object-cover transition-opacity duration-[1800ms] ease-in-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              fill
              key={src}
              priority={isActive}
              sizes="(min-width: 1024px) 960px, 100vw"
              src={src}
            />
          );
        })}
      </div>
    </div>
  );
}

function SovietDial({
  label,
  onClick,
  rotation,
  value,
}: {
  label: string;
  onClick: () => void;
  rotation: number;
  value: string;
}) {
  return (
    <div className="grid justify-items-center gap-1">
      <div className="text-[0.62rem] font-black leading-none tracking-[0] text-[rgb(56_39_23)]">
        {label}
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative h-14 w-14 cursor-pointer rounded-full border-[3px] border-[rgb(35_25_18)] bg-[radial-gradient(circle_at_35%_30%,rgb(236_226_206),rgb(84_78_68)_42%,rgb(30_28_26)_74%)] shadow-[inset_-5px_-5px_8px_rgba(0,0,0,0.65),inset_5px_5px_7px_rgba(255,255,255,0.45),3px_3px_0_rgb(88_60_34)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[rgb(245_196_0)] focus:ring-offset-2 focus:ring-offset-[rgb(223_201_153)]"
      >
        <div
          className="absolute left-1/2 top-1/2 h-[2px] w-5 origin-left bg-[rgb(245_234_211)] shadow-[0_1px_0_rgb(0_0_0)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <div className="absolute inset-[1.05rem] rounded-full border border-[rgba(255,255,255,0.35)] bg-[rgba(0,0,0,0.18)]" />
      </button>
      <div className="max-w-full truncate text-[0.65rem] font-black uppercase leading-none tracking-[0] text-[rgb(56_39_23)]">
        {value}
      </div>
    </div>
  );
}

function ControlGroup({
  disabled,
  icon,
  label,
  onDecrease,
  onIncrease,
  value,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr_3.25rem] items-stretch border-[3px] border-ink bg-paper shadow-[5px_5px_0_rgb(var(--shadow))]">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label={`Decrease ${label}`}
        className="air-con-control-button flex min-h-16 items-center justify-center border-r-[3px] border-ink bg-block text-relief transition hover:bg-red disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Minus className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
        <div className="air-con-control-label flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-red">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="air-con-control-value text-2xl font-black leading-none">
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label={`Increase ${label}`}
        className="air-con-control-button flex min-h-16 items-center justify-center border-l-[3px] border-ink bg-block text-relief transition hover:bg-red disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
