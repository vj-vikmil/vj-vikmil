<!-- 9ad80b20-5288-4775-b4bd-08a4c305f88c 4da828db-afcf-43b2-9e83-22592371740e -->
# Luma Detection Control Panel

1. Add UI controls

- Create a new `section("Luma detection", …)` in `ascii-detect/sketch.js` with its own checkbox (enable/disable), brightness threshold slider, grid resolution slider, minimum blob size slider, and toggle to show luma boxes regardless of detection mode.

2. Refactor detection flow

- Introduce state variables to store the luma UI values (e.g. `chkLumaOn`, `rngLumaThr`, `rngLumaGrid`, `rngLumaMinCells`, `chkLumaBoxes`) and update `draw()` so the luma detector runs only when this section is enabled, optionally independent of the main detection mode.

3. Update luma detector

- Modify `getLumaBoxes` to read from the new luma UI controls instead of the detection confidence slider or ASCII threshold, allowing finer tuning of brightness, grid size, and minimum blob size.

4. Integrate with rendering

- Ensure the existing box drawing and `ASCII-in-box` logic respect the new luma controls (e.g., if luma is enabled while mode is `off`, its boxes still draw when `Show luma boxes` is checked, while other modes continue to work unchanged).

### To-dos

- [ ] Add `luma` as a detection mode option and route it through the existing detection mode switch in `ascii-detect/sketch.js`.
- [ ] Implement luma-based bright-area detection that clusters thresholded regions into bounding boxes in video coordinates and fills `boxesVid` when `mode === 'luma'`.
- [ ] Reuse existing box-drawing and ASCII-in-box logic so luma boxes look and behave like normal detections, and add minimal controls to tune the luma threshold and box size.