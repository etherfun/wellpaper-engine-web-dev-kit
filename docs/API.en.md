# wallpaper-engine-web-dev-kit API Reference

> Version: 0.1.0 | Last updated: 2026-07-27

## Table of Contents

1. [createWeDevKit() — Factory Function](#createwedevkit--factory-function)
2. [DevKitInstance — Top-Level Instance](#devkitinstance--top-level-instance)
3. [MediaController — Media Integration Control](#mediacontroller--media-integration-control)
4. [RgbController — RGB Data Access](#rgbcontroller--rgb-data-access)
5. [LifecycleController — Lifecycle Control](#lifecyclecontroller--lifecycle-control)
6. [PropertiesController — Property Configuration](#propertiescontroller--property-configuration)
7. [Mp3PlayerController — MP3 Spectrum Player](#mp3playercontroller--mp3-spectrum-player)
8. [Type Reference](#type-reference)
9. [Build-Time Injection API](#build-time-injection-api)
10. [Agent Usage Examples](#agent-usage-examples)

---

## createWeDevKit() — Factory Function

Creates a WE Dev Kit instance, injecting all WE runtime simulation APIs in one call.

### Signature

```typescript
function createWeDevKit(options?: DevKitConfig): DevKitInstance
```

### Options (DevKitConfig)

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Master switch |
| `autoDetect` | `boolean` | `true` | Auto-detect real WE environment and skip |
| `audio` | `boolean \| AudioConfig` | `true` | Audio simulation config |
| `media` | `boolean \| MediaConfig` | `true` | Media integration simulation config |
| `properties` | `boolean` | `true` | Property listener polyfill |
| `rgb` | `boolean` | `true` | RGB LED simulation |
| `lifecycle` | `boolean` | `true` | Lifecycle events |
| `panel` | `boolean \| PanelConfig` | `true` | Control panel. Set to `false` to disable entirely |

#### AudioConfig

| Field | Type | Default | Description |
|---|---|---|---|
| `amplitude` | `number` | `0.6` | Amplitude 0–1 |
| `bassBoost` | `number` | `1.2` | Bass gain |
| `variationSpeed` | `number` | `1.0` | Variation speed |
| `frameRate` | `number` | `30` | Frame rate |

#### MediaConfig

| Field | Type | Default | Description |
|---|---|---|---|
| `tracks` | `MockTrack[]` | `[]` | Custom track library (empty = use 5 built-in tracks) |
| `autoCycle` | `boolean` | `true` | Auto-rotate tracks |
| `cycleIntervalMs` | `number` | `8000` | Rotation interval (ms) |

#### PanelConfig

| Field | Type | Default | Description |
|---|---|---|---|
| `position` | `{ x: number; y: number }` | `{ x: 0, y: 0 }` | Panel initial position |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `theme` | `'light' \| 'dark'` | `'dark'` | Theme |

### Examples

```typescript
// Basic usage (all features enabled)
const kit = createWeDevKit();

// Disable panel entirely (API only)
const kit = createWeDevKit({ panel: false });

// Enable panel and RGB only
const kit = createWeDevKit({ audio: false, media: false });

// Fine-grained config
const kit = createWeDevKit({
  panel: { position: { x: 100, y: 50 }, theme: 'dark' },
  audio: { amplitude: 0.8, bassBoost: 1.5, frameRate: 60 },
  media: { autoCycle: true, cycleIntervalMs: 5000 },
});

// HTML script tag mode (IIFE)
// <script src="./dist/index.global.js"></script>
// <script>const kit = WeDevKit.createWeDevKit({ panel: true });</script>
```

---

## DevKitInstance — Top-Level Instance

The instance object returned by `createWeDevKit()`.

### Top-Level Methods

| Method | Signature | Description |
|---|---|---|
| `destroy` | `(): void` | Destroy all mocks, restore original state (JS timers, CSS, window globals) |
| `togglePanel` | `(): void` | Toggle control panel visibility |
| `getConfig` | `(): Readonly<DevKitConfig>` | Get current config (read-only snapshot) |
| `pushProperties` | `(props: Record<string, unknown>): void` | Manually trigger a property push (calls `applyUserProperties`) |
| `pushAudioFrame` | `(): void` | Manually trigger audio data push |
| `nextTrack` | `(): void` | Manually skip to next track |
| `setAudioEnabled` | `(enabled: boolean): void` | Set audio data input on/off (auto zero-fade on disable) |

### State

```typescript
interface DevKitState {
  isLoaded: boolean;           // Whether loaded
  isPanelVisible: boolean;     // Whether panel is visible
  currentTrackIndex: number;   // Current track index
  playbackState: PlaybackState; // Playback state
  isRgbPluginLoaded: boolean;  // Whether RGB plugin is loaded (dynamic getter)
  isAudioEnabled: boolean;     // Whether audio input is enabled
}
```

> All `state` fields use lazy getters and always reflect the latest value.

### Sub-Controllers

| Field | Type | Description |
|---|---|---|
| `media` | `MediaController` | Media integration control |
| `rgb` | `RgbController` | RGB data access |
| `lifecycle` | `LifecycleController` | Lifecycle control |
| `properties` | `PropertiesController` | Property configuration |

---

## MediaController — Media Integration Control

Fully simulates all 5 WE Media Integration listeners + constants. Built-in library of 5 tracks (Jay Chou, Daft Punk, JJ Lin, Ludovico Einaudi, G.E.M.), each with a gradient SVG cover.

### Methods

#### Playback Control

| Method | Description | WE Behavior |
|---|---|---|
| `play()` | Play/resume | Pushes `wallpaperRegisterMediaPlaybackListener` state change |
| `pause()` | Pause | `PLAYING` → `PAUSED` |
| `stop()` | Stop | Any state → `STOPPED`, resets position |

**Behavior details:**
- Calling `play()` from `stopped`: pushes `STOPPED` then `PLAYING`, also pushes metadata and thumbnail
- Calling `play()` from `paused`: only pushes `PLAYING`, no metadata re-push
- Calling `pause()` from `playing`: only pushes `PAUSED`

#### Track Navigation

| Method | Description |
|---|---|
| `nextTrack()` | Next track (cycles) |
| `prevTrack()` | Previous track (cycles) |
| `setTrack(index)` | Jump to track at index |

**Behavior details:**
- Track changes do not send `STOPPED` (avoids UI flicker)
- Only updates metadata and thumbnail events
- Playback state unchanged

#### Custom Metadata

| Method | Description |
|---|---|
| `setCustomTrack({ title, artist, ... })` | Override current track metadata without changing track |
| `setCustomThumbnail(dataUri)` | Set custom cover art, auto-extracts dominant colors |

#### Seek Control

| Method | Description |
|---|---|
| `seek(pct)` | Seek to percentage 0–100 |
| `getPosition()` | Get current position (seconds) |

#### Read-Only Properties

| Property | Type | Description |
|---|---|---|
| `currentIndex` | `number` | Current track index |
| `playbackState` | `'playing' \| 'paused' \| 'stopped'` | Current playback state |
| `tracks` | `MockTrack[]` | Full track list |

### MockTrack Structure

```typescript
interface MockTrack {
  title: string;            // Title
  artist: string;           // Artist
  album?: string;           // Album name
  genre?: string;           // Genre
  duration?: number;        // Duration in seconds (default 240)
  thumbnail?: string;       // Base64 data URI cover
  primaryColor?: string;    // Primary color
  secondaryColor?: string;  // Secondary color
  tertiaryColor?: string;   // Tertiary color
  textColor?: string;       // Text color
  highContrastColor?: string; // High-contrast color
}
```

### WE Event Mapping

| Controller Method | WE Listener Triggered | Event Type |
|---|---|---|
| `play()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `pause()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `stop()` | `wallpaperRegisterMediaPlaybackListener` | `MediaPlaybackEvent` |
| `setTrack()` / `nextTrack()` / `prevTrack()` | `wallpaperRegisterMediaPropertiesListener` + `wallpaperRegisterMediaThumbnailListener` + `wallpaperRegisterMediaTimelineListener` | `MediaPropertiesEvent` + `MediaThumbnailEvent` + `MediaTimelineEvent` |
| `seek()` | `wallpaperRegisterMediaTimelineListener` | `MediaTimelineEvent` |
| Progress update (every 100ms) | `wallpaperRegisterMediaTimelineListener` | `MediaTimelineEvent` |
| Initial push | `wallpaperRegisterMediaStatusListener` | `MediaStatusEvent` |

### Constants

`window.wallpaperMediaIntegration` contains:

```typescript
{
  PLAYBACK_PLAYING: 0,
  PLAYBACK_PAUSED: 1,
  PLAYBACK_STOPPED: 2,
}
```

---

## RgbController — RGB Data Access

Intercepts `window.wpPlugins.led.setAllDevicesByImageData` calls (WE LED plugin interface), providing decoded data access and manual simulation.

### Methods

| Method | Return | Description |
|---|---|---|
| `getLastFrame()` | `RgbFrameData \| null` | Get last frame raw data |
| `getDecodedImageData()` | `ImageData \| null` | Decode to canvas ImageData (usable with `ctx.putImageData()`) |
| `getPalette()` | `{ color: string; ratio: number }[]` | Get last frame palette (up to 8 colors) |
| `onFrame(callback)` | `() => void` | Register frame callback, returns unsubscription function |
| `simulateFrame(width?, height?, pixelData?)` | `void` | Manually simulate an RGB frame |

### RgbFrameData Structure

```typescript
interface RgbFrameData {
  width: number;              // Pixel width
  height: number;             // Pixel height
  pixels: number[];           // RGB pixel array [r0,g0,b0, r1,g1,b1, ...]
  palette: {                  // Palette (descending by ratio)
    color: string;            // Hex color like "#4A90D9"
    ratio: number;            // Ratio 0–1
  }[];
}
```

### Internal Mechanism

1. **Frame capture**: When a project sends LED data via `window.wpPlugins.led.setAllDevicesByImageData(imageData, width, height)`, it is automatically decoded and stored
2. **ImageData decoding**: RGB pixel array → canvas `ImageData` (with alpha channel), ready for `ctx.putImageData()`
3. **Palette extraction**: Divides image into 10×10 grid cells, averages color per cell, quantizes to 16 levels, aggregates top 8 colors
4. **Manual simulation**: Use `simulateFrame()` to generate test data without a real plugin

### Example

```typescript
// Get and draw last frame
const frame = kit.rgb.getLastFrame();
if (frame) {
  const imgData = kit.rgb.getDecodedImageData();
  canvas.getContext('2d')!.putImageData(imgData!, 0, 0);
  console.log('Palette:', kit.rgb.getPalette());
}

// Listen to frames
const unsub = kit.rgb.onFrame(({ width, height, pixels, palette }) => {
  console.log(`RGB frame: ${width}x${height}, ${palette.length} colors`);
});
// Unsubscribe
unsub();

// Manually simulate a frame
kit.rgb.simulateFrame(100, 20);
```

---

## LifecycleController — Lifecycle Control

Simulates WE pause/resume/FPS change lifecycle operations. All hijacked native JS timer functions are **automatically restored** on `destroy()`.

### Methods

| Method | Description | WE Behavior |
|---|---|---|
| `pause()` | Simulate WE wallpaper pause | Calls `wallpaperPropertyListener.setPaused(true)` |
| `resume()` | Simulate WE wallpaper resume | Calls `wallpaperPropertyListener.setPaused(false)` |
| `setFps(fps)` | Simulate FPS limit change | Calls `wallpaperPropertyListener.applyGeneralProperties({ fps })` |

### Read-Only Property

| Property | Type | Description |
|---|---|---|
| `isPaused` | `boolean` | Whether currently paused |

### Full Pause Behavior

`kit.lifecycle.pause()` synchronously performs:

1. **Call project callback**: Invokes any registered `wallpaperPropertyListener.setPaused(true)`
2. **CSS animation pause**: Adds class `wpxPausePseudoAnimationAll` to `<html>` and injects a `<style>` rule: `animation-play-state: paused !important`
3. **JS timer interception**: Hijacks `setTimeout` / `setInterval` / `requestAnimationFrame` — new calls during pause are queued

`kit.lifecycle.resume()` does the reverse: removes CSS pause, replays queued timers/RAF calls.

`kit.destroy()` **automatically restores** all original timer functions onto `window`.

### FPS Change

`applyGeneralProperties({ fps })`:
1. Calls any registered `applyGeneralProperties` callback
2. If none registered, logs only

---

## PropertiesController — Property Configuration

Reads `general.properties` definitions from `project.json`, providing property visibility queries (with condition evaluation), missing translation detection, and add/edit/delete operations.

> **Data source**: PropertiesController bridges to the panel's internal property cache. When the panel is enabled, data comes from live `loadProjectProperties()` results. When the panel is disabled (`panel: false`), methods return empty collections.

### Methods

| Method | Return | Description |
|---|---|---|
| `getProperty(key)` | `ProjectPropertyDef \| undefined` | Get a single property definition |
| `getAllProperties()` | `ProjectPropertyDef[]` | Get all property definitions |
| `getVisibility(key)` | `PropertyVisibility` | Query a property's visibility (with live condition evaluation) |
| `getAllVisibility()` | `PropertyVisibility[]` | Query all properties' visibility |
| `checkTranslation(key)` | `PropertyTranslationStatus` | Check if a property's i18n key is missing |
| `getMissingTranslations()` | `PropertyTranslationStatus[]` | Get all properties with missing translations |
| `getVisibleProperties()` | `ProjectPropertyDef[]` | Get currently visible properties (condition-filtered) |
| `getCurrentValues()` | `Record<string, unknown>` | Get all property current values (`{ key: value }`) |
| `reloadProperties()` | `Promise<void>` | Reload property definitions from project.json |
| `addProperty(def)` | `ProjectPropertyDef` | Add a new property definition |
| `updateProperty(key, def)` | `ProjectPropertyDef \| undefined` | Update an existing property |
| `removeProperty(key)` | `boolean` | Remove a property definition |

### ProjectPropertyDef Structure

```typescript
interface ProjectPropertyDef {
  key: string;                          // Property key, e.g. "rgb_show"
  type: 'bool' | 'slider' | 'combo' | 'color' | 'text' | 'textinput' | 'file' | 'directory' | 'group';
  value: unknown;                       // Current value
  text?: string;                        // i18n key, e.g. "ui_rgb_show"
  displayName?: string;                 // Human-readable name from localization
  missingTranslation?: boolean;         // Whether translation is missing
  min?: number;                         // Slider minimum
  max?: number;                         // Slider maximum
  step?: number;                        // Slider step
  precision?: number;                   // Slider decimal precision
  fraction?: boolean;                   // Slider allows fractions
  fileType?: string;                    // File/directory type filter (e.g. "video")
  mode?: string;                        // Directory load mode ("ondemand")
  options?: { value: unknown; label: string }[];  // Combo options
  condition?: string;                   // Visibility condition expression
  order?: number;                       // Sort order
  index?: number;                       // WE project.json index field
}
```

### PropertyVisibility Structure

```typescript
interface PropertyVisibility {
  key: string;              // Property key
  visible: boolean;         // Whether currently visible
  condition: string | null; // Original condition expression
  blockedBy?: string;       // Property name causing invisibility
  blockedValue?: unknown;   // The blocking property's current value
}
```

### PropertyTranslationStatus Structure

```typescript
interface PropertyTranslationStatus {
  key: string;              // Property key
  i18nKey: string;          // i18n translation key
  missing: boolean;         // Whether translation is missing
  displayName: string;      // Currently displayed name
}
```

### PropertyDefInput Structure (for add/edit)

```typescript
interface PropertyDefInput {
  key: string;
  type: PropertyType;
  value?: unknown;
  text?: string;             // i18n key
  displayName?: string;
  min?: number; max?: number; step?: number;
  precision?: number; fraction?: boolean;
  fileType?: string; mode?: string;
  options?: { value: unknown; label: string }[];
  condition?: string;
  order?: number;
  index?: number;
}
```

### Visibility Condition Evaluation

Supports `condition` expression syntax from project.json (full lexer + parser):

- Comparison: `.value == X`, `.value != X`
- Booleans: `true`, `false`
- Numbers: integer and float
- Strings: `'single-quoted'` or `"double-quoted"`
- Composition: `&&` (AND), `||` (OR)
- Grouping: `(expr)`

**Example conditions:**
```
showDate.value == true && DateX.value > 0
visual_audio_model.value == 1 && ColorMode.value == 2
```

### Language Matching Strategy

`projectJsonReader` auto-matches translations by browser language:

1. Exact match (e.g. `"zh-CN"` → `"zh-cn"`)
2. Language prefix match (e.g. `"zh-CN"` → `"zh"`)
3. Fallback to `"en-us"`
4. First available language

### Example

```typescript
// Get property definition
const prop = kit.properties.getProperty('rgb_show');
console.log(prop?.displayName, prop?.value);

// Check visibility
const vis = kit.properties.getVisibility('rgb_show');
if (!vis.visible) {
  console.log(`Hidden by ${vis.blockedBy} = ${vis.blockedValue}`);
}

// Check missing translations
const missing = kit.properties.getMissingTranslations();
console.log(`${missing.length} missing translations:`, missing.map(m => m.i18nKey));

// Get visible properties
const visible = kit.properties.getVisibleProperties();
console.log(`${visible.length} visible properties`);

// Add new property
kit.properties.addProperty({
  key: 'my_setting',
  type: 'bool',
  value: true,
  text: 'ui_my_setting',
  order: 1,
});
```

---

## Mp3PlayerController — MP3 Spectrum Player

Real MP3 playback and spectrum extraction via Web Audio API. Features log-band RMS merging, Gaussian smoothing, time weighting, peak holding, and other DSP processing — extracting 64-band real spectrum data (replacing simulated audio).

> This controller exposes UI controls through the panel's Audio section, with simulated/real spectrum toggled via AudioBridge.

### Methods

| Method | Signature | Description |
|---|---|---|
| `loadFile` | `(file: File): Promise<void>` | Load an MP3 file (auto-decodes to AudioBuffer) |
| `play` | `(): void` | Start playback |
| `pause` | `(): void` | Pause (preserves position) |
| `stop` | `(): void` | Stop (resets to beginning) |
| `seek` | `(percent: number): void` | Seek to percentage 0–100 |
| `setVolume` | `(v: number): void` | Set volume 0–1 |
| `setSensitivity` | `(v: number): void` | Spectrum sensitivity 0.1–1 (lower = smoother), default 0.5 |
| `setCeiling` | `(v: number): void` | Output ceiling 0.1–1 (caps max amplitude), default 1.0 |
| `setLoop` | `(enabled: boolean): void` | Enable/disable looping, default true |
| `setActive` | `(active: boolean): void` | Toggle real spectrum vs simulated data |
| `destroy` | `(): void` | Clean up AudioContext and all resources |

### Read-Only Properties

| Property | Type | Description |
|---|---|---|
| `isPlaying` | `boolean` | Whether currently playing |
| `isLoaded` | `boolean` | Whether a file is loaded |
| `isActive` | `boolean` | Whether real spectrum is active |
| `currentTime` | `number` | Current playback position (seconds) |
| `duration` | `number` | Total duration (seconds) |
| `fileName` | `string` | File name |

### Spectrum Processing Pipeline

```
AnalyserNode.getByteFrequencyData (2048 FFT)
  → Gaussian smoothing (radius=2, sigma=1.0, removes spikes)
  → Bin-level EMA time weighting (history=4, reduces flicker)
  → Log-band RMS merging (64 bands, geometric frequency width)
  → Inter-band horizontal smoothing (3-point center-weighted)
  → Band-level EMA (controlled by sensitivity²)
  → Peak-hold normalization
  → Output Float32Array[128] (left 0–63 / right 64–127)
```

---

## Type Reference

### PlaybackState

```typescript
type PlaybackState = 'playing' | 'paused' | 'stopped';
```

### AudioMode

```typescript
type AudioMode = 'beats' | 'melody' | 'mixed';
```

### AudioSourceType

```typescript
type AudioSourceType = 'simulated' | 'mp3';
```

### Wallpaper Engine Global API Simulation

dev-kit injects the following global APIs onto `window`:

| Global API | Purpose |
|---|---|
| `window.wallpaperPropertyListener` | Property listener (applyUserProperties, setPaused, applyGeneralProperties, etc.) |
| `window.wallpaperPluginListener` | Plugin load listener |
| `window.wpPlugins.led` | LED plugin `setAllDevicesByImageData` |
| `window.wallpaperMediaIntegration` | Media integration constants |
| `window.wallpaperRegisterAudioListener` | Audio listener registration |
| `window.wallpaperRegisterMediaStatusListener` | Media status listener registration |
| `window.wallpaperRegisterMediaPropertiesListener` | Media properties listener registration |
| `window.wallpaperRegisterMediaThumbnailListener` | Media thumbnail listener registration |
| `window.wallpaperRegisterMediaPlaybackListener` | Media playback state listener registration |
| `window.wallpaperRegisterMediaTimelineListener` | Media timeline listener registration |

---

## Build-Time Injection API

The `wallpaper-engine-web-dev-kit/inject` sub-module provides the ability to inject dev-kit into existing wallpaper project build outputs, without modifying source code.

### injectIntoHtml()

Inject the dev-kit script into an HTML string. Pure string transformation, works in both browser and Node.js.

```typescript
function injectIntoHtml(html: string, options?: InjectOptions): string
```

#### InjectOptions

| Field | Type | Default | Description |
|---|---|---|---|
| `config` | `Record<string, unknown>` | All enabled | DevKit config object (passed to createWeDevKit) |
| `scriptSrc` | `string` | `'./we-dev-kit/index.global.js'` | Script tag src path (relative to HTML) |
| `autoCreate` | `boolean` | `true` | Whether to auto-call `WeDevKit.createWeDevKit(config)` |
| `insertAt` | `'before-body-end' \| 'after-body-start' \| 'before-head-end'` | `'before-body-end'` | Injection position |

```typescript
import fs from 'node:fs';
import { injectIntoHtml } from 'wallpaper-engine-web-dev-kit/inject';

const html = fs.readFileSync('dist/index.html', 'utf8');
const modified = injectIntoHtml(html, { config: { panel: true } });
fs.writeFileSync('dev/index.html', modified);
```

### prepareDevBuild()

One-shot dev build preparation: copies project build output + injects dev-kit scripts + copies dev-kit JS files.

```typescript
function prepareDevBuild(options: DevBuildOptions): void
```

#### DevBuildOptions

| Field | Type | Default | Description |
|---|---|---|---|
| `inputDir` | `string` | — (required) | Project build output directory (e.g. `dist/`) |
| `outputDir` | `string` | `'dev'` | Development output directory |
| `config` | `Record<string, unknown>` | All enabled | DevKit config object |
| `scriptSrc` | `string` | Auto | Script src path |
| `kitDistPath` | `string` | Auto (node_modules) | Path to dev-kit dist directory |
| `targetDirName` | `string` | `'we-dev-kit'` | Sub-directory name for dev-kit files |

```typescript
import { prepareDevBuild } from 'wallpaper-engine-web-dev-kit/inject';

prepareDevBuild({
  inputDir: 'dist',
  outputDir: 'dev',
  config: { panel: true, audio: true, media: true, rgb: true, lifecycle: true },
});
```

> **Flow**: `inputDir` → copied to → `outputDir` → dev-kit injected → open `outputDir/index.html` in browser. Your original build output is never modified.

---

## Agent Usage Examples

Typical usage patterns suitable for AI agents (e.g. GitHub Copilot, Claude):

### Scenario 1: Testing Media Integration

```typescript
const kit = createWeDevKit({ panel: false, audio: false });

// Start playing
kit.media.play();

// Wait a few seconds then skip
await new Promise(r => setTimeout(r, 3000));
kit.media.nextTrack();

// Check current track
const track = kit.media.getCurrentTrack();
console.log(`Now playing: ${track.title} - ${track.artist}`);

// Pause
kit.media.pause();
```

### Scenario 2: Checking Property Translations

```typescript
const kit = createWeDevKit();

// Wait for project.json to load
await new Promise(r => setTimeout(r, 1000));

// Find missing translations
const bad = kit.properties.getMissingTranslations();
if (bad.length > 0) {
  console.log('Missing translations:', bad.map(b => b.i18nKey));
}

// Check a specific property's visibility (with live condition evaluation)
const vis = kit.properties.getVisibility('audio_visual_model');
if (!vis.visible) {
  console.log(`Reason: ${vis.blockedBy} = ${vis.blockedValue}`);
}

// Get all visible properties
const visProps = kit.properties.getVisibleProperties();
console.log(`Visible: ${visProps.map(p => p.key).join(', ')}`);

// Add a new property
kit.properties.addProperty({
  key: 'my_new_prop',
  type: 'bool',
  value: true,
  text: 'ui_my_new_prop',
});
```

### Scenario 3: Simulating RGB Data

```typescript
const kit = createWeDevKit({ panel: false });

// Register RGB callback
kit.rgb.onFrame((frame) => {
  const ctx = document.getElementById('preview')!.getContext('2d')!;
  const imgData = new ImageData(
    new Uint8ClampedArray(frame.pixels.flatMap(p => [p, 255])),
    frame.width
  );
  ctx.putImageData(imgData, 0, 0);
});

// Manually simulate a frame
kit.rgb.simulateFrame(100, 20);
```

### Scenario 4: Lifecycle Testing

```typescript
const kit = createWeDevKit({ panel: false });

console.log('Paused:', kit.lifecycle.isPaused); // false

// Pause (CSS animations + JS timers paused together)
kit.lifecycle.pause();
console.log('Paused:', kit.lifecycle.isPaused); // true

// Resume (replays queued timers)
kit.lifecycle.resume();

// Simulate FPS limit
kit.lifecycle.setFps(30);
```

### Scenario 5: Audio Toggle

```typescript
const kit = createWeDevKit({ panel: false });

console.log('Audio enabled:', kit.state.isAudioEnabled); // true

// Disable audio (zero-fade + simulator fadeout)
kit.setAudioEnabled(false);

// Re-enable (simulator fadein)
kit.setAudioEnabled(true);
```

### Scenario 6: Lifecycle Pause & Resume

```typescript
const kit = createWeDevKit({ panel: false });

// Pause — pauses CSS animations + intercepts JS timers
kit.lifecycle.pause();
console.log('Paused:', kit.lifecycle.isPaused); // true
console.log(document.documentElement.classList.contains('wpxPausePseudoAnimationAll')); // true

// Resume — removes CSS pause + replays queued timers
kit.lifecycle.resume();
console.log('Resumed:', !kit.lifecycle.isPaused); // true
```

### Scenario 7: Full Init + Destroy

```typescript
const kit = createWeDevKit({
  audio: { amplitude: 0.5, bassBoost: 1.0 },
  media: { autoCycle: true },
  rgb: true,
  lifecycle: true,
  properties: true,
});

// ... use kit ...

// Destroy: restores all original window APIs, CSS styles, JS timers
kit.destroy();
```
