# wallpaper-engine-web-dev-kit

[中文](../README.md) | English

***

Unofficial Wallpaper Engine **web wallpaper** runtime simulation layer — fully emulates WE injected APIs in the browser.

## Purpose

Develop Wallpaper Engine web wallpapers in your browser without repeatedly loading the wallpaper in the WE editor:

- Inspect the property configuration panel
- Debug audio visualization (128-bin spectrum simulation)
- Test media integration (built-in track library + custom tracks/album art)
- Preview RGB LED effects (intercept and decode `setAllDevicesByImageData`)
- Simulate lifecycle events (pause/resume/FPS changes)
- Read property definitions from `project.json` with multi-language support

## Usage

### Browser Direct Reference (IIFE)

```html
<script src="./dist/index.global.js"></script>
<script>
  WeDevKit.createWeDevKit({
    panel: true,
    audio: { amplitude: 0.6 },
    media: { autoCycle: true },
    rgb: true,
    lifecycle: true,
  });
</script>
```

### Module Import (npm / TypeScript Project)

```bash
npm install wallpaper-engine-web-dev-kit
```

```typescript
import { createWeDevKit } from 'wallpaper-engine-web-dev-kit';

const kit = createWeDevKit({
  panel: { position: { x: 100, y: 50 } },
  audio: { amplitude: 0.6, bassBoost: 1.2 },
  media: { autoCycle: true, cycleIntervalMs: 8000 },
  rgb: true,
  lifecycle: true,
});

// Control panel
kit.togglePanel();

// Media control
kit.media.play();
kit.media.nextTrack();

// RGB data
kit.rgb.onFrame((frame) => console.log('RGB frame:', frame));

// Cleanup
kit.destroy();
```

### Build Outputs

```bash
# Build dev-kit
npm run build

# Outputs in dist/
#   dist/index.global.js  — IIFE (browser script tag)
#   dist/index.js         — ESM
#   dist/index.cjs        — CommonJS
#   dist/index.d.ts       — Type definitions
```

## Documentation

For the complete API reference, type definitions, sub-controller docs, and agent usage examples, see **[API.md](API.md)**.

## Features

### Audio Spectrum Simulation

128-bin spectrum generator compliant with WE spec (channels 0–63 left, 64–127 right), with three modes:

- **Beats** — Low-frequency pulse emphasis with bass boost gain
- **Melody** — Smoother sine wave combinations
- **Mixed** — Hybrid mode

Supports amplitude adjustment, frame rate control, progressive fade-in/out, and smooth frame interpolation.

### Media Integration Simulation

Fully simulates all 5 WE Media Integration listeners with a built-in library of 5 tracks:

- Playback control: play/pause/stop/track navigation/seek
- Custom metadata: override track info, upload album art
- Auto-cycling: configurable rotation interval
- Smart filtering on track change (skips STOPPED event to avoid UI flicker)

### RGB LED Data

Simulates LED/CUE plugin loading, intercepts `setAllDevicesByImageData` calls:

- Decodes raw pixel data into `ImageData` (usable with canvas)
- Auto-extracts color palette (grid quantize, max 8 colors)
- Registers frame callbacks for real-time monitoring
- Manually simulate frames (no plugin dependency needed)

### Lifecycle Events

Simulates WE pause/resume/FPS changes and other lifecycle behavior:

- Calls `wallpaperPropertyListener.setPaused` to notify wallpaper of pause state
- Intercepts `requestAnimationFrame` / `setTimeout` / `setInterval`; queues during pause, executes sequentially on resume
- FPS changes pushed via `applyGeneralProperties`
- Injects CSS rules on pause to suspend animations (`animation-play-state: paused`)

### Property Configuration Control

Reads `general.properties` definitions from `project.json`, providing:

- Property definition queries: type, value range, options list
- Visibility condition evaluation: parses `.value == X` / `&&` / `||` expressions
- Missing translation detection: locate untranslated UI text
- Multi-language matching: exact browser language match → language prefix → fallback to en-us

### Control Panel

Visual debugging panel with Shadow DOM isolation from host page CSS:

- **Audio simulation controls** — Amplitude/bass boost/speed/mode (Beats/Melody/Mixed), audio input toggle
- **Media playback controls** — Play/pause/skip/custom track/upload album art
- **RGB data monitoring** — Real-time status display
- **Lifecycle controls** — Pause/resume/FPS limit
- **Property viewer** — Search, type filter (Bool/Slider/Color etc.), visibility filter (All/Visible/Hidden), translation filter (All/Missing/OK), key/name toggle
- **Property Editor V2** — Floating draggable modal with add/edit/delete support:
  - Auto-generated i18n translation keys (camelCase → snake_case)
  - Translation editor: batch edit translations for all languages
  - Type-switch confirmation to prevent accidental data loss
  - Bool: checkbox group; Slider: [range + number] linked controls
  - Color: picker + WE hex sync
  - Combo options table (Label/Value editing, add/delete rows)
  - Translation key status hints (present in localization dictionary or not)
- **Language management** — Language switch dropdown, add-language dropdown (35+ WE locale codes), missing-translation markers
- **Localization panel** — View all entries in the current language's translation dictionary
- **Clock display**, **minimize**, draggable title bar

#### Property Editor Modal

The V2 property editor modal provides a complete project.json property editing experience:

- **Basic**: key name (locked in edit mode), type selection (9 WE types)
- **i18n**: auto-generated translation key, translation editor (multi-language batch editing), translation status hints
- **Value controls**: Bool dual-select / Slider [range+number] / Color picker+WE hex / Combo dropdown preview / Text/File/Directory/Group text input
- **Type-specific**: Slider range (Min/Max/Step/Precision/Fraction), File video mode, Directory on-demand mode
- **Combo options**: Label + Value table editing with add/delete rows
- **Metadata**: Order / Index / Condition

### Internationalization (i18n)

The control panel has built-in en-US / zh-CN bilingual UI, auto-selected based on `navigator.language`. All UI text is managed through the `PanelMessages` interface:

```typescript
import { getPanelMessages } from './panel/i18n';
// Auto-returns translation based on browser language
console.log(getPanelMessages().amplitude); // "Amplitude" / "振幅"
```

The property editor modal includes a **translation editor** that reads all language translations from `project.json`'s `general.localization` and lets you batch-edit multi-language text when editing properties.

**Language strategy** (when reading project.json):

1. Exact match of `navigator.language` (e.g. `zh-CN`)
2. Language prefix match (e.g. `zh`)
3. Fallback to `en-us`
4. First available language

### Condition Expression Evaluator

`conditionEvaluator.ts` fully supports project.json property visibility condition syntax:

- Comparison: `.value == X`, `.value != X`
- Booleans: `true`, `false`
- Numbers: integers and floating-point
- Strings: `'single quotes'` or `"double quotes"`
- Combination: `&&` (AND), `||` (OR)
- Parentheses: `(expr)` grouping

```typescript
import { evaluateCondition } from './panel/conditionEvaluator';

// Check if the "showDate" property is visible
const visible = evaluateCondition(
  'showDate.value == true',
  (key) => properties.find(p => p.key === key)?.value
);
```

### Environment Auto-Detection

Automatically detects the runtime environment on startup using 3 strategies:

1. CEF userAgent signature
2. Whether `wallpaperPropertyListener` has already been injected by WE
3. Loading protocol + dev-kit flag

Skips simulation automatically when running in a real WE environment without interfering with normal wallpaper operation.

### Audio Data Toggle

Supports dynamic control of audio frame distribution. When enabled, spectrum data is pushed to the callback registered via `wallpaperRegisterAudioListener`; when disabled, pushing stops without affecting other modules.

### wallpaperPropertyListener Shim

Automatically shims `setPaused`, `applyGeneralProperties`, `userDirectoryFilesAddedOrChanged`, and `userDirectoryFilesRemoved` methods, ensuring project code doesn't error out in the browser due to missing WE APIs. Uses `Object.defineProperty` setter interception to always fill in missing methods.

### Property Configuration Control

Reads `general.properties` definitions from `project.json`, providing:

- Property definition queries: type, value range, options list
- Visibility condition evaluation: parses `.value == X` / `&&` / `||` expressions
- Missing translation detection: locate untranslated UI text
- Multi-language matching: exact browser language match → language prefix → fallback to en-us
- Property serialization: export current property list as project.json format

## Project Structure

```
src/
  index.ts               # Entry point createWeDevKit()
  types.ts               # All type definitions
  environment.ts         # Real WE environment detection
  propertyMock.ts        # wallpaperPropertyListener shim
  audioSimulator.ts      # 128-bin spectrum generator
  mediaMock.ts           # Media integration simulation (4 listeners + built-in tracks)
  rgbMock.ts             # RGB LED plugin simulation
  lifecycleMock.ts       # Lifecycle events (with pause CSS injection)
  panel/
    index.ts             # Control panel controller
    renderer.ts          # DOM rendering (Shadow DOM isolation)
    styles.ts            # Inline styles (V2 modal, translation editor CSS)
    projectJsonReader.ts # project.json property parsing + language matching + serialization
    conditionEvaluator.ts# Condition expression evaluator (lexer + parser)
    i18n.ts              # Internationalization dictionary (en-US / zh-CN)
    callbacks.ts         # Panel callback contract + type definitions
    layout.ts            # DOM layout utilities
    sections/
      audio.ts           # Audio simulation control UI
      media.ts           # Media integration control UI
      lifecycle.ts       # Lifecycle control UI
      properties.ts      # Property viewer UI (search/filter/translation/language management)
      rgb.ts             # RGB data monitoring UI
    modal/
      propertyEditor.ts  # Property editor modal V2 (draggable/translation editor/type controls)
```

## Build

```bash
npm install
npm run build        # → dist/index.global.js + index.js + index.cjs + .d.ts
npm run dev          # → watch mode
```

## License

GPL-3.0
