/**
 * 音频频谱模拟器
 *
 * 生成 128 元素的频谱数据，匹配 WE 规范：
 *   [0..63]   — 左声道
 *   [64..127] — 右声道
 *   低频 (0-15, 64-79) → bass/beats
 *   中频 (16-40, 80-104) → melody
 *   高频 (41-63, 105-127) → hi-hat/treble
 *
 * 三种模式混合 + 帧间平滑，约 30fps。
 */

import type { AudioMode, AudioSimulatorController, InternalState } from './types';

export interface AudioSimulatorOptions {
  amplitude: number;
  bassBoost: number;
  variationSpeed: number;
  frameRate: number;
}

const FRAME_SIZE = 128;
const CHANNEL_SIZE = 64;
const FADE_FACTOR = 0.12;

export function createAudioSimulator(
  callback: (data: Float32Array) => void,
  opts: AudioSimulatorOptions,
  state: InternalState
): AudioSimulatorController {
  let running = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let mode: AudioMode = 'mixed';
  let currentAmplitude = opts.amplitude;
  let currentBassBoost = opts.bassBoost;
  let currentSpeed = opts.variationSpeed;
  let fadeTarget = currentAmplitude;

  const intervalMs = Math.max(16, Math.round(1000 / opts.frameRate));
  const prevFrame = new Float32Array(FRAME_SIZE);
  let phase = 0;

  function generateFrame(): Float32Array {
    const frame = new Float32Array(FRAME_SIZE);
    const dt = 0.03 * currentSpeed;
    phase += dt;

    for (let ch = 0; ch < 2; ch++) {
      const offset = ch * CHANNEL_SIZE;
      for (let i = 0; i < CHANNEL_SIZE; i++) {
        let value = 0;

        if (mode === 'beats' || mode === 'mixed') {
          if (i < 16) {
            const beatFreq = 1.0 + i * 0.5;
            const beatPhase = phase * beatFreq;
            const pulse = Math.random() > 0.92 ? 0.6 + Math.random() * 0.4 : 0;
            value += (Math.sin(beatPhase) * 0.5 + 0.5) * 0.5 + pulse * 0.5;
            if (i < 8) value *= currentBassBoost;
          } else if (i < 40) {
            const melFreq = 2.0 + (i - 16) * 0.3;
            const melPhase = phase * melFreq;
            value += (Math.sin(melPhase) * 0.3 + 0.3) * 0.4;
            if (Math.random() > 0.98) {
              value += 0.3 + Math.random() * 0.3;
            }
          } else {
            value += Math.random() * 0.15;
            if (Math.random() > 0.96) {
              value += 0.2 + Math.random() * 0.3;
            }
          }
        }

        if (mode === 'melody' || mode === 'mixed') {
          if (i < 16) {
            const f1 = 1.0 + i * 0.3;
            value += (Math.sin(phase * f1) * 0.3 + 0.3) * 0.3;
          } else if (i < 40) {
            const f2 = 3.0 + (i - 16) * 0.5;
            value += (Math.sin(phase * f2 + Math.sin(phase * 0.5) * 2) * 0.4 + 0.4) * 0.5;
          } else {
            value += Math.random() * 0.1;
          }
        }

        value = Math.min(1, Math.max(0, value * currentAmplitude));
        frame[offset + i] = value;
      }
    }

    // 帧间平滑：70% 上一帧 + 30% 新帧
    for (let i = 0; i < FRAME_SIZE; i++) {
      const smoothed = prevFrame[i]! * 0.7 + frame[i]! * 0.3;
      frame[i] = smoothed;
      prevFrame[i] = smoothed;
    }

    return frame;
  }

  function tick(): void {
    if (!running) return;
    if (Math.abs(currentAmplitude - fadeTarget) > 0.001) {
      currentAmplitude += (fadeTarget - currentAmplitude) * FADE_FACTOR;
    } else {
      currentAmplitude = fadeTarget;
    }
    callback(generateFrame());
  }

  const controller: AudioSimulatorController = {
    start() {
      if (running) return;
      running = true;
      for (let i = 0; i < FRAME_SIZE; i++) {
        prevFrame[i] = 0.1 + Math.random() * 0.2;
      }
      tick();
      timerId = setInterval(tick, intervalMs);
      console.log(`[WE Dev Kit] AudioSimulator started (${opts.frameRate}fps, mode=${mode})`);
    },

    stop() {
      running = false;
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
      console.log('[WE Dev Kit] AudioSimulator stopped');
    },

    pushFrame() {
      callback(generateFrame());
    },

    setAmplitude(v: number) {
      currentAmplitude = Math.max(0, Math.min(1, v));
      fadeTarget = currentAmplitude;
    },

    fadeTo(target: number, _durationMs?: number) {
      fadeTarget = Math.max(0, Math.min(1, target));
    },

    setBassBoost(v: number) {
      currentBassBoost = Math.max(0, Math.min(3, v));
    },

    setVariationSpeed(v: number) {
      currentSpeed = Math.max(0.1, Math.min(5, v));
    },

    setMode(m: AudioMode) {
      mode = m;
    },

    get isRunning() {
      return running;
    },
  };

  state.onDestroy(() => controller.stop());
  return controller;
}