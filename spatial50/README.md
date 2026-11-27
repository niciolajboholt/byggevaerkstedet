# Spatial Plus-Plus guides

The 50 accepted scenes are stored with their catalogue entries in `data/motiver.json`. Each scene contains every actual nine-cube Plus-Plus piece, its centre, colour, Euler XYZ rotation in radians, explicit parent joint and straight insertion direction. Z is up, one nominal unit is 4 mm, and the piece is 5 × 3 × 1 units.

Geometry reference: [Plus-Plus A/S patent US20220395759A1](https://patents.google.com/patent/US20220395759A1/en), definitions and figure 1. The nine fused cubes model nominal geometry; it does not reproduce material tolerances or certify grip strength.

`spatial-core.js` is the browser/server authority for collision, notch/protrusion joints, connected insertion order, rigid task insertion and equal-mass support-polygon balance. `masks/*.py` are the design layouts, with one whole brick per cell. Every design revision made to obtain a complete assembly is recorded as `designAdjustedCells`; the accepted scene has no omitted pieces. The elefant has a broad green plinth, and Titanic uses a compact hull with four separately capped funnels.

Solo uses one brick per task. Shared-iPad and v3 live plans use small connected groups and alternate after attachment. Existing flat models and v1/v2 rooms retain their geometry and protocol. Local progress uses computed pose signatures, model IDs and team settings. The 3D renderer uses the same centred outline and thickness as the validator.

Validate/export the exact saved scenes with `python spatial50/core/finalize_models.py`. Explicitly regenerate design masks with `--rebuild`, then review every changed shape. Install only all fifty passing scenes with `node scripts/package-spatial-catalogue.cjs spatial50/generated/final.json`. Render thumbnails with `python scripts/render-spatial-previews.py` and build the local Three.js bundle with `npm run build:spatial`. Generator outputs are temporary; exact accepted poses persist in the catalogue.

The sculptures are digitally checked, not physically built. Intermediate assemblies may need to be held. Material tolerances, attachment force and real-world strength remain untested. Local browser and in-memory two-device acceptance cover the UI and protocol. After user authorization, the external runtime test also passed for the 78-piece penguin and the largest 177-piece pirate ship on 27 November 2026.
