---
name: Known UX issues under active discussion
description: Three specific usability gaps identified by the user in the March 2026 review session
type: project
---

Three issues reviewed 2026-03-11:

1. **Select-to-edit must be implicit** — wall hit-area click handler (render.js ~line 79) gates selection behind `tool==='select'`. User wants clicking any interior wall to always select it regardless of active tool.

2. **Resize +/− buttons should work from any tool** — buttons are SVG elements rendered outside the floorplan boundary (drawResizeButtons, render.js ~line 368). The click handler calls resizePlan() directly, so they technically fire regardless of tool. The real friction is that onSvgDown (events.js line 90) guards all SVG mousedown with `if(tool!=='floor-line')return` — meaning clicks that hit the SVG background while in floor-line mode start a draw stroke. The resize buttons call stopPropagation so they should not trigger drawing, but the user perceives a conflict.

3. **Furniture drag not clamped to interior bounds** — onSvgMove dragFurn branch (events.js ~line 162) sets f.x/f.y directly from cursor offset with no bounds check. The drop handler (events.js ~line 215) also places from raw clientX/clientY with no clamping. The clampI() helper exists but is only used for wall drawing.

**Why:** These were flagged during a UX review session; implementation fixes requested.
**How to apply:** Reference these when the user asks to implement any of the three issues.
