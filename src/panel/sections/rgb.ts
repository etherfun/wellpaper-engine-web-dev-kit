/**
 * RGB section
 */

import type { RgbFrameData } from '../../types';
import { getPanelMessages } from '../i18n';
import type { PanelRgbUpdater } from '../callbacks';

export function populateRgbSection(container: HTMLElement): PanelRgbUpdater {
  const canvasRow = document.createElement('div');
  canvasRow.style.cssText = 'margin: 4px 0; display: flex; flex-direction: column; gap: 4px;';

  const infoLine = document.createElement('div');
  infoLine.style.cssText = 'font-size: 10px; color: #666;';
  infoLine.textContent = getPanelMessages().waitingRgb;
  canvasRow.appendChild(infoLine);

  const canvas = document.createElement('canvas');
  canvas.id = '__we_rgb_canvas';
  canvas.style.cssText = 'width: 100%; height: 32px; border-radius: 4px; image-rendering: pixelated; background: #111;';
  canvas.width = 100;
  canvas.height = 20;
  canvasRow.appendChild(canvas);

  const paletteRow = document.createElement('div');
  paletteRow.id = '__we_rgb_palette';
  paletteRow.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap; min-height: 16px;';
  canvasRow.appendChild(paletteRow);

  container.appendChild(canvasRow);

  const updateRgbFrame: PanelRgbUpdater = (frame) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(frame.width, frame.height);
    for (let i = 0; i < frame.pixels.length; i += 3) {
      const idx = (i / 3) * 4;
      imgData.data[idx] = frame.pixels[i] ?? 0;
      imgData.data[idx + 1] = frame.pixels[i + 1] ?? 0;
      imgData.data[idx + 2] = frame.pixels[i + 2] ?? 0;
      imgData.data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    infoLine.textContent = `${frame.width}×${frame.height} · ${(frame.pixels.length / 1024).toFixed(1)}KB`;

    paletteRow.innerHTML = '';
    for (const swatch of frame.palette) {
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block;width:16px;height:16px;border-radius:3px;background:${swatch.color};border:1px solid rgba(255,255,255,0.15);cursor:help;`;
      dot.title = `${swatch.color} (${(swatch.ratio * 100).toFixed(0)}%)`;
      paletteRow.appendChild(dot);
    }
  };

  (container as unknown as { __updateRgbFrame: PanelRgbUpdater }).__updateRgbFrame = updateRgbFrame;
  return updateRgbFrame;
}