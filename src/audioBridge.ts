/**
 * AudioBridge — 音频模块唯一状态机和调度中枢
 *
 * 收敛所有音频状态，接管：
 *   - wallpaper listener 注册（替代 window.wallpaperRegisterAudioListener）
 *   - 帧分发（替代 __weDevKitDispatchAudio）
 *   - 零帧归零（替代 __weDevKitStartZeroFade）
 *   - 模拟 / 真实频谱 切换协调（替代 index.ts 中的 currentAudioSource + 条件逻辑）
 *   - 状态变更通知（供 UI 同步，替代 audio.ts 中的局部状态变量）
 *
 * 内部机制：
 *   创建时返回 AudioBridge 接口对象，同时带上 _onFrame 方法，
 *   供 audioSim / mp3Player 的帧回调路由到 bridge.dispatch()。
 */

import type {
  AudioBridge,
  AudioBridgeState,
  AudioSimulatorController,
  AudioSourceType,
  InternalState,
  Mp3PlayerController,
} from './types';

// 内部扩展接口：AudioBridge 不暴露 _onFrame 给公开 API，
// 但 index.ts 创建源时需要用它来桥接帧回调。
export interface InternalAudioBridge extends AudioBridge {
  _onFrame(frame: Float32Array): void;
}

const FRAME_SIZE = 128;
const ZERO_FRAME_DURATION = 60; // ~1000ms at 60fps —— 足够让视觉器平滑/EMA 衰减到零

/**
 * 创建 AudioBridge 实例。
 *
 * @param initialAmplitude  模拟音频初始振幅（用于 fade in 目标值）
 * @param state             全局 InternalState（用于 onDestroy 自动清理）
 */
export function createAudioBridge(
  initialAmplitude: number,
  state: InternalState,
): InternalAudioBridge {
  // ---- 依赖注入 ----
  let audioSim: AudioSimulatorController | null = null;
  let mp3Player: Mp3PlayerController | null = null;

  // ---- listener 注册表 ----
  const listeners = new Set<(data: Float32Array) => void>();

  // ---- 唯一状态源 ----
  let bridgeState: AudioBridgeState = {
    enabled: true,
    source: 'simulated',
    mp3Loaded: false,
    mp3Playing: false,
  };

  // ---- 状态订阅者 ----
  const stateListeners = new Set<(s: AudioBridgeState) => void>();

  function emitState(): void {
    const snap: AudioBridgeState = { ...bridgeState };
    for (const cb of stateListeners) {
      try { cb(snap); } catch { /* ignore subscriber errors */ }
    }
  }

  // ---- 生命周期暂停检测 ----
  function isLifecyclePaused(): boolean {
    return (window as unknown as Record<string, unknown>)['__weLifecyclePaused'] === true;
  }

  // ---- 帧分发（供 audioSim / mp3Player 的帧回调调用） ----
  function dispatch(frame: Float32Array): void {
    if (isLifecyclePaused()) return;
    if (!bridgeState.enabled) return;
    for (const listener of listeners) {
      try {
        // 每个 listener 独立拷贝，避免 listener 修改数组污染其他 listener
        listener(new Float32Array(frame));
      } catch { /* ignore listener errors */ }
    }
  }

  // ---- 零帧归零 RAF 循环 ----
  let zeroRafId: number | null = null;
  let zeroFrameCount = 0;

  function startZeroFade(): void {
    // 清除已有循环（避免多个零帧循环并行）
    if (zeroRafId !== null) {
      cancelAnimationFrame(zeroRafId);
      zeroRafId = null;
    }
    zeroFrameCount = 0;

    function pushZero(): void {
      // 每帧创建新数组，避免 listener 修改后下帧读到脏数据
      const zero = new Float32Array(FRAME_SIZE);
      for (const listener of listeners) {
        try { listener(zero); } catch { /* ignore */ }
      }
      zeroFrameCount++;
      if (zeroFrameCount < ZERO_FRAME_DURATION) {
        zeroRafId = requestAnimationFrame(pushZero);
      } else {
        zeroRafId = null;
      }
    }
    zeroRafId = requestAnimationFrame(pushZero);
  }

  function stopZeroFade(): void {
    if (zeroRafId !== null) {
      cancelAnimationFrame(zeroRafId);
      zeroRafId = null;
    }
    zeroFrameCount = 0;
  }

  // ---- 模拟器控制辅助 ----
  function maybeStartSim(): void {
    if (bridgeState.source !== 'simulated') return;
    if (!audioSim) return;
    if (audioSim.isRunning) return;
    audioSim.start();
  }

  function maybeStopSim(): void {
    if (!audioSim) return;
    if (!audioSim.isRunning) return;
    audioSim.stop();
  }

  // ---- 淡出延迟定时器（模拟模式用） ----
  let disableTimer: ReturnType<typeof setTimeout> | null = null;

  function clearDisableTimer(): void {
    if (disableTimer !== null) {
      clearTimeout(disableTimer);
      disableTimer = null;
    }
  }

  // ===============================================================
  // Public API
  // ===============================================================

  const bridge: InternalAudioBridge = {

    // ---- 内部方法：供 audioSim / mp3Player 的帧回调调用 ----
    _onFrame(frame: Float32Array): void {
      dispatch(frame);
    },

    setAudioSimulator(sim: AudioSimulatorController): void {
      audioSim = sim;
    },

    setMp3Player(mp3: Mp3PlayerController): void {
      mp3Player = mp3;
    },

    addListener(cb: (data: Float32Array) => void): () => void {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },

    // ---- 音频开关 ----
    setEnabled(enabled: boolean): void {
      clearDisableTimer();

      if (enabled === bridgeState.enabled) return;
      bridgeState.enabled = enabled;
      emitState();

      if (enabled) {
        // ---- 启用 ----
        if (bridgeState.source === 'simulated' && audioSim) {
          maybeStartSim();
          audioSim.setAmplitude(0);
          audioSim.fadeTo(initialAmplitude, 800);
        }
        // 真实频谱模式下无需操作（mp3Player 保有状态，isActive 已在上次未变）
        console.log('[AudioBridge] Audio enabled');
      } else {
        // ---- 关闭：立即归零 ----
        startZeroFade();

        if (bridgeState.source === 'simulated' && audioSim) {
          // 模拟模式：淡出 → 停止
          audioSim.fadeTo(0, 800);
          disableTimer = setTimeout(() => {
            audioSim?.stop();
            disableTimer = null;
          }, 1000);
          console.log('[AudioBridge] Audio disabled (sim fading out)');
        } else {
          console.log('[AudioBridge] Audio disabled (immediate)');
        }
      }
    },

    // ---- 音频源切换 ----
    setSource(source: AudioSourceType): void {
      if (source === bridgeState.source) return;
      bridgeState.source = source;
      emitState();

      if (source === 'mp3') {
        // 切换到真实频谱：完全停止模拟器
        maybeStopSim();
        mp3Player?.setActive(true);
        console.log('[AudioBridge] Source → mp3 (sim stopped)');
      } else {
        // 切回模拟数据
        mp3Player?.setActive(false);
        // 仅在音频启用时启动模拟器
        if (bridgeState.enabled) {
          maybeStartSim();
          audioSim?.fadeTo(initialAmplitude, 300);
        }
        console.log('[AudioBridge] Source → simulated');
      }
    },

    // ---- MP3 生命周期 ----
    onMp3Loaded(): void {
      bridgeState.mp3Loaded = true;
      this.setSource('mp3'); // 自动切换到真实频谱模式
    },

    onMp3Play(): void {
      bridgeState.mp3Playing = true;
      emitState();
    },

    onMp3Pause(): void {
      bridgeState.mp3Playing = false;
      emitState();
      // 暂停后归零，让视觉器平滑回落
      startZeroFade();
    },

    onMp3Stop(): void {
      bridgeState.mp3Playing = false;
      emitState();
      // 停止后归零
      startZeroFade();
    },

    // ---- 状态查询 ----
    getState(): AudioBridgeState {
      return { ...bridgeState };
    },

    subscribe(cb: (s: AudioBridgeState) => void): () => void {
      stateListeners.add(cb);
      // 首次推送当前状态
      try { cb({ ...bridgeState }); } catch { /* ignore */ }
      return () => { stateListeners.delete(cb); };
    },

    // ---- 销毁 ----
    destroy(): void {
      clearDisableTimer();
      stopZeroFade();
      listeners.clear();
      stateListeners.clear();
      audioSim = null;
      mp3Player = null;
    },
  };

  // 注册到 state 的 onDestroy 链，确保 kit.destroy() 时自动清理
  state.onDestroy(() => bridge.destroy());

  return bridge;
}
