# Genuine spatial Plus-Plus guides

Work in progress: these source files replace the image-only prototype delivery with actual brick poses, nominal mechanical grips and insertion-checked assembly steps. Do not publish the catalogue before all 50 models pass the final checks and the spatial UI is verified.

The standard shape is nine fused unit cubes, 5 × 3 × 1; nominal unit 4 mm. Z is up, positions are brick centres, Euler XYZ rotations are radians. Source: Plus-Plus A/S patent US20220395759A1 (https://patents.google.com/patent/US20220395759A1/en), manufacturer Colorverse booklet page2 (https://plus-plus.com/cdn/shop/files/BR03972_LTB-Colorverse.pdf?v=13948637384518218372).

Author masks in `masks/*.py` are coarse brick-centre layouts, not cube-per-brick impostors. `core/planner.py` assigns orientations, rejects collisions, requires an actual tab in a receiving notch and a free axis-aligned insertion path. `core/finalize_models.py` records explicit design simplifications and requires complete final scenes and nominal support-polygon balance. Rejected drafts are not building guides.

`spatial-core.js` in the repository root is the browser/server authority. Cooperative tasks preserve certified insertion order and test rigid-group insertion. Viewer geometry is centred on the actual nine-cube outline and uses thickness1. Physical plastic tolerances, grip strength and real-world testing must never be claimed from these mathematical checks alone.
