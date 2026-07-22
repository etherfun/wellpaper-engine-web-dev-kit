/**
 * MP3 播放器 + 真实频谱提取模块
 *
 * 基于 BetterNCM/SimpleAudioVisualizer 项目中 sound-processor 的处理思路，
 * 移植其核心算法（高斯平滑 + 时间计权 + 对数频带 RMS 合并），
 * 但不使用 A 计权（A 计权适用于声级计，不适用于频谱可视化）。
 *
 * 流水线：
 *   AnalyserNode.getByteFrequencyData
 *   → 高斯平滑（相邻 bin 滤波，减少突刺）
 *   → 时间计权（多帧指数移动平均，减少闪烁）
 *   → 对数频带合并（RMS，每个 band 覆盖等比频率宽度）
 *   → 归一化（每帧自动缩放到 0-1）
 *
 * 输出 Float32Array[128]：
 *   [0..63]   — 左声道
 *   [64..127] — 右声道（单声道音源时镜像左声道）
 */

import type { Mp3PlayerController, InternalState } from './types';

const FFT_SIZE = 2048;
const FRAME_SIZE = 128;
const CHANNEL_SIZE = 64;

// ================================================================
// 高斯核生成（sound-processor 移植）
// ================================================================

function buildGaussKernel(radius: number, sigma: number): { kernel: Float32Array; sum: number } {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  return { kernel, sum };
}

// ================================================================
// 对数频带映射表（频率域，确保每 band 覆盖唯一连续 bin 区间）
// ================================================================

function buildLogBands(
  fftSize: number,
  sampleRate: number,
  outBands: number,
  startFreq: number,
  endFreq: number,
): { lo: number; hi: number }[] {
  const binCount = fftSize / 2;
  const startBin = Math.max(1, Math.round((startFreq / sampleRate) * fftSize));
  const endBin = Math.min(binCount - 1, Math.round((endFreq / sampleRate) * fftSize));
  const effectiveBins = endBin - startBin + 1;
  if (effectiveBins < outBands) {
    // 实际 bin 不足时降级为线性分配
    const bands: { lo: number; hi: number }[] = [];
    const perBand = Math.max(1, Math.floor(effectiveBins / outBands));
    let cursor = startBin;
    for (let i = 0; i < outBands; i++) {
      const lo = cursor;
      const hi = i === outBands - 1 ? endBin : Math.min(endBin, cursor + perBand - 1);
      bands.push({ lo, hi: Math.max(lo, hi) });
      cursor = hi + 1;
    }
    return bands;
  }

  // 几何等比缩放：band i 的右边界 = startBin * ratio^(i+1)
  const ratio = Math.pow(endBin / startBin, 1 / outBands);
  const bands: { lo: number; hi: number }[] = [];
  let lo = startBin;

  for (let i = 0; i < outBands; i++) {
    let hi: number;
    if (i === outBands - 1) {
      hi = endBin;
    } else {
      hi = Math.round(startBin * Math.pow(ratio, i + 1)) - 1;
      // 保证不退化：至少覆盖一个新 bin
      hi = Math.max(lo, Math.min(endBin, hi));
    }
    bands.push({ lo, hi });
    lo = hi + 1;
  }

  return bands;
}

// ================================================================
// 频谱处理器（不含 A 计权）
// ================================================================

interface SpectrumProcessorOptions {
  fftSize: number;
  sampleRate: number;
  bufLen: number;
  outBands: number;
  startFreq?: number;
  endFreq?: number;
  gaussRadius?: number;
  gaussSigma?: number;
  historyLimit?: number;
  /** 灵敏度 0.1–1（越低越平滑），控制 EMA alpha 和峰值衰减速度 */
  sensitivity?: number;
}

class SpectrumProcessor {
  private bufLen: number;
  private outBands: number;
  private bands: { lo: number; hi: number }[];
  private gaussKernel: Float32Array;
  private gaussSum: number;
  private gaussRadius: number;
  private history: Float32Array[];
  private historyLimit: number;
  /** bin 级 EMA 新帧权重 */
  private binAlpha: number;
  /** 输出 band 级 EMA 新帧权重 = sensitivity²（视觉平滑的关键参数） */
  private bandAlpha: number;
  /** 峰值衰减率 */
  private decayRate: number;
  /** 峰值跟随器：追踪全局最大能量 */
  private peakEnv: number;
  /** 峰值保持帧数 */
  private peakHoldFrames: number;
  private peakHoldMax: number;
  /** 上一帧的输出 band（用于 band 级 EMA） */
  private bandPrev: Float32Array | null;
  /** 最终输出缩放 0.1–1.0（用户阈值上限） */
  private outputGain = 1.0;

  constructor(opts: SpectrumProcessorOptions) {
    this.bufLen = opts.bufLen;
    this.outBands = opts.outBands;
    this.bands = buildLogBands(
      opts.fftSize,
      opts.sampleRate,
      opts.outBands,
      opts.startFreq ?? 30,
      opts.endFreq ?? Math.min(opts.sampleRate / 2, 18000),
    );

    const r = opts.gaussRadius ?? 2;
    const s = opts.gaussSigma ?? 1.0;
    const gk = buildGaussKernel(r, s);
    this.gaussKernel = gk.kernel;
    this.gaussSum = gk.sum;
    this.gaussRadius = r;

    this.historyLimit = opts.historyLimit ?? 4;
    this.history = [];

    this.peakEnv = 0.001;
    this.peakHoldFrames = 0;
    this.bandPrev = null;

    const sens = Math.max(0.1, Math.min(1, opts.sensitivity ?? 0.5));
    this.binAlpha = 0.4; // bin 级用固定值，不需要随 sensitivity 变化
    this.bandAlpha = sens * sens;
    this.decayRate = 1 - sens * 0.003;
    this.peakHoldMax = Math.round(300 / sens);
  }

  /** 动态更新灵敏度 */
  setSensitivity(v: number): void {
    const sens = Math.max(0.1, Math.min(1, v));
    this.bandAlpha = sens * sens;
    this.decayRate = 1 - sens * 0.003;
    this.peakHoldMax = Math.round(300 / sens);
    this.peakEnv *= 0.5;
    this.peakHoldFrames = 0;
    this.bandPrev = null; // 丢弃旧帧，避免跨灵敏度混合
  }

  /** 设置输出上限（阈值） */
  setCeiling(v: number): void {
    this.outputGain = Math.max(0.1, Math.min(1, v));
  }

  /** 高斯平滑 */
  smooth(raw: Float32Array): void {
    if (this.gaussRadius <= 0) return;
    const tmp = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      let val = 0;
      for (let j = -this.gaussRadius; j <= this.gaussRadius; j++) {
        const idx = i + j;
        const rawVal = idx >= 0 && idx < raw.length ? raw[idx]! : 0;
        val += rawVal * this.gaussKernel[j + this.gaussRadius]!;
      }
      tmp[i] = val / this.gaussSum;
    }
    for (let i = 0; i < raw.length; i++) raw[i] = tmp[i]!;
  }

  /** 时间计权（bin 级 EMA），固定参数不做 sensitivity 控制 */
  timeWeight(mag: Float32Array): void {
    if (this.historyLimit <= 0) return;
    this.history.push(new Float32Array(mag));
    if (this.history.length > this.historyLimit) this.history.shift();

    if (this.history.length >= 2) {
      const prev = this.history[this.history.length - 2]!;
      for (let i = 0; i < mag.length; i++) {
        mag[i] = prev[i]! * (1 - this.binAlpha) + mag[i]! * this.binAlpha;
      }
    }
  }

  /** 频带间水平平滑：对 64 band 做 3 点中心加权平均，消除邻频突变 */
  smoothBands(bands: Float32Array): void {
    const tmp = new Float32Array(bands.length);
    for (let i = 0; i < bands.length; i++) {
      let sum = 0;
      let weight = 0;
      // 中心权重 2，邻频权重 1（共 4）
      for (let j = -1; j <= 1; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < bands.length) {
          const w = j === 0 ? 2 : 1;
          sum += bands[idx]! * w;
          weight += w;
        }
      }
      tmp[i] = sum / weight;
    }
    for (let i = 0; i < bands.length; i++) bands[i] = tmp[i]!;
  }

  /** 对数频带 RMS 合并 */
  divide(mag: Float32Array): Float32Array {
    const out = new Float32Array(this.outBands);
    for (let b = 0; b < this.outBands; b++) {
      const { lo, hi } = this.bands[b]!;
      let sumSq = 0;
      let count = 0;
      for (let k = lo; k <= hi; k++) {
        if (k < mag.length) {
          const v = mag[k]!;
          sumSq += v * v;
          count++;
        }
      }
      out[b] = count > 0 ? Math.sqrt(sumSq / count) : 0;
    }
    return out;
  }

  /** 处理一帧 byte 数据，返回 64 条 band（归一化 0-1） */
  process(raw: Uint8Array): Float32Array {
    // 1) byte → 浮点线性幅度 [0..255] → [0..1]
    const mag = new Float32Array(this.bufLen);
    for (let i = 0; i < this.bufLen; i++) mag[i] = (raw[i] ?? 0) / 255;

    // 2) 高斯平滑（bin 级，sigma=1.0, radius=2）
    this.smooth(mag);

    // 3) 时间计权（bin 级 EMA，固定参数）
    this.timeWeight(mag);

    // 4) 对数频带 RMS 合并
    const out = this.divide(mag);

    // 5) 频带间水平平滑（消除相邻 band 突变）
    this.smoothBands(out);

    // 6) Band 级 EMA（灵敏度控制的核心——直接平滑用户看到的 64 条 band）
    if (this.bandPrev && this.bandPrev.length === out.length) {
      for (let i = 0; i < out.length; i++) {
        out[i] = this.bandPrev[i]! * (1 - this.bandAlpha) + out[i]! * this.bandAlpha;
      }
    }
    this.bandPrev = new Float32Array(out);

    // 7) 峰值保持归一化
    let frameMax = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i]! > frameMax) frameMax = out[i]!;
    }

    if (frameMax > this.peakEnv) {
      this.peakEnv = frameMax;
      this.peakHoldFrames = this.peakHoldMax;
    } else if (this.peakHoldFrames > 0) {
      this.peakHoldFrames--;
    } else {
      this.peakEnv = Math.max(0.001, this.peakEnv * this.decayRate);
    }

    const scale = this.peakEnv > 0.0001 ? 1 / this.peakEnv : 0;
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.min(1, (out[i] ?? 0) * scale) * this.outputGain;
    }

    return out;
  }

  reset(): void {
    this.history = [];
    this.peakEnv = 0.001;
    this.peakHoldFrames = 0;
    this.bandPrev = null;
  }
}

// ================================================================
// MP3 播放器
// ================================================================

/**
 * 创建一个 MP3 播放器控制器。
 */
export function createMp3Player(
  onFrame: (data: Float32Array) => void,
  state: InternalState
): Mp3PlayerController {
  let audioCtx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let gainNode: GainNode | null = null;
  let audioBuffer: AudioBuffer | null = null;
  let isPlaying = false;
  let isLoaded = false;
  let isActive = false;
  let loopEnabled = true;
  /** 待应用的灵敏度（processor 创建后再 apply） */
  let pendingSensitivity = 0.5;
  let fileName = '';
  let duration = 0;
  let startTime = 0;
  let pauseOffset = 0;
  let volume = 0.8;
  let animFrameId: number | null = null;
  let sourceGen = 0;

  // 频谱处理器
  let leftProc: SpectrumProcessor | null = null;
  let rightProc: SpectrumProcessor | null = null;

  // ---- 频谱提取 ----
  function startAnalysisLoop(): void {
    stopAnalysisLoop();
    const bufLen = analyser!.frequencyBinCount;
    const raw = new Uint8Array(bufLen);
    const frame = new Float32Array(FRAME_SIZE);

    function tick(): void {
      if (!analyser || !isPlaying) { animFrameId = requestAnimationFrame(tick); return; }

      analyser.getByteFrequencyData(raw);

      try {
        // 左声道 [0..63]
        const left = leftProc!.process(raw);
        for (let i = 0; i < CHANNEL_SIZE; i++) frame[i] = left[i] ?? 0;

        // 右声道 [64..127]：用独立处理器保持相位差
        if (rightProc) {
          const right = rightProc.process(raw);
          for (let i = 0; i < CHANNEL_SIZE; i++) frame[CHANNEL_SIZE + i] = right[i] ?? 0;
        } else {
          for (let i = 0; i < CHANNEL_SIZE; i++) frame[CHANNEL_SIZE + i] = frame[i] ?? 0;
        }
      } catch { /* ignore */ }

      if (isActive) onFrame(frame);
      animFrameId = requestAnimationFrame(tick);
    }
    animFrameId = requestAnimationFrame(tick);
  }

  function stopAnalysisLoop(): void {
    if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  }

  function buildAudioGraph(): void {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // 65dB 窗口，默认值即可覆盖大部分音乐动态
    analyser.minDecibels = -85;
    analyser.maxDecibels = -20;
    analyser.smoothingTimeConstant = 0.5;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    analyser.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const bufLen = analyser.frequencyBinCount;
    const procOpts = {
      fftSize: FFT_SIZE,
      sampleRate: audioCtx.sampleRate,
      bufLen,
      outBands: CHANNEL_SIZE,
      startFreq: 30,
      endFreq: 16000,
      sensitivity: pendingSensitivity,
    };
    leftProc = new SpectrumProcessor(procOpts);
    rightProc = new SpectrumProcessor(procOpts);
  }

  function startSource(): void {
    if (!audioCtx || !analyser || !audioBuffer) return;
    stopSource();
    const myGen = ++sourceGen;
    source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    const offset = pauseOffset;
    source.start(0, offset);
    startTime = audioCtx.currentTime - offset;
    isPlaying = true;
    startAnalysisLoop();
    source.onended = () => {
      if (sourceGen !== myGen) return;
      if (loopEnabled && isPlaying) {
        // 循环：从开头重新播放
        pauseOffset = 0;
        startSource();
      } else {
        if (isPlaying) { isPlaying = false; pauseOffset = 0; stopAnalysisLoop(); }
      }
    };
  }

  function stopSource(): void {
    try { if (source) { source.onended = null; source.stop(); } } catch { /* ignore */ }
    try { source?.disconnect(); } catch { /* ignore */ }
    source = null;
  }

  // ---- 公开 API ----
  const controller: Mp3PlayerController = {
    async loadFile(file: File): Promise<void> {
      controller.stop();
      const arrayBuffer = await file.arrayBuffer();
      if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      audioBuffer = decoded;
      isLoaded = true; fileName = file.name; duration = decoded.duration; pauseOffset = 0; isPlaying = false;
      if (!analyser) buildAudioGraph();
      leftProc?.reset();
      rightProc?.reset();
      console.log(`[WE Dev Kit] MP3 loaded: "${file.name}" (${duration.toFixed(1)}s)`);
    },
    play(): void {
      if (!audioBuffer || !audioCtx) return;
      if (audioCtx.state === 'suspended') void audioCtx.resume();
      if (!analyser) buildAudioGraph();
      if (!source || !isPlaying) startSource();
    },
    pause(): void {
      if (!isPlaying || !audioCtx) return;
      isPlaying = false; pauseOffset = audioCtx.currentTime - startTime;
      stopSource(); stopAnalysisLoop();
    },
    stop(): void { isPlaying = false; pauseOffset = 0; stopSource(); stopAnalysisLoop(); },
    seek(percent: number): void {
      if (!audioBuffer || !audioCtx) return;
      const wasPlaying = isPlaying; const target = (percent / 100) * duration;
      if (isPlaying) { isPlaying = false; stopSource(); stopAnalysisLoop(); }
      pauseOffset = Math.max(0, Math.min(target, duration));
      if (wasPlaying) startSource();
    },
    setVolume(v: number): void { volume = Math.max(0, Math.min(1, v)); if (gainNode) gainNode.gain.value = volume; },
    setSensitivity(v: number): void {
      pendingSensitivity = Math.max(0.1, Math.min(1, v));
      leftProc?.setSensitivity(pendingSensitivity);
      rightProc?.setSensitivity(pendingSensitivity);
    },
    setCeiling(v: number): void {
      const ceil = Math.max(0.1, Math.min(1, v));
      leftProc?.setCeiling(ceil);
      rightProc?.setCeiling(ceil);
    },
    setLoop(enabled: boolean): void { loopEnabled = enabled; },
    setActive(active: boolean): void { isActive = active; console.log(`[WE Dev Kit] MP3 real spectrum ${active ? 'ACTIVE' : 'INACTIVE'}`); },
    get isPlaying() { return isPlaying; },
    get isLoaded() { return isLoaded; },
    get isActive() { return isActive; },
    get currentTime(): number { if (!audioCtx || !isPlaying) return pauseOffset; return audioCtx.currentTime - startTime; },
    get duration() { return duration; },
    get fileName() { return fileName; },
    destroy(): void {
      controller.stop(); stopAnalysisLoop();
      try { source?.disconnect(); } catch { /* ignore */ }
      try { analyser?.disconnect(); } catch { /* ignore */ }
      try { gainNode?.disconnect(); } catch { /* ignore */ }
      if (audioCtx && audioCtx.state !== 'closed') void audioCtx.close();
      audioCtx = null; source = null; analyser = null; gainNode = null; audioBuffer = null;
      isLoaded = false; isPlaying = false; fileName = ''; duration = 0; pauseOffset = 0;
    },
  };

  state.onDestroy(() => controller.destroy());
  return controller;
}
