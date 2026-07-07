/**
 * Media section
 */

import type { MediaMockController, MockTrack, PlaybackState } from '../../types';
import { getPanelMessages } from '../i18n';
import { createButton, createRow, createLabel, createTextFieldRow } from '../../utils/dom';
import { formatTime, parseTimeLabel } from '../../utils/time';
import type { PanelCallbacks, PanelMediaUpdater } from '../callbacks';

export function populateMediaSection(
  container: HTMLElement,
  media: MediaMockController | undefined,
  cb: PanelCallbacks
): PanelMediaUpdater {
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-group';
  btnRow.style.marginBottom = '8px';

  btnRow.appendChild(createButton('⏮', getPanelMessages().previousTrack, () => cb.onMediaPrev()));
  btnRow.appendChild(createButton('▶', getPanelMessages().play, () => cb.onMediaPlay(), 'primary'));
  btnRow.appendChild(createButton('⏸', getPanelMessages().pause, () => cb.onMediaPause()));
  btnRow.appendChild(createButton('⏹', getPanelMessages().stop, () => cb.onMediaStop(), 'danger'));
  btnRow.appendChild(createButton('⏭', getPanelMessages().nextTrack, () => cb.onMediaNext()));
  container.appendChild(btnRow);

  // 曲目选择
  const trackRow = createRow();
  trackRow.appendChild(createLabel(getPanelMessages().track));
  const trackSelect = document.createElement('select');
  trackSelect.style.flex = '1';
  if (media) {
    media.tracks.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${t.artist} — ${t.title}`;
      trackSelect.appendChild(opt);
    });
  }
  trackSelect.addEventListener('change', () => {
    cb.onMediaTrackChange(parseInt(trackSelect.value, 10));
  });
  trackRow.appendChild(trackSelect);
  container.appendChild(trackRow);

  // 封面 + 元数据字段
  const editRow = createRow();
  editRow.style.alignItems = 'flex-start';

  const thumbnail = document.createElement('img');
  thumbnail.className = 'thumbnail-preview';
  thumbnail.alt = getPanelMessages().coverAlt;
  editRow.appendChild(thumbnail);

  const fieldsCol = document.createElement('div');
  fieldsCol.style.flex = '1';
  fieldsCol.style.display = 'flex';
  fieldsCol.style.flexDirection = 'column';
  fieldsCol.style.gap = '4px';

  const { input: titleInput } = createTextFieldRow('', getPanelMessages().title_);
  const { input: artistInput } = createTextFieldRow('', getPanelMessages().artist);
  const { input: albumInput } = createTextFieldRow('', getPanelMessages().album);
  titleInput.placeholder = getPanelMessages().title_;
  artistInput.placeholder = getPanelMessages().artist;
  albumInput.placeholder = getPanelMessages().album;

  fieldsCol.appendChild(titleInput);
  fieldsCol.appendChild(artistInput);
  fieldsCol.appendChild(albumInput);
  editRow.appendChild(fieldsCol);
  container.appendChild(editRow);

  function pushCustomTrack(): void {
    cb.onMediaCustomTrack({
      title: titleInput.value,
      artist: artistInput.value,
      album: albumInput.value,
    });
  }
  titleInput.addEventListener('input', pushCustomTrack);
  artistInput.addEventListener('input', pushCustomTrack);
  albumInput.addEventListener('input', pushCustomTrack);

  // 封面上传
  const uploadZone = document.createElement('div');
  uploadZone.className = 'thumbnail-upload-zone';
  uploadZone.textContent = getPanelMessages().uploadCover;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  uploadZone.appendChild(fileInput);

  function handleFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      thumbnail.src = dataUri;
      cb.onMediaThumbnail(dataUri);
    };
    reader.readAsDataURL(file);
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files[0]) handleFile(files[0]);
  });
  container.appendChild(uploadZone);

  // 进度条
  const timelineRow = document.createElement('div');
  timelineRow.className = 'timeline-row';
  timelineRow.style.marginTop = '8px';

  const timeCurrent = document.createElement('span');
  timeCurrent.className = 'time-label';
  timeCurrent.textContent = '0:00';
  timelineRow.appendChild(timeCurrent);

  const timelineSlider = document.createElement('input');
  timelineSlider.type = 'range';
  timelineSlider.min = '0';
  timelineSlider.max = '100';
  timelineSlider.value = '0';
  timelineSlider.addEventListener('input', () => {
    const pct = parseFloat(timelineSlider.value);
    const dur = parseTimeLabel(timeTotal.textContent ?? '0:00');
    timeCurrent.textContent = formatTime((dur * pct) / 100);
  });
  timelineSlider.addEventListener('change', () => {
    cb.onMediaSeek(parseFloat(timelineSlider.value));
  });
  timelineRow.appendChild(timelineSlider);

  const timeTotal = document.createElement('span');
  timeTotal.className = 'time-label';
  timeTotal.textContent = '0:00';
  timelineRow.appendChild(timeTotal);
  container.appendChild(timelineRow);

  const updateMedia: PanelMediaUpdater = (track, _state, position, duration, trackIndex) => {
    void _state;
    if (track.thumbnail) thumbnail.src = track.thumbnail;
    if (titleInput !== document.activeElement) titleInput.value = track.title;
    if (artistInput !== document.activeElement) artistInput.value = track.artist;
    if (albumInput !== document.activeElement) albumInput.value = track.album ?? '';
    if (trackIndex >= 0 && trackIndex < trackSelect.options.length) {
      trackSelect.selectedIndex = trackIndex;
    }
    const pct = duration > 0 ? (position / duration) * 100 : 0;
    timelineSlider.value = String(Math.min(100, Math.round(pct)));
    timeCurrent.textContent = formatTime(position);
    timeTotal.textContent = formatTime(duration);
  };

  (container as unknown as { __updateMedia: PanelMediaUpdater }).__updateMedia = updateMedia;
  return updateMedia;
}