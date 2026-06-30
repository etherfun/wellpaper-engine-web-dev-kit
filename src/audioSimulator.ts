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

import type { AudioMode, InternalState } from './types';

interface AudioSimulatorOptions {
  amplitude: number;
  bassBoost: number;
  variationSpeed: number;
  frameRate: number;
}

export function createAudioSimulator(
  callback: (data: Float32Array) => void,
  opts: AudioSimulatorOptions,
  state: InternalState
) {
  const amplitude = opts.amplitude;
  const bassBoost = opts.bassBoost;
  const speed = opts.variationSpeed;
  const intervalMs = Math.max(16, Math.round(1000 / opts.frameRate));

  let running = false;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let mode: AudioMode = 'mixed';
  let currentAmplitude = amplitude;
  let currentBassBoost = bassBoost;
  let currentSpeed = speed;

  // 上一帧数据（用于帧间平滑）
  const prevFrame = new Float32Array(128);
  // 相位累加器（正弦波用）
  let phase = 0;

  // ---- 频谱生成 ----

  function generateFrame(): Float32Array {
    const frame = new Float32Array(128);
    const dt = 0.03 * currentSpeed;

    phase += dt;

    for (let ch = 0; ch < 2; ch++) {
      const offset = ch * 64;

      for (let i = 0; i < 64; i++) {
        let value = 0;

        if (mode === 'beats' || mode === 'mixed') {
          // 低频 beats: 正弦波 + 随机脉冲
          if (i < 16) {
            const beatFreq = 1.0 + i * 0.5;
            const beatPhase = phase * beatFreq;
            const pulse = Math.random() > 0.92 ? 0.6 + Math.random() * 0.4 : 0;
            value += (Math.sin(beatPhase) * 0.5 + 0.5) * 0.5 + pulse * 0.5;
            // bass boost
            if (i < 8) value *= currentBassBoost;
          }
          // 中频旋律
          else if (i < 40) {
            const melFreq = 2.0 + (i - 16) * 0.3;
            const melPhase = phase * melFreq;
            value += (Math.sin(melPhase) * 0.3 + 0.3) * 0.4;
            // 偶尔旋律脉冲
            if (Math.random() > 0.98) {
              value += 0.3 + Math.random() * 0.3;
            }
          }
          // 高频
          else {
            // 白噪声 + 小脉冲模拟镲片
            value += Math.random() * 0.15;
            if (Math.random() > 0.96) {
              value += 0.2 + Math.random() * 0.3;
            }
          }
        }

        if (mode === 'melody' || mode === 'mixed') {
          // 旋律模式：更平滑的正弦波组合
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

        // 裁剪到 [0, 1]
        value = Math.min(1, Math.max(0, value * currentAmplitude));

        frame[offset + i] = value;
      }
    }

    // 帧间平滑：70% 上一帧 + 30% 新帧
    for (let i = 0; i < 128; i++) {
      frame[i] = prevFrame[i] * 0.7 + frame[i] * 0.3;
      prevFrame[i] = frame[i];
    }

    return frame;
  }

  // ---- 生命周期 ----

  function tick() {
    if (!running) return;
    const frame = generateFrame();
    callback(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      // 初始帧用较平滑的值
      for (let i = 0; i < 128; i++) {
        prevFrame[i] = 0.1 + Math.random() * 0.2;
      }
      // 立即推一帧
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

    setAmplitude(v: number) {
      currentAmplitude = Math.max(0, Math.min(1, v));
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
    // 手动推一帧（用于 devPanel 手动触发）
    pushFrame() {
      const frame = generateFrame();
      callback(frame);
    },
  };
}

export type AudioSimulator = ReturnType<typeof createAudioSimulator>;
