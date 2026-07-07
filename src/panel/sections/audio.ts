/**
 * Audio section
 */

import type { AudioMode, AudioSimulatorController } from '../../types';
import { getPanelMessages } from '../i18n';
import { createRow, createSlider, createButton, createLabel } from '../../utils/dom';
import type { PanelCallbacks } from '../callbacks';

export function populateAudioSection(
  container: HTMLElement,
  audio: AudioSimulatorController | undefined,
  cb: PanelCallbacks
): void {
  let audioEnabled = true;
  const toggleRow = createRow();

  const toggleLabel = createLabel(getPanelMessages().audioInput);
  toggleRow.appendChild(toggleLabel);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn on';
  toggleBtn.textContent = 'ON';
  toggleBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    toggleBtn.className = 'toggle-btn ' + (audioEnabled ? 'on' : 'off');
    toggleBtn.textContent = audioEnabled ? 'ON' : 'OFF';
    toggleBtn.style.borderColor = audioEnabled ? '#4CAF50' : '#e53935';
    cb.onAudioToggle(audioEnabled);
  });
  toggleRow.appendChild(toggleBtn);
  container.appendChild(toggleRow);

  createSlider(container, getPanelMessages().amplitude, 0, 1, 0.01, 0.6, cb.onAudioAmplitude);
  createSlider(container, getPanelMessages().bassBoost, 0, 3, 0.1, 1.2, cb.onAudioBassBoost);
  createSlider(container, getPanelMessages().speed, 0.1, 5, 0.1, 1.0, cb.onAudioSpeed);

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
  container.appendChild(modeRow);

  // 抑制未使用变量警告
  void audio;
  void createButton;
}