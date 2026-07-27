/**
 * Audio section
 *
 * 包含模拟音频控制 + MP3 导入与真实频谱显示。
 */

import type { AudioBridge, AudioBridgeState, AudioMode, AudioSimulatorController, AudioSourceType } from '../../types';
import { getPanelMessages } from '../i18n';
import { createRow, createSlider, createButton, createLabel } from '../../utils/dom';
import type { PanelCallbacks } from '../callbacks';

export function populateAudioSection(
  container: HTMLElement,
  audio: AudioSimulatorController | undefined,
  cb: PanelCallbacks,
  bridge?: AudioBridge
): void {
  // 从 bridge 读取初始状态
  let currentSource: AudioSourceType = bridge?.getState().source ?? 'simulated';

  // ================================================================
  // 音频输入开关
  // ================================================================

  const toggleRow = createRow();
  const toggleLabel = createLabel(getPanelMessages().audioInput);
  toggleRow.appendChild(toggleLabel);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn on';
  toggleBtn.textContent = getPanelMessages().audioOn;
  toggleBtn.addEventListener('click', () => {
    const s = bridge?.getState();
    if (s) {
      bridge?.setEnabled(!s.enabled);
    } else {
      // 无 bridge 时的兜底逻辑：反转当前 toggle 视觉状态
      const isOn = toggleBtn.classList.contains('on');
      cb.onAudioToggle(!isOn);
    }
  });
  toggleRow.appendChild(toggleBtn);
  container.appendChild(toggleRow);

  // ================================================================
  // 模拟音频控制
  // ================================================================

  const simSection = document.createElement('div');
  simSection.className = 'audio-sim-section';

  createSlider(simSection, getPanelMessages().amplitude, 0, 1, 0.01, 0.6, cb.onAudioAmplitude);
  createSlider(simSection, getPanelMessages().bassBoost, 0, 3, 0.1, 1.2, cb.onAudioBassBoost);
  createSlider(simSection, getPanelMessages().speed, 0.1, 5, 0.1, 1.0, cb.onAudioSpeed);

  const modeRow = createRow();
  modeRow.appendChild(createLabel(getPanelMessages().mode));

  const modeSelect = document.createElement('select');
  (['mixed', 'beats', 'melody'] as AudioMode[]).forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent =
      m === 'mixed' ? getPanelMessages().mixed :
      m === 'beats' ? getPanelMessages().beats :
      getPanelMessages().melody;
    if (m === 'mixed') opt.selected = true;
    modeSelect.appendChild(opt);
  });
  modeSelect.addEventListener('change', () => {
    cb.onAudioMode(modeSelect.value as AudioMode);
  });
  modeRow.appendChild(modeSelect);
  simSection.appendChild(modeRow);
  container.appendChild(simSection);

  // ================================================================
  // MP3 所有功能的容器（模拟模式下隐藏）
  // ================================================================

  const mp3Section = document.createElement('div');
  mp3Section.style.display = 'none';

  // ================================================================
  // MP3 导入 — 分隔线
  // ================================================================

  const divider = document.createElement('hr');
  divider.className = 'audio-divider';
  divider.style.cssText = 'border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 8px 0;';
  mp3Section.appendChild(divider);

  const mp3Title = document.createElement('div');
  mp3Title.className = 'row';
  mp3Title.appendChild(createLabel(getPanelMessages().mp3Import));
  mp3Section.appendChild(mp3Title);

  // ================================================================
  // 音频源选择
  // ================================================================

  const sourceRow = createRow();
  sourceRow.appendChild(createLabel(getPanelMessages().audioInput + ' ' + getPanelMessages().mode));

  const sourceSelect = document.createElement('select');
  const optSim = document.createElement('option');
  optSim.value = 'simulated';
  optSim.textContent = getPanelMessages().mp3SourceSimulated;
  optSim.selected = true;
  sourceSelect.appendChild(optSim);

  const optMp3 = document.createElement('option');
  optMp3.value = 'mp3';
  optMp3.textContent = getPanelMessages().mp3SourceReal;
  sourceSelect.appendChild(optMp3);

  sourceSelect.addEventListener('change', () => {
    bridge?.setSource(sourceSelect.value as AudioSourceType);
  });
  sourceRow.appendChild(sourceSelect);
  container.appendChild(sourceRow);

  // ================================================================
  // 文件选择 (inside mp3Section)
  // ================================================================

  const fileRow = createRow();

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.mp3,audio/mpeg,audio/mp3';
  fileInput.style.display = 'none';
  fileRow.appendChild(fileInput);

  const selectBtn = document.createElement('button');
  selectBtn.className = 'btn';
  selectBtn.textContent = getPanelMessages().mp3SelectFile;
  fileRow.appendChild(selectBtn);

  const fileNameLabel = document.createElement('span');
  fileNameLabel.className = 'mp3-filename';
  fileNameLabel.textContent = getPanelMessages().mp3NoFile;
  fileNameLabel.style.cssText = 'font-size: 11px; opacity: 0.7; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;';
  fileRow.appendChild(fileNameLabel);

  selectBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileNameLabel.textContent = file.name;
    // 重置文件 input 以便重复选择同一文件
    fileInput.value = '';
    cb.onMp3LoadFile(file);
    // 自动切换到真实频谱模式（仅在当前为模拟模式时）
    bridge?.onMp3Loaded();
  });

  mp3Section.appendChild(fileRow);

  // ================================================================
  // 播放控制按钮
  // ================================================================

  const controlRow = createRow();
  controlRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';

  const playBtn = document.createElement('button');
  playBtn.className = 'btn';
  playBtn.textContent = getPanelMessages().mp3Play;
  playBtn.disabled = true;

  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'btn';
  pauseBtn.textContent = getPanelMessages().mp3Pause;
  pauseBtn.disabled = true;

  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn';
  stopBtn.textContent = getPanelMessages().mp3Stop;
  stopBtn.disabled = true;

  playBtn.addEventListener('click', () => {
    cb.onMp3Play();
  });

  pauseBtn.addEventListener('click', () => {
    cb.onMp3Pause();
  });

  stopBtn.addEventListener('click', () => {
    seekSlider.value = '0';
    positionLabel.textContent = '0:00';
    cb.onMp3Stop();
  });

  controlRow.appendChild(playBtn);
  controlRow.appendChild(pauseBtn);
  controlRow.appendChild(stopBtn);
  mp3Section.appendChild(controlRow);

  // ================================================================
  // 进度条
  // ================================================================

  const seekRow = createRow();
  const posLabel = createLabel(getPanelMessages().mp3Position);
  seekRow.appendChild(posLabel);

  const seekSlider = document.createElement('input');
  seekSlider.type = 'range';
  seekSlider.min = '0';
  seekSlider.max = '100';
  seekSlider.step = '0.1';
  seekSlider.value = '0';
  seekSlider.style.flex = '1';
  seekSlider.disabled = true;

  const positionLabel = document.createElement('span');
  positionLabel.className = 'value';
  positionLabel.textContent = '0:00';
  positionLabel.style.cssText = 'min-width: 36px; text-align: right;';

  seekSlider.addEventListener('input', () => {
    const pct = parseFloat(seekSlider.value);
    const dur = parseFloat(seekSlider.getAttribute('data-duration') ?? '0');
    const secs = (pct / 100) * dur;
    positionLabel.textContent = formatTime(secs);
  });

  seekSlider.addEventListener('change', () => {
    const pct = parseFloat(seekSlider.value);
    cb.onMp3Seek(pct);
  });

  seekRow.appendChild(seekSlider);
  seekRow.appendChild(positionLabel);
  mp3Section.appendChild(seekRow);

  // ================================================================
  // 音量
  // ================================================================

  createSlider(mp3Section, getPanelMessages().mp3Volume, 0, 1, 0.05, 0.8, (v) => {
    cb.onMp3Volume(v);
  });

  // ================================================================
  // 频谱灵敏度
  // ================================================================

  createSlider(mp3Section, getPanelMessages().mp3Sensitivity, 0.1, 1, 0.05, 0.5, (v) => {
    cb.onMp3Sensitivity(v);
  });

  // ================================================================
  // 输出上限
  // ================================================================

  createSlider(mp3Section, getPanelMessages().mp3Ceiling, 0.1, 1, 0.05, 1.0, (v) => {
    cb.onMp3Ceiling(v);
  });

  // ================================================================
  // 循环播放
  // ================================================================

  const loopRow = createRow();
  const loopLabel = createLabel(getPanelMessages().mp3Loop);
  loopRow.appendChild(loopLabel);

  const loopCheck = document.createElement('input');
  loopCheck.type = 'checkbox';
  loopCheck.checked = true;
  loopCheck.style.cssText = 'margin-left: 6px; accent-color: #4CAF50;';
  loopCheck.addEventListener('change', () => {
    cb.onMp3LoopToggle(loopCheck.checked);
  });
  loopRow.appendChild(loopCheck);
  mp3Section.appendChild(loopRow);

  // 最终追加 mp3 区块到主容器
  container.appendChild(mp3Section);

  // ================================================================
  // 辅助函数
  // ================================================================

  function toggleMp3Ui(source: AudioSourceType): void {
    mp3Section.style.display = source === 'mp3' ? '' : 'none';
  }

  function syncUI(state: AudioBridgeState): void {
    // 同步开关按钮
    toggleBtn.className = 'toggle-btn ' + (state.enabled ? 'on' : 'off');
    toggleBtn.textContent = state.enabled ? getPanelMessages().audioOn : getPanelMessages().audioOff;
    toggleBtn.style.borderColor = state.enabled ? '#4CAF50' : '#e53935';

    // 同步源选择器（使用无标记设置，避免级联）
    if (state.source !== currentSource) {
      currentSource = state.source;
      sourceSelect.value = state.source;
    }
    toggleMp3Ui(state.source);

    // 同步 MP3 播放按钮
    playBtn.disabled = !state.mp3Loaded || state.mp3Playing;
    pauseBtn.disabled = !state.mp3Loaded || !state.mp3Playing;
    stopBtn.disabled = !state.mp3Loaded;
    seekSlider.disabled = !state.mp3Loaded;
  }

  // 订阅 bridge 状态变更
  bridge?.subscribe(syncUI);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // 对外暴露更新函数，供 panel index 定时刷新进度
  const updateFns = {
    onMp3Load() {
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      seekSlider.disabled = false;
    },
    onMp3Play() {
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
    },
    onMp3Pause() {
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = false;
    },
    onMp3Stop() {
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      seekSlider.value = '0';
      positionLabel.textContent = '0:00';
    },
    updatePosition(currentTime: number, duration: number) {
      if (duration > 0) {
        const pct = (currentTime / duration) * 100;
        seekSlider.value = String(Math.min(100, Math.max(0, pct)));
        seekSlider.setAttribute('data-duration', String(duration));
        positionLabel.textContent = formatTime(currentTime);
      }
    },
    resetFileState() {
      fileNameLabel.textContent = getPanelMessages().mp3NoFile;
      playBtn.disabled = true;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      seekSlider.disabled = true;
      seekSlider.value = '0';
      positionLabel.textContent = '0:00';
    },
  };

  // 挂载到 container 上以便外部调用
  (container as unknown as Record<string, unknown>).__mp3UpdateFns = updateFns;

  // 抑制未使用变量警告
  void audio;
  void createButton;
}