---
name: Tech stack and architecture
description: Framework, rendering approach, file layout, and core constants for the floorplan editor
type: project
---

Vanilla JS, no framework. SVG rendered from scratch on every full render() call (innerHTML cleared). Scripts loaded in order at end of <body>: constants.js → state.js → render.js → furniture.js → events.js → controls.js → export.js → sync.js → main.js.

**Key files:**
- js/constants.js — SC=24 (px/ft), W_PX=8 (4" wall), SEC=96 (4ft section), IW/IH interior dims, colour constants
- js/state.js — mutable globals: tool, secs, floorLines, furniture, zoom/pan, history
- js/render.js — render(), renderLines(), renderFurniture(), drawResizeButtons(), etc.
- js/events.js — onSvgDown/Move/Up, onFurnDown, drop handler, zoom/pan, keyboard
- js/controls.js — setTool(), deleteSelected(), resizePlan(), undo(), addOpening()
- editor.html — left panel (tools), right panel (furniture palette), canvas-area div wrapping zoom-layer > fp-svg
- index.html — lobby/room list page

**Why:** Pure SVG, no canvas library — every re-render rebuilds the SVG DOM. Partial refreshes exist for wall drag (removes/re-inserts lines-g) and furniture drag (removes/re-inserts furn-g) to avoid full redraws during mouse moves.

**How to apply:** Any event handler additions must be re-registered after each render() because innerHTML=''; wipes all listeners. The pattern is: render() calls renderLines() which re-attaches hit-area listeners inline.
