/**
 * Lifecycle section
 */

import { getPanelMessages } from '../i18n';
import { createRow, createLabel } from '../../utils/dom';
import type { PanelCallbacks } from '../callbacks';

export function populateLifecycleSection(container: HTMLElement, cb: PanelCallbacks): void {
  let lifecyclePaused = false;

  const statusRow = createRow();
  statusRow.appendChild(createLabel(getPanelMessages().paused));

  const statusEl = document.createElement('span');
  statusEl.id = '__we_lifecycle_status';
  statusEl.textContent = getPanelMessages().running;
  statusEl.style.fontSize = '11px';
  statusEl.style.color = '#4CAF50';
  statusRow.appendChild(statusEl);
  container.appendChild(statusRow);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn on';
  toggleBtn.textContent = getPanelMessages().pauseBtn;
  toggleBtn.style.width = '100%';
  toggleBtn.style.padding = '4px 12px';
  toggleBtn.addEventListener('click', () => {
    lifecyclePaused = !lifecyclePaused;
    cb.onLifecycleToggle(lifecyclePaused);
    if (lifecyclePaused) {
      toggleBtn.className = 'toggle-btn off';
      toggleBtn.textContent = getPanelMessages().resumeBtn;
      toggleBtn.style.borderColor = '#FFC107';
      statusEl.textContent = getPanelMessages().paused;
      statusEl.style.color = '#FFC107';
    } else {
      toggleBtn.className = 'toggle-btn on';
      toggleBtn.textContent = getPanelMessages().pauseBtn;
      toggleBtn.style.borderColor = '';
      statusEl.textContent = getPanelMessages().running;
      statusEl.style.color = '#4CAF50';
    }
  });
  container.appendChild(toggleBtn);

  const fpsRow = createRow();
  fpsRow.appendChild(createLabel(getPanelMessages().fpsLimit));

  const fpsSelect = document.createElement('select');
  [0, 30, 60, 120, 144].forEach((fps) => {
    const opt = document.createElement('option');
    opt.value = String(fps);
    opt.textContent = fps === 0 ? getPanelMessages().unlimited : `${fps} FPS`;
    if (fps === 60) opt.selected = true;
    fpsSelect.appendChild(opt);
  });
  fpsSelect.addEventListener('change', () => {
    cb.onLifecycleFps(parseInt(fpsSelect.value, 10));
  });
  fpsRow.appendChild(fpsSelect);
  container.appendChild(fpsRow);
}